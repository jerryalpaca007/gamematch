import { useEffect, useState } from "react";
import { supabase } from "./db";
import { useSaved } from "./saved";
import {
  averageMoods,
  engineMoods,
  type EngineMoods,
  type MoodInput,
} from "./moodEngine";

// Fewer saved games than this say too little about what you like
export const SAVES_NEEDED = 3;

// Ids are asked for in groups, so a long list does not make the address too long
const GROUP = 200;

export interface Taste {
  status: "loading" | "too-few" | "ready" | "error";
  moods: EngineMoods | null; // average over your saved games
  count: number; // saved games it is based on
}

// Your taste, worked out from your saved games. The game being looked at is
// left out, so a saved game is not compared with itself.
export function useTaste(skipId: number): Taste {
  const { ids, loading } = useSaved();
  const others = ids.filter((id) => id !== skipId);
  // a text version of the list, so the effect reruns only when it changes
  const key = others.join(",");
  const [result, setResult] = useState<{
    key: string;
    moods: EngineMoods | null; // null = could not be read
    count: number;
  } | null>(null);

  useEffect(() => {
    const wanted = key ? key.split(",").map(Number) : [];
    if (wanted.length < SAVES_NEEDED) return;
    let cancelled = false;
    const load = async () => {
      const games: MoodInput[] = [];
      for (let i = 0; i < wanted.length; i += GROUP) {
        const { data, error } = await supabase
          .from("games")
          .select("genres,tags,categories")
          .in("steam_app_id", wanted.slice(i, i + GROUP));
        if (error) {
          if (!cancelled) setResult({ key, moods: null, count: 0 });
          return;
        }
        games.push(...data);
      }
      if (!cancelled) {
        setResult({
          key,
          moods: averageMoods(games.map(engineMoods)),
          count: games.length,
        });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const none = { moods: null, count: others.length };
  if (loading) return { status: "loading", ...none };
  if (others.length < SAVES_NEEDED) return { status: "too-few", ...none };
  if (result?.key !== key) return { status: "loading", ...none };
  if (!result.moods) return { status: "error", ...none };
  return { status: "ready", moods: result.moods, count: result.count };
}
