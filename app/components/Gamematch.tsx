"use client";

import React, { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Heart, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";

interface MoodScores {
  excitement: number;
  chill: number;
  puzzle: number;
  story: number;
  challenge: number;
}

interface Game {
  steam_app_id: number;
  title: string;
  emoji: string;
  genres: string | string[];
  year: number;
  summary: string;
  mood: MoodScores;
  bg: string;
  header_url?: string | null;
}

const MOODS: { key: keyof MoodScores; label: string }[] = [
  { key: "excitement", label: "Excitement" },
  { key: "chill", label: "Chill" },
  { key: "puzzle", label: "Puzzle / Think" },
  { key: "story", label: "Story" },
  { key: "challenge", label: "Challenge" },
];

const DEFAULT_GAMES: Game[] = [];

export default function GameMatch() {
  const [games, setGames] = useState<Game[]>(DEFAULT_GAMES);
  const [loading, setLoading] = useState(true);
  const [sliders, setSliders] = useState<MoodScores>({
    excitement: 3,
    chill: 3,
    puzzle: 3,
    story: 3,
    challenge: 3,
  });
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [savedGames, setSavedGames] = useState<Game[]>([]);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const steamGames = await fetchGamesFromSupabase();
        console.log("Loaded games from Supabase:", steamGames);
        if (steamGames.length > 0) {
          const enrichedGames = steamGames.map(enrichGameData);
          console.log("Enriched games:", enrichedGames);
          console.log("First game header_url:", enrichedGames[0]?.header_url);
          console.log(
            "First game full:",
            JSON.stringify(enrichedGames[0], null, 2),
          );
          setGames(enrichedGames);
        } else {
          console.log("No games from Supabase, using defaults");
        }
      } catch (error) {
        console.error("Failed to load games from Supabase:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  // Calculate deck sorted by user mood preferences
  const currentDeck = games
    .filter((g) => !seenIds.has(g.steam_app_id))
    .sort((a, b) => {
      const scoreA = MOODS.reduce(
        (sum, m) => sum + sliders[m.key] * a.mood[m.key],
        0,
      );
      const scoreB = MOODS.reduce(
        (sum, m) => sum + sliders[m.key] * b.mood[m.key],
        0,
      );
      return scoreB - scoreA;
    });

  const currentGame = currentDeck[0] || null;

  const handleSwipe = (liked: boolean) => {
    if (!currentGame) return;
    setSeenIds((prev) => new Set(prev).add(currentGame.steam_app_id));
    if (liked) setSavedGames((prev) => [...prev, currentGame]);
  };

  const handleReset = () => {
    setSeenIds(new Set());
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 font-serif text-amber-950 dark:text-amber-50">
      <header className="mb-6 text-center">
        <p className="text-sm italic opacity-75">Swipe for your next PC game</p>
      </header>

      {/* Mood Sliders */}
      <details className="mb-6 rounded-lg border-2 border-amber-950 bg-amber-50 p-4 shadow-[4px_4px_0_#2b2118] dark:border-amber-100 dark:bg-stone-900 dark:shadow-[4px_4px_0_#f1e8d4]">
        <summary className="flex cursor-pointer items-center gap-2 font-bold uppercase tracking-wide">
          <SlidersHorizontal className="h-4 w-4" /> Adjust Mood
        </summary>
        <div className="mt-4 space-y-3 font-sans text-sm">
          {MOODS.map((m) => (
            <div
              key={m.key}
              className="grid grid-cols-[100px_1fr_24px] items-center gap-2"
            >
              <span>{m.label}</span>
              <input
                type="range"
                min="0"
                max="5"
                value={sliders[m.key]}
                onChange={(e) =>
                  setSliders((prev) => ({
                    ...prev,
                    [m.key]: Number(e.target.value),
                  }))
                }
                className="accent-rose-600"
              />
              <span className="text-right font-mono">{sliders[m.key]}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Card Stack */}
      <div className="relative h-[440px] w-full">
        <AnimatePresence>
          {currentGame ? (
            <SwipeCard
              key={currentGame.steam_app_id}
              game={currentGame}
              onSwipe={handleSwipe}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border-2 border-amber-950 bg-amber-50 p-6 text-center shadow-[6px_6px_0_#2b2118] dark:border-amber-100 dark:bg-stone-900 dark:shadow-[6px_6px_0_#f1e8d4]">
              <p className="text-lg font-medium">
                You've seen every game in the deck!
              </p>
              <button
                onClick={handleReset}
                className="mt-4 flex items-center gap-2 rounded border-2 border-amber-950 bg-rose-600 px-4 py-2 font-sans font-semibold text-white shadow-[2px_2px_0_#2b2118] active:translate-x-0.5 active:translate-y-0.5"
              >
                <RotateCcw className="h-4 w-4" /> Reset Deck
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      {currentGame && (
        <div className="mt-6 flex justify-center gap-8">
          <button
            onClick={() => handleSwipe(false)}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-950 bg-amber-50 text-rose-600 shadow-[3px_3px_0_#2b2118] active:translate-x-0.5 active:translate-y-0.5 dark:border-amber-100 dark:bg-stone-900"
            aria-label="Pass"
          >
            <X className="h-8 w-8" />
          </button>
          <button
            onClick={() => handleSwipe(true)}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-950 bg-amber-50 text-emerald-600 shadow-[3px_3px_0_#2b2118] active:translate-x-0.5 active:translate-y-0.5 dark:border-amber-100 dark:bg-stone-900"
            aria-label="Save"
          >
            <Heart className="h-8 w-8 fill-current" />
          </button>
        </div>
      )}

      {/* Saved List */}
      <section className="mt-8 rounded-lg border-2 border-amber-950 bg-amber-50 p-4 shadow-[4px_4px_0_#2b2118] dark:border-amber-100 dark:bg-stone-900 dark:shadow-[4px_4px_0_#f1e8d4]">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">
          Want to Play
        </h2>
        {savedGames.length === 0 ? (
          <p className="text-sm italic opacity-60">Nothing saved yet.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 font-sans text-sm">
            {savedGames.map((g) => (
              <li key={g.steam_app_id}>
                {g.emoji} <strong>{g.title}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Sub-component handling swipe animations
function SwipeCard({
  game,
  onSwipe,
}: {
  game: Game;
  onSwipe: (liked: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacityLike = useTransform(x, [10, 100], [0, 1]);
  const opacityNope = useTransform(x, [-10, -100], [0, 1]);

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex cursor-grab flex-col justify-between rounded-lg border-2 border-amber-950 bg-amber-50 p-4 shadow-[6px_6px_0_#2b2118] active:cursor-grabbing dark:border-amber-100 dark:bg-stone-900 dark:shadow-[6px_6px_0_#f1e8d4]"
    >
      {/* Dynamic Overlays */}
      <motion.div
        style={{ opacity: opacityLike }}
        className="absolute right-4 top-4 rotate-12 rounded border-4 border-emerald-600 px-3 py-1 font-sans font-bold text-emerald-600 pointer-events-none"
      >
        SAVE
      </motion.div>
      <motion.div
        style={{ opacity: opacityNope }}
        className="absolute left-4 top-4 -rotate-12 rounded border-4 border-rose-600 px-3 py-1 font-sans font-bold text-rose-600 pointer-events-none"
      >
        PASS
      </motion.div>

      <div>
        <div
          className="relative h-36 w-full rounded border-2 border-amber-950 shadow-inner overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: game.bg }}
        >
          {game.header_url && (
            <img
              src={game.header_url}
              alt={game.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                console.error("Image failed to load:", game.header_url);
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          <span className="relative text-6xl z-10">{game.emoji}</span>
        </div>
        <h3 className="mt-3 text-xl font-bold">{game.title}</h3>
        <p className="font-sans text-xs opacity-60">
          {Array.isArray(game.genres) ? game.genres.join(", ") : game.genres} •{" "}
          {game.year}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{game.summary}</p>
      </div>

      <div className="flex flex-wrap gap-1 font-sans">
        {MOODS.filter((m) => game.mood[m.key] >= 4).map((m) => (
          <span
            key={m.key}
            className="rounded border border-emerald-700 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {m.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
