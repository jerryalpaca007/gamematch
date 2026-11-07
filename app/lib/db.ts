import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface RawgGame {
  id: number;
  slug: string;
  title: string;
  released: string | null;
  metacritic: number | null;
  rating: number;
  cover_url: string | null;
  genres: string[];
  tags: string[];
}

export interface GameWithMood extends RawgGame {
  emoji: string;
  year: number;
  summary: string;
  mood: {
    excitement: number;
    chill: number;
    puzzle: number;
    story: number;
    challenge: number;
  };
  bg: string;
}

export async function fetchGamesFromSupabase(): Promise<RawgGame[]> {
  const { data, error } = await supabase.from("games").select("*").limit(100);

  if (error) {
    console.error("Error fetching games:", error);
    return [];
  }

  return data || [];
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

export function generateEmojiForGame(title: string, genres: string[]): string {
  const genresLower = genres.map((g) => g.toLowerCase());
  const emojis: { [key: string]: string } = {
    action: "⚔️",
    adventure: "🗺️",
    rpg: "🎭",
    puzzle: "🧩",
    strategy: "♟️",
    simulation: "🚀",
    casual: "🎮",
    indie: "✨",
    horror: "👻",
    sports: "⚽",
    racing: "🏎️",
    fighting: "🥊",
    shooter: "🔫",
    platformer: "⛰️",
    roguelike: "🎲",
    roguelite: "🎲",
  };

  for (const genre of genresLower) {
    if (emojis[genre]) return emojis[genre];
  }

  return "🎮";
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

export function enrichGameData(game: RawgGame): GameWithMood {
  const year = game.released
    ? parseInt(game.released.split("-")[0])
    : new Date().getFullYear();
  const mood = generateMoodScores(game.genres, game.rating);
  const emoji = generateEmojiForGame(game.title, game.genres);
  const bg = generateBgColor(game.rating);

  return {
    ...game,
    year,
    summary: `A ${game.genres.join(", ")} game with ${game.rating}/5 rating.`,
    mood,
    emoji,
    bg,
  };
}
