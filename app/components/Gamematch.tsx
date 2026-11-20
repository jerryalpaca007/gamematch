"use client";
// "use client" tells Next.js this component runs in the browser,
// because it uses state, effects, and drag gestures.

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
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
import { S, px, CARD_W, CARD_H, NOTCH, scoreColor } from "./cardScale";

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

// How many cards beyond the 3 on screen get their image loaded in advance
const PRELOAD_AHEAD = 6;

// Below this screen width there is no room for buttons beside the card
const NARROW_BELOW = 770;

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
  // 1 = the last card was saved (flies right), -1 = passed (flies left)
  const [direction, setDirection] = useState(1);
  // Size of the console: full size on desktop, shrunk to fit the card on phones
  const [layout, setLayout] = useState({ scale: S, narrow: false });
  useEffect(() => {
    const fit = () => {
      // innerWidth can be inflated by wide content on phones, so also look at
      // the real screen width and the document's own width
      const w = Math.min(
        window.innerWidth,
        document.documentElement.clientWidth,
        window.screen.width,
      );
      const narrow = w < NARROW_BELOW;
      setLayout({ narrow, scale: narrow ? Math.min(S, (w - 24) / 335) : S });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Effect: runs once when the component first appears (empty array = run once)
  // It loads games from your database, not from Steam
  useEffect(() => {
    // In development React runs this effect twice. Each run would reshuffle the
    // deck, making the first cards fly away, so only the latest run may apply.
    let cancelled = false;
    const loadGames = async () => {
      try {
        const steamGames = await fetchGamesFromSupabase();
        if (cancelled) return;
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
        if (!cancelled) setLoading(false);
      }
    };
    loadGames();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every unseen game, best match first: drop seen games, score the rest
  // against the sliders (plus the random bonus). useMemo means the sort runs
  // only when one of these inputs changes, not on every render.
  const ranked = useMemo(
    () =>
      games
        .filter((g) => !seenIds.has(g.steam_app_id))
        .sort((a, b) => {
          const scoreA =
            MOODS.reduce((sum, m) => sum + sliders[m.key] * a.mood[m.key], 0) +
            (a.jitter ?? 0) * JITTER_WEIGHT;
          const scoreB =
            MOODS.reduce((sum, m) => sum + sliders[m.key] * b.mood[m.key], 0) +
            (b.jitter ?? 0) * JITTER_WEIGHT;
          return scoreB - scoreA;
        }),
    [games, seenIds, sliders],
  );
  // The 3 cards on screen
  const currentDeck = useMemo(() => ranked.slice(0, 3), [ranked]);

  // Load the cover images of the next few cards ahead of time, so each card
  // that moves up already has its image and appears instantly
  const preloaded = useRef(new Set<string>());
  useEffect(() => {
    for (const game of ranked.slice(0, 3 + PRELOAD_AHEAD)) {
      const url = game.header_url;
      if (!url || preloaded.current.has(url)) continue;
      preloaded.current.add(url);
      const img = new window.Image();
      img.src = url;
      img.decode().catch(() => {});
    }
  }, [ranked]);

  const currentGame = currentDeck[0] || null;

  // Handler: marks the top card as seen, and saves it if the user liked it
  const handleSwipe = (liked: boolean) => {
    if (!currentGame) return;
    setDirection(liked ? 1 : -1);
    // Create a new Set instead of changing the old one, so React sees the update
    setSeenIds((prev) => new Set(prev).add(currentGame.steam_app_id));
    if (liked) setSavedGames((prev) => [...prev, currentGame]);
  };

  const handleReset = () => {
    setSeenIds(new Set());
  };

  return (
    <div
      className="mx-auto max-w-md px-4 py-8 font-serif text-amber-950 dark:text-amber-50"
      style={{ "--s": layout.scale } as CSSProperties}
    >
      {/* Console: sized from cardScale.ts. The pixel buttons are positioned
          from this box's top-left corner, so they must live inside it. The
          deck is drawn back to front, top card on top. flex + shrink-0 keeps
          it centered even though it is wider than the column. */}
      <div className="flex justify-center">
        <div
          className="relative shrink-0"
          style={{
            width: CARD_W,
            // on phones the buttons sit under the card, so reserve their row
            height: layout.narrow ? `calc(${CARD_H} + ${px(110)})` : CARD_H,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{ width: CARD_W, height: CARD_H }}
          >
            {/* Each card is a direct child of AnimatePresence, so the card that
              leaves plays its exit animation. custom tells it which way to fly. */}
            <AnimatePresence custom={direction}>
              {currentDeck.map((game, index) => (
                <SwipeCard
                  key={game.steam_app_id}
                  game={game}
                  onSwipe={handleSwipe}
                  index={index}
                  totalCards={currentDeck.length}
                />
              ))}
            </AnimatePresence>

            {/* Empty state: the same panel, with the message inside */}
            {!currentGame && (
              <div
                className="absolute inset-0 bg-black"
                style={{ padding: px(3), clipPath: NOTCH }}
              >
                <div
                  className="flex h-full flex-col items-center justify-center gap-6 bg-[#8ebdff] p-5 text-center"
                  style={{ clipPath: NOTCH }}
                >
                  <p
                    className={`${jersey.className} leading-tight text-black`}
                    style={{ fontSize: px(20) }}
                  >
                    You've seen every game in the deck!
                  </p>
                  <button
                    onClick={handleReset}
                    className={`${pressStart.className} flex items-center gap-2 border-4 border-black bg-[#ff4b6b] px-3 py-2 text-[10px] text-black active:translate-x-0.5 active:translate-y-0.5`}
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pixel buttons: green = pass, orange = save, the rest are decorative */}
          {currentGame && (
            <PixelButtons
              narrow={layout.narrow}
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
// One card: the same panel style as the expanded view (black notched outline,
// light-blue body). Only the top card is draggable; the two behind it show
// just the panel, with their contents hidden until they move up.
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
  const isTop = index === 0;

  // x follows the finger; tilt and the SAVE / PASS stamps are derived from it
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacityLike = useTransform(x, [10, 100], [0, 1]);
  const opacityNope = useTransform(x, [-10, -100], [0, 1]);

  // Cards behind the top one are smaller and lower, which makes the stack.
  // 30+ keeps every card above the pixel buttons (z-20) while it moves.
  const scale = 1 - index * 0.05;
  const yOffset = index * 12;
  const zIndex = 30 + totalCards - index;

  // A long drag or a quick flick counts as a swipe; otherwise the card
  // springs back (dragSnapToOrigin)
  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (info.offset.x > 100 || info.velocity.x > 600) onSwipe(true);
    else if (info.offset.x < -100 || info.velocity.x < -600) onSwipe(false);
  };

  return (
    <motion.div
      initial={{ scale, y: yOffset }}
      animate={{ scale, y: yOffset }}
      variants={{
        // dir comes from AnimatePresence's custom prop: 1 = right, -1 = left
        exit: (dir: number) => ({
          x: dir * 700,
          opacity: 0,
          zIndex: 60,
          transition: { duration: 0.26, ease: "easeIn" },
        }),
      }}
      exit="exit"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex,
        // pan-y: the browser keeps vertical scrolling, we get horizontal drags
        touchAction: "pan-y",
        // Draw the card on its own layer so moving it doesn't repaint it
        willChange: "transform",
      }}
      drag={isTop ? "x" : false}
      dragElastic={1}
      dragMomentum={false}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* Black outer shape + light-blue inner shape, both with notched corners */}
      <div
        className="h-full w-full bg-black"
        style={{ padding: px(3), clipPath: NOTCH }}
      >
        <div
          className="relative flex h-full flex-col bg-[#8ebdff] p-5"
          style={{ clipPath: NOTCH }}
        >
          <div
            className="flex h-full flex-col"
            style={{ visibility: isTop ? "visible" : "hidden" }}
          >
            {/* Cover image. The box has Steam's header aspect ratio, so the whole
                image shows with no cropping and the space is reserved while it loads */}
            <div
              className="relative w-full shrink-0 border-4 border-black"
              style={{ backgroundColor: game.bg, aspectRatio: "460 / 215" }}
            >
              {game.header_url && (
                <img
                  src={game.header_url}
                  alt={game.title}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            {/* SAVE and PASS stamps: only on the top card */}
            {isTop && (
              <>
                <motion.div
                  style={{ opacity: opacityLike }}
                  className={`${pressStart.className} pointer-events-none absolute right-8 top-10 z-10 rotate-12 border-4 border-black bg-[#3dff6e] px-2 py-1 text-xs text-black`}
                >
                  SAVE
                </motion.div>
                <motion.div
                  style={{ opacity: opacityNope }}
                  className={`${pressStart.className} pointer-events-none absolute left-8 top-10 z-10 -rotate-12 border-4 border-black bg-[#ff4b6b] px-2 py-1 text-xs text-black`}
                >
                  PASS
                </motion.div>
              </>
            )}

            <h3
              className={`${pressStart.className} mt-4 line-clamp-2 text-black`}
              style={{ fontSize: px(10), lineHeight: px(14) }}
            >
              {game.title}
            </h3>
            <p
              className={`${jersey.className} mt-1 line-clamp-1 text-black/70`}
              style={{ fontSize: px(15), lineHeight: px(15) }}
            >
              {Array.isArray(game.genres)
                ? game.genres.join(", ")
                : game.genres}{" "}
              • {game.year}
            </p>
            <p
              className={`${jersey.className} mt-2 line-clamp-5 text-black`}
              style={{ fontSize: px(15), lineHeight: px(15) }}
            >
              {game.summary}
            </p>

            {/* Mood tags on the left, Metacritic score square on the right */}
            <div className="mt-auto flex items-end justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {MOODS.filter((m) => game.mood[m.key] >= 4).map((m) => (
                  <span
                    key={m.key}
                    className="inline-block bg-black"
                    style={{ padding: px(3), clipPath: NOTCH }}
                  >
                    <span
                      className={`${jersey.className} block bg-[#cfe3ff] text-black`}
                      style={{
                        fontSize: px(13),
                        lineHeight: px(17),
                        padding: `0 ${px(6)}`,
                        clipPath: NOTCH,
                      }}
                    >
                      {m.label}
                    </span>
                  </span>
                ))}
              </div>
              <span
                className="inline-block shrink-0 bg-black"
                style={{ padding: px(3), clipPath: NOTCH }}
              >
                <span
                  className={`${pressStart.className} flex items-center justify-center text-black`}
                  style={{
                    width: px(59),
                    height: px(59),
                    fontSize: px(
                      game.metacritic != null && game.metacritic >= 100
                        ? 14
                        : 20,
                    ),
                    backgroundColor:
                      game.metacritic != null
                        ? scoreColor(game.metacritic)
                        : "#cfe3ff",
                    clipPath: NOTCH,
                  }}
                >
                  {game.metacritic ?? "--"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
