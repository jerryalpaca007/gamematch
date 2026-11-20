"use client";
// "use client" tells Next.js this component runs in the browser,
// because it uses state, effects, and drag gestures.

import Image from "next/image";
import React, { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { RotateCcw } from "lucide-react";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import PixelButtons from "./PixelButtons";
import GameDetails from "./GameDetails";
import { jersey, pressStart } from "./fonts";
import {
  px,
  CARD_W,
  CARD_H,
  SCREEN,
  SCREEN_CLIP,
  NOTCH,
  scoreColor,
} from "./cardScale";

// ---------- Types ----------
// A type describes the shape of data, so TypeScript can catch mistakes.

interface MoodScores {
  excitement: number;
  chill: number;
  puzzle: number;
  story: number;
  challenge: number;
}

export interface Game {
  steam_app_id: number;
  title: string;
  emoji: string;
  genres: string | string[];
  year: number;
  summary: string;
  mood: MoodScores;
  bg: string;
  header_url?: string | null;
  metacritic?: number | null;
  tags?: string[];
  categories?: string[];
  jitter?: number; // random 0-1, picked once per page load, so the deck order varies
}

// How much the random bonus can move a game in the ranking. A game's mood
// score is roughly 20-60, so this mixes things up without ignoring the sliders.
const JITTER_WEIGHT = 25;

// Each mood has a key (used in code) and a label (shown to the user)
const MOODS: { key: keyof MoodScores; label: string }[] = [
  { key: "excitement", label: "Excitement" },
  { key: "chill", label: "Chill" },
  { key: "puzzle", label: "Puzzle / Think" },
  { key: "story", label: "Story" },
  { key: "challenge", label: "Challenge" },
];

const DEFAULT_GAMES: Game[] = [];


// ---------- Main component ----------
export default function GameMatch() {
  // State: values that change over time and trigger a re-render when updated
  const [games, setGames] = useState<Game[]>(DEFAULT_GAMES);
  const [loading, setLoading] = useState(true);
  const [sliders, setSliders] = useState<MoodScores>({
    excitement: 3,
    chill: 3,
    puzzle: 3,
    story: 3,
    challenge: 3,
  });
  // A Set is a fast way to ask "have I seen this game?"
  // The game shown in the expanded view, or null when it is closed
  const [viewing, setViewing] = useState<Game | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [savedGames, setSavedGames] = useState<Game[]>([]);

  // Effect: runs once when the component first appears (empty array = run once)
  // It loads games from your database, not from Steam
  useEffect(() => {
    const loadGames = async () => {
      try {
        const steamGames = await fetchGamesFromSupabase();
        if (steamGames.length > 0) {
          // Add mood, emoji, and color fields to each raw game
          setGames(
            steamGames.map((g) => ({
              ...enrichGameData(g),
              jitter: Math.random(),
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load games from Supabase:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGames();
  }, []);

  // Derived data: calculated from state on every render, not stored separately.
  // 1. Drop games already seen
  // 2. Score each game against the sliders
  // 3. Sort highest score first
  // 4. Keep the top 3 for the stack
  const currentDeck = games
    .filter((g) => !seenIds.has(g.steam_app_id))
    .sort((a, b) => {
      const scoreA =
        MOODS.reduce((sum, m) => sum + sliders[m.key] * a.mood[m.key], 0) +
        (a.jitter ?? 0) * JITTER_WEIGHT;
      const scoreB =
        MOODS.reduce((sum, m) => sum + sliders[m.key] * b.mood[m.key], 0) +
        (b.jitter ?? 0) * JITTER_WEIGHT;
      return scoreB - scoreA;
    })
    .slice(0, 3);

  const currentGame = currentDeck[0] || null;

  // Handler: marks the top card as seen, and saves it if the user liked it
  const handleSwipe = (liked: boolean) => {
    if (!currentGame) return;
    // Create a new Set instead of changing the old one, so React sees the update
    setSeenIds((prev) => new Set(prev).add(currentGame.steam_app_id));
    if (liked) setSavedGames((prev) => [...prev, currentGame]);
  };

  const handleReset = () => {
    setSeenIds(new Set());
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 font-serif text-amber-950 dark:text-amber-50">
      {/* Console: sized from cardScale.ts. The pixel buttons are positioned
          from this box's top-left corner, so they must live inside it. The
          deck is drawn back to front, top card on top. flex + shrink-0 keeps
          it centered even though it is wider than the column. */}
      <div className="flex justify-center">
      <div
        className="relative shrink-0"
        style={{ width: CARD_W, height: CARD_H }}
      >
        <AnimatePresence>
          {currentGame ? (
            <div className="relative h-full w-full">
              {currentDeck.map((game, index) => (
                <SwipeCard
                  key={game.steam_app_id}
                  game={game}
                  onSwipe={handleSwipe}
                  index={index}
                  totalCards={currentDeck.length}
                />
              ))}
            </div>
          ) : (
            // Empty state: the same console, with the message on its screen
            <div className="absolute inset-0">
              <Image
                src="/game-card-pixel.svg"
                alt=""
                fill
                className="pointer-events-none object-fill"
              />
              <div
                className="absolute flex flex-col items-center justify-center gap-4 bg-white px-4 text-center"
                style={{ ...SCREEN, clipPath: SCREEN_CLIP }}
              >
                <p
                  className={`${jersey.className} leading-tight text-black`}
                  style={{ fontSize: px(20) }}
                >
                  You've seen every game in the deck!
                </p>
                <button
                  onClick={handleReset}
                  className={`${pressStart.className} flex items-center gap-2 border-4 border-black bg-[#ff4b6b] px-3 py-2 text-[10px] text-white active:translate-x-0.5 active:translate-y-0.5`}
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Pixel buttons: green = pass, orange = save, the rest are decorative */}
        {currentGame && (
          <PixelButtons
            onPass={() => handleSwipe(false)}
            onLike={() => handleSwipe(true)}
            onExtra={(id) => {
              if (id === "grey" && currentGame) setViewing(currentGame);
            }}
          />
        )}
      </div>
      </div>

      <AnimatePresence>
        {viewing && (
          <GameDetails game={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Swipe card ----------
// A child component: it handles one card's drag and animation.
function SwipeCard({
  game,
  onSwipe,
  index = 0,
  totalCards = 1,
}: {
  game: Game;
  onSwipe: (liked: boolean) => void;
  index?: number;
  totalCards?: number;
}) {
  // Motion values track the card's horizontal position while it's dragged
  const x = useMotionValue(0);
  // Derived values: tilt the card and fade in SAVE or PASS based on x
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacityLike = useTransform(x, [10, 100], [0, 1]);
  const opacityNope = useTransform(x, [-10, -100], [0, 1]);

  // Cards behind the top one are smaller and sit lower, which creates the stack
  const scale = 1 - index * 0.05;
  const yOffset = index * 12;
  const zIndex = totalCards - index;

  // Dragged far enough left or right: swipe. Otherwise the card snaps back
  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) onSwipe(true);
    else if (info.offset.x < -100) onSwipe(false);
  };

  return (
    <motion.div
      initial={{ scale, y: yOffset }}
      animate={{ scale, y: yOffset }}
      exit={{ x: 500, opacity: 0, rotate: 20 }}
      style={{
        x: index === 0 ? x : 0,
        rotate: index === 0 ? rotate : 0,
        zIndex,
      }}
      // Only the top card can be dragged
      drag={index === 0 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* Pixel artwork: light-blue console body with a white screen */}
      <Image
        src="/game-card-pixel.svg"
        alt=""
        fill
        className="pointer-events-none object-fill"
      />

      {/* Cover image on the console screen. The full image is shown
          (object-contain); a dimmed, blurred copy fills the space around it. */}
      <div
        className="absolute overflow-hidden"
        style={{
          ...SCREEN,
          clipPath: SCREEN_CLIP,
          backgroundColor: game.bg,
        }}
      >
        {game.header_url && (
          <>
            <img
              src={game.header_url}
              alt=""
              aria-hidden
              draggable={false}
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-md brightness-50"
            />
            <img
              src={game.header_url}
              alt={game.title}
              draggable={false}
              className="relative h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </>
        )}
      </div>

      {/* SAVE and PASS stamps: only on the top card */}
      {index === 0 && (
        <>
          <motion.div
            style={{ opacity: opacityLike }}
            className={`${pressStart.className} pointer-events-none absolute right-8 top-12 z-10 rotate-12 border-4 border-black bg-[#3dff6e] px-2 py-1 text-xs text-black`}
          >
            SAVE
          </motion.div>
          <motion.div
            style={{ opacity: opacityNope }}
            className={`${pressStart.className} pointer-events-none absolute left-8 top-12 z-10 -rotate-12 border-4 border-black bg-[#ff4b6b] px-2 py-1 text-xs text-white`}
          >
            PASS
          </motion.div>
        </>
      )}

      {/* Text sits on the blue body, below the screen */}
      <div
        className="absolute"
        style={{ left: px(27), top: px(256), width: px(275) }}
      >
        <h3
          className={`${pressStart.className} line-clamp-2 text-black`}
          style={{ fontSize: px(8), lineHeight: `${px(13)}px` }}
        >
          {game.title}
        </h3>
        <p
          className={`${jersey.className} mt-1 line-clamp-1 text-black/70`}
          style={{ fontSize: px(15), lineHeight: `${px(15)}px` }}
        >
          {Array.isArray(game.genres) ? game.genres.join(", ") : game.genres} •{" "}
          {game.year}
        </p>
        <p
          className={`${jersey.className} mt-1 line-clamp-3 text-black`}
          style={{ fontSize: px(15), lineHeight: `${px(15)}px` }}
        >
          {game.summary}
        </p>
      </div>

      {/* Mood tags, kept left of the emoji square (which starts at x=237) */}
      <div
        className="absolute flex flex-wrap gap-1"
        style={{ left: px(27), top: px(392), width: px(200) }}
      >
        {MOODS.filter((m) => game.mood[m.key] >= 4).map((m) => (
          // Black outer shape + lighter-blue inner shape, both with notched
          // corners: the pill buttons' look, without the drop shadow
          <span
            key={m.key}
            className="inline-block bg-black"
            style={{ padding: px(3), clipPath: NOTCH }}
          >
            <span
              className={`${jersey.className} block bg-[#cfe3ff] text-black`}
              style={{
                fontSize: px(13),
                lineHeight: `${px(17)}px`,
                padding: `0 ${px(6)}px`,
                clipPath: NOTCH,
              }}
            >
              {m.label}
            </span>
          </span>
        ))}
      </div>

      {/* Cream square in the card's bottom-right corner, holding the Metacritic
          score. It is part of the card artwork, so it moves with the card. */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: px(237),
          top: px(387),
          width: px(65),
          height: px(65),
        }}
      >
        {/* Same shapes as public/btn-cream.svg, drawn inline so the fill can
            change color with the score */}
        <svg
          viewBox="0 0 65 65"
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <rect
            x="4.88367"
            y="4.88367"
            width="55.3488"
            height="55.3488"
            fill={game.metacritic != null ? scoreColor(game.metacritic) : "#FFF5F1"}
          />
          <g fill="black">
            <rect x="60" y="14" width="5" height="41" />
            <rect x="14" y="60" width="42" height="5" />
            <rect x="9.76746" width="45.5814" height="4.88372" />
            <rect y="9.76746" width="4.88372" height="45.5814" />
            <rect x="4.88367" y="50.4651" width="4.88372" height="9.76744" />
            <rect x="9" y="55" width="5" height="10" />
            <rect x="50.4651" y="4.88367" width="9.76744" height="4.88372" />
            <rect x="55" y="9" width="10" height="5" />
            <rect x="55.3489" y="50.4651" width="4.88372" height="9.76744" />
            <rect x="50.4651" y="55.3489" width="4.88372" height="4.88372" />
            <rect x="4.88367" y="4.88367" width="4.88372" height="9.76744" />
            <rect x="9.76746" y="4.88367" width="4.88372" height="4.88372" />
          </g>
        </svg>
        <span
          className={`${pressStart.className} relative leading-none text-black`}
          style={{
            fontSize: px(game.metacritic != null && game.metacritic >= 100 ? 14 : 20),
          }}
        >
          {game.metacritic ?? "--"}
        </span>
      </div>
    </motion.div>
  );
}
