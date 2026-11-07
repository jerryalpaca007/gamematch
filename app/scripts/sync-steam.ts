import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LIMIT = Number(process.env.SYNC_LIMIT ?? 200);

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
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gcandidateIds(limit: number): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 0; ids.length < limit; page++) {
    const res = await fetch(
      `https://steamspy.com/api.php?request=all&page=${page}`,
    );
    if (!res.ok) break;
    const data = (await res.json()) as Record<string, unknown>;
    const keys = Object.keys(data);
    if (!keys.length) break;
    ids.push(...keys.map((k) => parseInt(k)).filter((k) => !isNaN(k)));
    await sleep(1000);
  }
  return ids.slice(0, limit);
}

async function gsteamDetails(id: number): Promise<steamDetails | null> {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${id}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch details for appid ${id}`);
  const json = (await res.json()) as Record<
    string,
    { success: boolean; data?: steamDetails }
  >;
  const entry = json[String(id)];
  return entry?.success && entry.data?.type === "game" ? entry.data : null;
}

async function gsteamSpytags(id: number): Promise<string[]> {
  const res = await fetch(
    `https://steamspy.com/api.php?request=appdetails&appid=${id}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch details for appid ${id}`);
  const data = (await res.json()) as { tags?: Record<string, number> };
  return Object.entries(data.tags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => name);
}

async function main() {
  const ids = await gcandidateIds(LIMIT);
  console.log(`Found ${ids.length} candidate game IDs from SteamSpy`);

  let saved = 0;
  for (const appid of ids) {
    const details = await gsteamDetails(appid);
    await sleep(1000);
    if (!details) continue;
    const tags = await gsteamSpytags(appid);
    await sleep(1000);

    const { error } = await supabase.from("games").upsert({
      steam_app_id: appid,
      title: details.name,
      released: details.release_date?.date,
      metacritic: details.metacritic?.score,
      short_description: details.short_description,
      header_url: details.header_image,
      genres: details.genres?.map((g) => g.description) ?? [],
      categories: details.categories?.map((c) => c.description) ?? [],
      tags,
    });
    if (error) throw error;
    saved++;
    console.log(`Saved game ${details.name} (appid: ${appid})`);
  }
  console.log(`Saved ${saved} games to Supabase`);
}

main().catch((err) => {
  console.error("Error during sync:", err);
  process.exit(1);
});
