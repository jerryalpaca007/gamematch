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
  animate,
  AnimatePresence,
} from "framer-motion";
import { RotateCcw } from "lucide-react";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import ActionButtons from "./ActionButtons";
import GameDetails from "./GameDetails";
import { useRouter } from "next/navigation";
import { readSavedIds, writeSavedIds } from "@/app/lib/saved";
import Pile, { PileList } from "./GamePiles";
import GameFullView from "./GameFullView";
import { uiFont, displayFont } from "./fonts";
import CardFace from "./CardFace";
import { MOODS, type MoodScores } from "./moods";
import { S, px, CARD_W, CARD_H } from "./cardScale";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

// ---------- Types ----------
// A type describes the shape of data, so TypeScript can catch mistakes.

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
  // hardware needs from Steam's minimum requirements (null = not known)
  min_ram_gb?: number | null;
  min_graphics?: string | null;
  integrated_ok?: boolean | null;
  jitter?: number; // random 0-1, picked once per page load, so the deck order varies
}

// How much the random bonus can move a game in the ranking. A game's mood
// score is roughly 20-60, so this mixes things up without ignoring the sliders.
const JITTER_WEIGHT = 25;

const DEFAULT_GAMES: Game[] = [];

// How many cards beyond the 3 on screen get their image loaded in advance
const PRELOAD_AHEAD = 6;

// Below this screen width there is no room for buttons beside the card
const NARROW_BELOW = 770;

// From this screen width the saved pile sits beside the card;
// narrower screens centre it underneath
const WIDE_FROM = 1200;

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
  // The game shown full size (replaces the swipe console until you go back)
  const [fullGame, setFullGame] = useState<Game | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [savedGames, setSavedGames] = useState<Game[]>([]);
  // true once saved games from earlier visits are loaded (so we never write an
  // empty list over them)
  const [savedReady, setSavedReady] = useState(false);
  const router = useRouter();
  // Which pile's full list is open, if any
  const [pileOpen, setPileOpen] = useState<"saved" | null>(null);
  // The swipe in progress: which game is flying off and which way (1 = right,
  // -1 = left). The game only counts as seen once it has finished leaving.
  const [leaving, setLeaving] = useState<{ id: number; dir: 1 | -1 } | null>(
    null,
  );
  // Size of the console: full size on desktop, shrunk to fit the card on phones
  const [layout, setLayout] = useState({
    scale: S,
    narrow: false,
    wide: false,
  });
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
      setLayout({
        narrow,
        // room for a pile on each side of the card
        wide: w >= WIDE_FROM,
        scale: narrow ? Math.min(S, (w - 24) / 335) : S,
      });
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
          const all: Game[] = steamGames.map((g) => ({
            ...enrichGameData(g),
            jitter: Math.random(),
          }));
          setGames(all);
          // Bring back games saved on earlier visits, and don't offer them again
          const byId = new Map(all.map((g) => [g.steam_app_id, g]));
          const restored = readSavedIds()
            .map((id) => byId.get(id))
            .filter((g): g is Game => g !== undefined);
          setSavedGames(restored);
          setSeenIds(new Set(restored.map((g) => g.steam_app_id)));
          setSavedReady(true);
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

  // Remember the saved games in this browser, for the Library page
  useEffect(() => {
    if (savedReady) writeSavedIds(savedGames.map((g) => g.steam_app_id));
  }, [savedGames, savedReady]);

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

  // Step 1: a drag, flick or button press asks the top card to fly away.
  // Nothing changes in the deck yet, so the next game stays visible behind it.
  const requestSwipe = (liked: boolean) => {
    if (!currentGame || leaving) return;
    setLeaving({ id: currentGame.steam_app_id, dir: liked ? 1 : -1 });
  };

  // Step 2: the card has fully left the screen. Now it counts as seen (and is
  // saved if liked), and the next card moves up.
  const commitSwipe = () => {
    if (!leaving) return;
    const game = games.find((g) => g.steam_app_id === leaving.id);
    // Create a new Set instead of changing the old one, so React sees the update
    setSeenIds((prev) => new Set(prev).add(leaving.id));
    if (game && leaving.dir === 1) setSavedGames((prev) => [...prev, game]);
    setLeaving(null);
  };

  const handleReset = () => {
    setSeenIds(new Set());
    setSavedGames([]);
  };

  return (
    <>
      {/* Hidden, not removed, while a game is full size: the deck stays exactly as
        you left it */}
      <div
        className={`mx-auto max-w-md px-4 py-8 font-serif text-amber-950 dark:text-amber-50 ${fullGame ? "hidden" : ""}`}
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
              // room under the card for the phone button row and/or the piles
              height: layout.wide
                ? CARD_H
                : layout.narrow
                  ? `calc(${CARD_H} + ${px(350)})`
                  : `calc(${CARD_H} + ${px(270)})`,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{ width: CARD_W, height: CARD_H }}
            >
              {/* The deck, drawn back to front. Every card shows its contents, so
                the next game is visible behind the one being swiped. */}
              {currentDeck.map((game, index) => (
                <SwipeCard
                  key={game.steam_app_id}
                  game={game}
                  index={index}
                  totalCards={currentDeck.length}
                  leaving={
                    leaving?.id === game.steam_app_id ? leaving.dir : null
                  }
                  onRequestSwipe={requestSwipe}
                  onCommit={commitSwipe}
                />
              ))}

              {/* Empty state: a window with the message inside */}
              {!currentGame && (
                <RetroWindow
                  title="GameMatch.exe"
                  className="absolute inset-0 flex flex-col"
                  bodyClassName="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center"
                >
                  <p
                    className={`${uiFont.className} leading-tight text-[#ece9ff]`}
                    style={{ fontSize: px(20) }}
                  >
                    {loading
                      ? "Loading games..."
                      : "You've seen every game in the deck!"}
                  </p>
                  {!loading && (
                    <RetroButton variant="magenta" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4" /> Reset
                    </RetroButton>
                  )}
                </RetroWindow>
              )}
            </div>

            {/* Pixel buttons: green = pass, orange = save, the rest are decorative */}
            {currentGame && (
              <ActionButtons
                narrow={layout.narrow}
                onPass={() => requestSwipe(false)}
                onLike={() => requestSwipe(true)}
                onView={() => currentGame && setViewing(currentGame)}
              />
            )}

            {/* The saved pile. Wide screens: beside the card. Otherwise: centred
              under the card (and under the button row on phones). x and y are
              design units from the card's top-left corner. */}
            <Pile
              label="SAVED"
              games={savedGames}
              accent="#4fe3f0"
              x={layout.wide ? 477 : 75}
              y={layout.wide ? 110 : layout.narrow ? 600 : 520}
              onClick={() => setPileOpen("saved")}
              onMaximize={() => router.push("/library")}
            />
          </div>
        </div>

        <AnimatePresence>
          {pileOpen && (
            <PileList
              title="SAVED"
              games={savedGames}
              onOpen={(game) => {
                setPileOpen(null);
                setViewing(game);
              }}
              onClose={() => setPileOpen(null)}
              onMaximize={() => router.push("/library")}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {viewing && (
            <GameDetails
              game={viewing}
              onClose={() => setViewing(null)}
              onMaximize={() => {
                setFullGame(viewing);
                setViewing(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {fullGame && (
        <div className="px-3 md:px-6">
          <RetroWindow
            title={`${fullGame.title} - GameMatch`}
            className="mx-auto max-w-6xl"
            bodyClassName="p-3 md:p-4"
          >
            <GameFullView
              game={fullGame}
              backLabel="Back to GameMatch"
              onBack={() => setFullGame(null)}
            />
          </RetroWindow>
        </div>
      )}
    </>
  );
}

// ---------- Swipe card ----------
// One card: the same panel style as the expanded view (black notched outline,
// light-blue body). Only the top card is draggable. The cards behind it show
// their contents too, so the next game is visible as the top card moves away.
function SwipeCard({
  game,
  index = 0,
  totalCards = 1,
  leaving,
  onRequestSwipe,
  onCommit,
}: {
  game: Game;
  index?: number;
  totalCards?: number;
  // 1 or -1 while this card is flying off the screen, otherwise null
  leaving: 1 | -1 | null;
  onRequestSwipe: (liked: boolean) => void;
  onCommit: () => void;
}) {
  const isTop = index === 0;

  // x follows the finger; tilt, fade and the SAVE / PASS stamps are derived from it
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const fade = useTransform(x, [-600, -250, 0, 250, 600], [0, 1, 1, 1, 0]);
  const opacityLike = useTransform(x, [10, 100], [0, 1]);
  const opacityNope = useTransform(x, [-10, -100], [0, 1]);

  // Cards behind the top one are smaller and lower, which makes the stack.
  // 30+ keeps every card above the pixel buttons (z-20) while it moves.
  const scale = 1 - index * 0.05;
  const yOffset = index * 12;
  const zIndex = 30 + totalCards - index;

  // When asked to leave, slide off the screen from wherever the card is now,
  // and only then tell the deck (onCommit). A ref keeps the latest onCommit.
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    if (leaving === null) return;
    const controls = animate(x, leaving * 700, {
      duration: 0.26,
      ease: "easeIn",
      onComplete: () => commitRef.current(),
    });
    return () => controls.stop();
  }, [leaving, x]);

  // A long drag or a quick flick asks for a swipe; otherwise the card springs back
  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (info.offset.x > 100 || info.velocity.x > 600) onRequestSwipe(true);
    else if (info.offset.x < -100 || info.velocity.x < -600)
      onRequestSwipe(false);
    else animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
  };

  return (
    <motion.div
      initial={{ scale, y: yOffset }}
      animate={{ scale, y: yOffset }}
      // when a card moves up the stack it springs into place
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? fade : 1,
        zIndex,
        // pan-y: the browser keeps vertical scrolling, we get horizontal drags
        touchAction: "pan-y",
        // Draw the card on its own layer so moving it doesn't repaint it
        willChange: "transform",
      }}
      drag={isTop && leaving === null ? "x" : false}
      dragElastic={1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <CardFace game={game}>
        {/* SAVE and PASS stamps: only on the top card */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: opacityLike }}
              className={`${displayFont.className} pointer-events-none absolute right-8 top-10 z-10 rotate-12 retro-raised bg-[#31e08a] px-2 py-1 text-xs text-[#14122b]`}
            >
              SAVE
            </motion.div>
            <motion.div
              style={{ opacity: opacityNope }}
              className={`${displayFont.className} pointer-events-none absolute left-8 top-10 z-10 -rotate-12 retro-raised bg-[#d62fb8] px-2 py-1 text-xs text-white`}
            >
              PASS
            </motion.div>
          </>
        )}
      </CardFace>
    </motion.div>
  );
}
