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
// Skip obscure games: fewer total reviews than this on Steam. A Metacritic
// score is NOT required; popularity is what decides.
const MIN_REVIEWS = Number(process.env.SYNC_MIN_REVIEWS ?? 500);
// A "Game: Subtitle" entry is treated as a lesser-known variation (expansion,
// spin-off, side story) when it has fewer than this share of the reviews of the
// base game. Popular sequels like "Hollow Knight: Silksong" pass easily.
const VARIANT_RATIO = Number(process.env.SYNC_VARIANT_RATIO ?? 0.25);
// Steam's search lists games 100 per page. The list has well over 100,000
// entries, so stop after this many pages (100 games each) even if the target
// isn't reached. The early pages are the better-known games.
const MAX_PAGES = Number(process.env.SYNC_MAX_PAGES ?? 300);

// NSFW games are remembered here so later runs skip them without spending
// Steam requests
const REJECTED_FILE = path.join(
  process.cwd(),
  "app/scripts/sync-rejected.json",
);
const rejected = new Set<number>(
  fs.existsSync(REJECTED_FILE)
    ? (JSON.parse(fs.readFileSync(REJECTED_FILE, "utf8")) as number[])
    : [],
);
// Games Steam lists but SteamSpy has no tags for are NOT saved to the database.
// They go in this text file instead (one per line: "appid | title"), so their
// tags can be filled in from another source later.
const NEEDS_TAGS_FILE = path.join(process.cwd(), "app/scripts/needs-tags.txt");
const needsTags = new Set<number>(
  fs.existsSync(NEEDS_TAGS_FILE)
    ? fs
        .readFileSync(NEEDS_TAGS_FILE, "utf8")
        .split("\n")
        .map((line) => Number(line.split("|")[0].trim()))
        .filter((id) => id > 0)
    : [],
);
function addToNeedsTags(appid: number, title: string) {
  if (needsTags.has(appid)) return;
  needsTags.add(appid);
  fs.appendFileSync(NEEDS_TAGS_FILE, `${appid} | ${title}\n`);
}

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

type candidate = {
  appid: number;
  name: string;
  reviews: number; // total Steam user reviews
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Lowercase and drop symbols and edition words, so "DOOM (Game of the Year
// Edition)" and "Doom" count as the same game
const normalize = (title: string) =>
  title
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(
      /[\s:(\-–]*(?:the\s+)?(game of the year|goty|complete|definitive|enhanced|legacy|anniversary|ultimate|gold|deluxe|special|remastered|director'?s cut)( edition| collection)?\)?\s*$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

// For "Half-Life: Blue Shift" or "Half-Life - Opposing Force" this returns
// "half-life". Titles without a subtitle return null.
function baseTitle(title: string): string | null {
  const m = title.match(/^(.+?)\s*(?::|\s[-–]\s)\s*.+$/);
  return m ? normalize(m[1]) : null;
}

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

// Total Steam reviews by title, filled from every search page we read.
// Used to tell whether a "Game: Subtitle" entry is much less known than its base.
const reviewsByTitle = new Map<string, number>();
function rememberReviews(games: candidate[]) {
  for (const g of games) {
    const key = normalize(g.name);
    if (g.reviews > (reviewsByTitle.get(key) ?? 0))
      reviewsByTitle.set(key, g.reviews);
  }
}
function isLesserKnownVariant(title: string, reviews: number): boolean {
  const base = baseTitle(title);
  if (!base) return false;
  const baseReviews = reviewsByTitle.get(base);
  return baseReviews !== undefined && reviews < baseReviews * VARIANT_RATIO;
}

// Steam's search results come back as HTML inside JSON, so titles contain
// entities such as &amp; and &#8482;
const decodeHtml = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// One page of Steam's own game search (100 games), the same list the store
// website shows. Returns how many games the page listed, how many games Steam
// lists in total, and the ones worth checking (enough reviews).
async function fetchSearchPage(
  page: number,
): Promise<{ listed: number; total: number; candidates: candidate[] }> {
  const url =
    `https://store.steampowered.com/search/results/?query&start=${page * 100}` +
    `&count=100&category1=998&supportedlang=english&infinite=1`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.status === 429 || res.status === 403) {
        console.log(
          `Steam search rate limited, waiting 60s (attempt ${attempt})`,
        );
        await sleep(60_000);
        continue;
      }
      if (!res.ok) throw new Error(`Steam search returned ${res.status}`);
      const json = (await res.json()) as {
        results_html: string;
        total_count: number;
      };

      // One <a ...> block per game
      const all: candidate[] = [];
      for (const block of json.results_html.split("<a ").slice(1)) {
        const id = block.match(/data-ds-appid="(\d+)/);
        const title = block.match(/<span class="title">(.*?)<\/span>/);
        if (!id || !title) continue;
        const rev = block
          .replace(/&lt;br&gt;|<br>/g, " ")
          .match(/of the ([\d,]+) user reviews/);
        all.push({
          appid: Number(id[1]),
          name: decodeHtml(title[1]),
          reviews: rev ? Number(rev[1].replace(/,/g, "")) : 0,
        });
      }
      rememberReviews(all);
      const candidates = all
        .filter((g) => g.reviews >= MIN_REVIEWS)
        .sort((a, b) => b.reviews - a.reviews);
      return { listed: all.length, total: json.total_count, candidates };
    } catch (err) {
      console.log(
        `Steam search page ${page} failed (attempt ${attempt}/4):`,
        (err as Error).message,
      );
      await sleep(15_000);
    }
  }
  throw new Error(
    `Steam search page ${page} kept failing, stopping. Run the sync again later.`,
  );
}

// Steam allows roughly 200 detail requests per 5 minutes. On a rate-limit
// response, wait and retry instead of crashing the whole run.
async function gsteamDetails(id: number): Promise<steamDetails | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`,
    );
    if (res.status === 429 || res.status === 403) {
      console.log(
        `Rate limited by Steam, waiting 60s (attempt ${attempt + 1})`,
      );
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

// The game's player-made tags from SteamSpy (empty if SteamSpy has none)
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
  const existing: { steam_app_id: number; title: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("games")
      .select("steam_app_id,title")
      .order("steam_app_id")
      .range(from, from + 999);
    if (error) throw error;
    existing.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const knownIds = new Set<number>(existing.map((g) => Number(g.steam_app_id)));
  const knownTitles = new Set<string>(existing.map((g) => normalize(g.title)));
  console.log(
    `Database already has ${knownIds.size} games. Target: ${LIMIT} new.`,
  );

  let saved = 0;
  const skipped = {
    noTags: 0,
    known: 0,
    rejected: 0,
    variant: 0,
    duplicate: 0,
    nsfw: 0,
    other: 0,
  };
  console.log(`Remembered NSFW rejects from earlier runs: ${rejected.size}`);

  let failures = 0; // requests that failed in a row
  for (let page = 0; saved < LIMIT && page < MAX_PAGES; page++) {
    if (page > 0) await sleep(1000);
    const { listed, total, candidates } = await fetchSearchPage(page);
    if (listed === 0) {
      console.log(
        `Steam search page ${page} returned no more games, stopping.`,
      );
      break;
    }
    console.log(
      `Steam search page ${page}: ${candidates.length} candidates ` +
        `(of ${listed}; Steam lists ${total} games in all)`,
    );

    for (const spy of candidates) {
      if (saved >= LIMIT) break;

      // Cheap checks first, before any Steam request
      if (knownIds.has(spy.appid)) {
        skipped.known++;
        continue;
      }
      if (needsTags.has(spy.appid)) {
        skipped.noTags++;
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
      if (isLesserKnownVariant(spy.name, spy.reviews)) {
        skipped.variant++;
        continue;
      }

      try {
        const details = await gsteamDetails(spy.appid);
        failures = 0; // that request got through
        await sleep(1500);
        if (!details) {
          skipped.other++;
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
        if (tags.length === 0) {
          addToNeedsTags(spy.appid, details.name);
          skipped.noTags++;
          continue;
        }
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
            metacritic: details.metacritic?.score ?? null,
            short_description: details.short_description,
            header_url: details.header_image,
            genres: details.genres?.map((g) => g.description) ?? [],
            categories: details.categories?.map((c) => c.description) ?? [],
            tags,
          },
          { onConflict: "steam_app_id" },
        );
        if (error) throw error;

        failures = 0;
        knownIds.add(spy.appid);
        knownTitles.add(normalize(details.name));
        saved++;
        console.log(
          `[${saved}/${LIMIT}] Saved ${details.name} (appid: ${spy.appid})`,
        );
      } catch (err) {
        skipped.other++;
        failures++;
        console.error(`Skipping appid ${spy.appid}:`, (err as Error).message);
        // Several failures in a row means the connection is down: wait, and
        // give up after a few waits instead of skipping through every game
        if (failures % 5 === 0) {
          if (failures >= 20) {
            throw new Error(
              "Connection keeps failing, stopping. Run the sync again later.",
            );
          }
          console.log("Connection problem, waiting 60s...");
          await sleep(60_000);
        }
      }
    }
  }

  saveRejected();
  console.log(
    `Done. Saved ${saved} new games. Skipped: ${skipped.known} already stored, ` +
      `${skipped.rejected} remembered NSFW, ${skipped.duplicate} same name, ` +
      `${skipped.variant} lesser-known variants, ${skipped.noTags} without tags (listed in needs-tags.txt), ` +
      `${skipped.nsfw} NSFW, ${skipped.other} other.`,
  );

  // Report only: stored games that look like lesser-known variants of a base game
  const flagged = (existing ?? []).filter((g) => {
    const reviews = reviewsByTitle.get(normalize(g.title));
    return reviews !== undefined && isLesserKnownVariant(g.title, reviews);
  });
  if (flagged.length) {
    console.log(
      `Stored games that look like lesser-known variants (not removed):\n` +
        flagged.map((g) => `  ${g.steam_app_id}  ${g.title}`).join("\n"),
    );
  }
}

main().catch((err) => {
  console.error("Error during sync:", err);
  process.exit(1);
});
