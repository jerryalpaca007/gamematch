import { createClient } from "@supabase/supabase-js";
import type { Game } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// This client only reads the public games list. It never carries a signed-in
// session (that is lib/supabase.ts), so the games load the same for everyone.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "gamematch-games",
  },
});

export interface SteamGame {
  steam_app_id: number;
  title: string;
  released: string | null;
  metacritic: number | null;
  short_description: string | null;
  header_url: string | null;
  genres: string[];
  categories: string[];
  tags: string[];
  // Hardware needs, read from Steam's minimum requirements (null = not known)
  min_ram_gb?: number | null;
  min_graphics?: string | null;
  integrated_ok?: boolean | null;
}

// Same list as sync-steam.ts. Hides NSFW games that were stored before the
// sync script started filtering them.
const NSFW_TAGS = ["nsfw", "hentai", "eroge"];

// Supabase returns at most 1000 rows per request, so the table is read in
// pages of 1000 (in parallel) and joined. Only the columns the app uses are
// requested, which keeps the download small even with thousands of games.
const PAGE_SIZE = 1000;
const BASE_COLUMNS =
  "steam_app_id,title,released,metacritic,short_description,header_url,genres,categories,tags";
// The hardware columns only exist once the SQL for them has been run in Supabase.
// If they are missing, the games are read without them and everything else works.
const GAME_COLUMNS = `${BASE_COLUMNS},min_ram_gb,min_graphics,integrated_ok`;

async function readAllGames(
  columns: string,
  count: number,
): Promise<{ games: SteamGame[]; failed: boolean }> {
  // Ordered by id so the pages never overlap or skip a row
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / PAGE_SIZE) }, (_, i) =>
      supabase
        .from("games")
        .select(columns)
        .order("steam_app_id")
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1),
    ),
  );
  const games: SteamGame[] = [];
  for (const { data, error } of pages) {
    if (error) return { games: [], failed: true };
    games.push(...((data ?? []) as unknown as SteamGame[]));
  }
  return { games, failed: false };
}

export async function fetchGamesFromSupabase(): Promise<SteamGame[]> {
  const { count, error: countError } = await supabase
    .from("games")
    .select("steam_app_id", { count: "exact", head: true });

  if (countError || count === null) {
    console.error("Error counting games:", countError);
    return [];
  }

  let { games, failed } = await readAllGames(GAME_COLUMNS, count);
  if (failed) ({ games, failed } = await readAllGames(BASE_COLUMNS, count));
  if (failed) {
    console.error("Error fetching games");
    return [];
  }

  // Hide NSFW games that were stored before the sync script filtered them
  return games.filter(
    (g) => !(g.tags ?? []).some((t) => NSFW_TAGS.includes(t.toLowerCase())),
  );
}

// The list without repeats, keeping the first of each (ignoring upper/lower case)
function unique(list: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  return (list ?? []).filter((item) => {
    const key = item.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateMoodScores(genres: string[], rating: number) {
  const genresLower = genres.map((g) => g.toLowerCase());
  let excitement = 2;
  let chill = 2;
  let puzzle = 2;
  let story = 2;
  let challenge = 2;

  if (
    genresLower.includes("action") ||
    genresLower.includes("shooter") ||
    genresLower.includes("fighting")
  ) {
    excitement = Math.min(5, excitement + 2);
    challenge = Math.min(5, challenge + 1);
  }
  if (
    genresLower.includes("puzzle") ||
    genresLower.includes("strategy") ||
    genresLower.includes("tactics")
  ) {
    puzzle = Math.min(5, puzzle + 3);
  }
  if (genresLower.includes("adventure") || genresLower.includes("rpg")) {
    story = Math.min(5, story + 2);
  }
  if (genresLower.includes("simulation") || genresLower.includes("casual")) {
    chill = Math.min(5, chill + 2);
  }
  if (genresLower.includes("roguelike") || genresLower.includes("roguelite")) {
    challenge = Math.min(5, challenge + 2);
    excitement = Math.min(5, excitement + 1);
  }

  // Adjust based on rating
  if (rating < 2) {
    challenge = Math.max(0, challenge - 1);
  } else if (rating > 4) {
    excitement = Math.min(5, excitement + 1);
  }

  return { excitement, chill, puzzle, story, challenge };
}

export function generateBgColor(rating: number): string {
  const colors = [
    "#8b2e1f",
    "#4f7a3a",
    "#2c5f8a",
    "#2a2a3d",
    "#5a3d7a",
    "#b0527a",
    "#c96a2b",
    "#3d4a2e",
    "#5c3a2e",
    "#7a8c6a",
  ];
  return colors[Math.floor(rating * colors.length) % colors.length];
}

// Steam descriptions contain HTML entities such as &amp; and &quot;
function decodeEntities(text: string | null): string {
  return (text ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function enrichGameData(game: SteamGame): Game {
  // Steam dates look like "14 Aug, 2025", so find the 4-digit year anywhere in it
  const yearMatch = game.released?.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  // Use metacritic or default rating for mood calculation
  const ratingForMood = game.metacritic ? game.metacritic / 20 : 3;
  const mood = generateMoodScores(game.genres, ratingForMood);
  const bg = generateBgColor(ratingForMood);

  return {
    steam_app_id: game.steam_app_id,
    title: game.title,
    metacritic: game.metacritic,
    header_url: game.header_url,
    genres: game.genres,
    // Steam sometimes lists the same feature twice (e.g. DualShock support)
    categories: unique(game.categories),
    tags: unique(game.tags),
    min_ram_gb: game.min_ram_gb ?? null,
    min_graphics: game.min_graphics ?? null,
    integrated_ok: game.integrated_ok ?? null,
    year,
    summary:
      decodeEntities(game.short_description) ||
      `A ${game.genres.join(", ")} game`,
    mood,
    bg,
  };
}
