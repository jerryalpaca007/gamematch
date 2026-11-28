import type { MoodScores } from "@/app/components/moods";

// One game as the app uses it: the database row plus what we work out from it
// (see enrichGameData in lib/db.ts).
export interface Game {
  steam_app_id: number;
  title: string;
  year: number;
  summary: string;
  genres: string[];
  categories: string[];
  tags: string[];
  metacritic: number | null;
  header_url: string | null;
  mood: MoodScores;
  bg: string; // card colour behind the artwork
  // hardware needs from Steam's minimum requirements (null = not known)
  min_ram_gb?: number | null;
  min_graphics?: string | null;
  integrated_ok?: boolean | null;
  jitter?: number; // random 0-1: the game's place in the shuffled swipe deck
}
