import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// How many NEW games to save in this run
const LIMIT = Number(process.env.SYNC_LIMIT ?? 200);
// Skip obscure games: fewer total reviews than this on Steam
const MIN_REVIEWS = Number(process.env.SYNC_MIN_REVIEWS ?? 50);
// SteamSpy's list is 1000 games per page and can only be read about once a
// minute, so stop after this many pages even if the target isn't reached
const MAX_PAGES = Number(process.env.SYNC_MAX_PAGES ?? 10);

// Games that can never be saved (no Metacritic score, NSFW) are remembered here
// so later runs skip them without spending Steam requests
const REJECTED_FILE = path.join(process.cwd(), "app/scripts/sync-rejected.json");
const rejected = new Set<number>(
  fs.existsSync(REJECTED_FILE)
    ? (JSON.parse(fs.readFileSync(REJECTED_FILE, "utf8")) as number[])
    : [],
);
const saveRejected = () =>
  fs.writeFileSync(REJECTED_FILE, JSON.stringify([...rejected]));
// Saved to disk every 25 new rejects, so an interrupted run keeps its progress
function reject(appid: number) {
  rejected.add(appid);
  if (rejected.size % 25 === 0) saveRejected();
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type steamDetails = {
  type: string;
  name: string;
  release_date?: { date: string };
  metacritic?: { score: number };
  short_description?: string;
  header_image?: string;
  genres?: { description: string }[];
  categories?: { description: string }[];
  content_descriptors?: { ids: number[] };
};

type spyGame = {
  appid: number;
  name: string;
  positive: number;
  negative: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normalize = (title: string) => title.toLowerCase().trim();

// Only pure-NSFW games are dropped. Mainstream mature games (GTA-style) stay.
// Steam content descriptors: 3 = adult only sexual content,
// 4 = frequent nudity or sexual content. (1 = "some nudity" is NOT used,
// because big mainstream games carry it.)
const NSFW_DESCRIPTOR_IDS = [3, 4];

// SteamSpy tags that mark a game as NSFW (compared in lowercase)
const NSFW_TAGS = ["nsfw", "hentai", "eroge"];

const hasNsfwDescriptor = (d: steamDetails) =>
  (d.content_descriptors?.ids ?? []).some((id) =>
    NSFW_DESCRIPTOR_IDS.includes(id),
  );

const hasNsfwTag = (tags: string[]) =>
  tags.some((t) => NSFW_TAGS.includes(t.toLowerCase()));

// One page of SteamSpy's game list (1000 games), most-reviewed first.
// SteamSpy allows this request only about once a minute, so callers wait.
// Returns how many games the page had in total, and the ones worth checking.
async function fetchSpyPage(
  page: number,
): Promise<{ total: number; candidates: spyGame[] }> {
  const res = await fetch(
    `https://steamspy.com/api.php?request=all&page=${page}`,
  );
  if (!res.ok) return { total: 0, candidates: [] };
  const all = Object.values((await res.json()) as Record<string, spyGame>);
  const candidates = all
    .filter((g) => g.positive + g.negative >= MIN_REVIEWS)
    .sort((a, b) => b.positive + b.negative - (a.positive + a.negative));
  return { total: all.length, candidates };
}

// Steam allows roughly 200 detail requests per 5 minutes. On a rate-limit
// response, wait and retry instead of crashing the whole run.
async function gsteamDetails(id: number): Promise<steamDetails | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${id}`,
    );
    if (res.status === 429 || res.status === 403) {
      console.log(`Rate limited by Steam, waiting 60s (attempt ${attempt + 1})`);
      await sleep(60_000);
      continue;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as Record<
      string,
      { success: boolean; data?: steamDetails }
    >;
    const entry = json[String(id)];
    return entry?.success && entry.data?.type === "game" ? entry.data : null;
  }
  return null;
}

async function gsteamSpytags(id: number): Promise<string[]> {
  const res = await fetch(
    `https://steamspy.com/api.php?request=appdetails&appid=${id}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch tags for appid ${id}`);
  const data = (await res.json()) as { tags?: Record<string, number> };
  return Object.entries(data.tags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => name);
}

async function main() {
  // Games already in the database are skipped, by id and by title
  const { data: existing, error: existingError } = await supabase
    .from("games")
    .select("steam_app_id,title");
  if (existingError) throw existingError;
  const knownIds = new Set<number>(
    (existing ?? []).map((g) => Number(g.steam_app_id)),
  );
  const knownTitles = new Set<string>(
    (existing ?? []).map((g) => normalize(g.title)),
  );
  console.log(`Database already has ${knownIds.size} games. Target: ${LIMIT} new.`);

  let saved = 0;
  const skipped = { known: 0, rejected: 0, noScore: 0, duplicate: 0, nsfw: 0, other: 0 };
  console.log(`Remembered rejects from earlier runs: ${rejected.size}`);

  for (let page = 0; saved < LIMIT && page < MAX_PAGES; page++) {
    if (page > 0) await sleep(61_000); // SteamSpy "all" is limited to ~1/minute
    const { total, candidates } = await fetchSpyPage(page);
    if (total === 0) {
      console.log(`SteamSpy page ${page} returned no more games, stopping.`);
      break;
    }
    console.log(
      `SteamSpy page ${page}: ${candidates.length} candidates (of ${total})`,
    );

    for (const spy of candidates) {
      if (saved >= LIMIT) break;

      // Cheap checks first, before any Steam request
      if (knownIds.has(spy.appid)) {
        skipped.known++;
        continue;
      }
      if (rejected.has(spy.appid)) {
        skipped.rejected++;
        continue;
      }
      if (knownTitles.has(normalize(spy.name))) {
        skipped.duplicate++;
        continue;
      }

      try {
        const details = await gsteamDetails(spy.appid);
        await sleep(1500);
        if (!details) {
          skipped.other++;
          continue;
        }
        if (!details.metacritic?.score) {
          skipped.noScore++;
          reject(spy.appid);
          continue;
        }
        if (knownTitles.has(normalize(details.name))) {
          skipped.duplicate++;
          continue;
        }
        if (hasNsfwDescriptor(details)) {
          skipped.nsfw++;
          reject(spy.appid);
          continue;
        }

        const tags = await gsteamSpytags(spy.appid);
        await sleep(1000);
        if (hasNsfwTag(tags)) {
          skipped.nsfw++;
          reject(spy.appid);
          continue;
        }

        const { error } = await supabase.from("games").upsert(
          {
            steam_app_id: spy.appid,
            title: details.name,
            released: details.release_date?.date,
            metacritic: details.metacritic.score,
            short_description: details.short_description,
            header_url: details.header_image,
            genres: details.genres?.map((g) => g.description) ?? [],
            categories: details.categories?.map((c) => c.description) ?? [],
            tags,
          },
          { onConflict: "steam_app_id" },
        );
        if (error) throw error;

        knownIds.add(spy.appid);
        knownTitles.add(normalize(details.name));
        saved++;
        console.log(`[${saved}/${LIMIT}] Saved ${details.name} (appid: ${spy.appid})`);
      } catch (err) {
        skipped.other++;
        console.error(`Skipping appid ${spy.appid}:`, err);
      }
    }
  }

  saveRejected();
  console.log(
    `Done. Saved ${saved} new games. Skipped: ${skipped.known} already stored, ` +
      `${skipped.rejected} remembered rejects, ${skipped.duplicate} same name, ` +
      `${skipped.noScore} no Metacritic score, ` +
      `${skipped.nsfw} NSFW, ${skipped.other} other.`,
  );
}

main().catch((err) => {
  console.error("Error during sync:", err);
  process.exit(1);
});
