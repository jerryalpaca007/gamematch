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
import { AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import ActionButtons from "./ActionButtons";
import GameDetails from "./GameDetails";
import { useRouter } from "next/navigation";
import { saveGame, useSaved } from "@/app/lib/saved";
import { useUser } from "@/app/lib/auth";
import SignInPrompt, { SaveError } from "./SignInPrompt";
import Pile from "./GamePiles";
import GameFullView from "./GameFullView";
import { uiFont } from "./fonts";
import SwipeCard from "./SwipeCard";
import { MOODS } from "./moods";
import type { Game } from "@/app/lib/types";
import { S, px, CARD_W, CARD_H } from "./cardScale";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

// Ranking: a game scores its mood total times MOOD_WEIGHT (roughly 30-65), plus
// a random bonus of up to JITTER_WEIGHT so the order differs on every visit
const MOOD_WEIGHT = 3;
const JITTER_WEIGHT = 25;

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
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  // A Set is a fast way to ask "have I seen this game?"
  // The game shown in the expanded view, or null when it is closed
  const [viewing, setViewing] = useState<Game | null>(null);
  // The game shown full size (replaces the swipe console until you go back)
  const [fullGame, setFullGame] = useState<Game | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  // saved games belong to the account (lib/saved.ts), not to this page
  const { ids: savedIds, error: saveError } = useSaved();
  const { user, loading: authLoading } = useUser();
  // true while the "you need an account" window is open
  const [askSignIn, setAskSignIn] = useState(false);
  const router = useRouter();
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
        // room for the saved pile beside the card
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
          // Add mood and colour fields to each raw game
          const all: Game[] = steamGames.map((g) => ({
            ...enrichGameData(g),
            jitter: Math.random(),
          }));
          setGames(all);
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

  // The saved games, in the order they were saved (games not loaded yet are skipped)
  const savedGames = useMemo(() => {
    const byId = new Map(games.map((g) => [g.steam_app_id, g]));
    return savedIds
      .map((id) => byId.get(id))
      .filter((g): g is Game => g !== undefined);
  }, [games, savedIds]);

  // Every unseen game, best first. useMemo means the sort runs only when one of
  // these inputs changes, not on every render.
  const ranked = useMemo(() => {
    const score = (g: Game) =>
      MOODS.reduce((sum, m) => sum + g.mood[m.key], 0) * MOOD_WEIGHT +
      (g.jitter ?? 0) * JITTER_WEIGHT;
    return games
      .filter(
        (g) =>
          !seenIds.has(g.steam_app_id) && !savedIds.includes(g.steam_app_id),
      )
      .sort((a, b) => score(b) - score(a));
  }, [games, seenIds, savedIds]);
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
  // Returns false when the swipe is refused, so a dragged card can spring back.
  const requestSwipe = (liked: boolean): boolean => {
    if (!currentGame || leaving) return false;
    // saving needs an account; passing doesn't
    if (liked && !user) {
      if (!authLoading) setAskSignIn(true);
      return false;
    }
    setLeaving({ id: currentGame.steam_app_id, dir: liked ? 1 : -1 });
    return true;
  };

  // Step 2: the card has fully left the screen. Now it counts as seen (and is
  // saved if liked), and the next card moves up.
  const commitSwipe = () => {
    if (!leaving) return;
    // Create a new Set instead of changing the old one, so React sees the update
    setSeenIds((prev) => new Set(prev).add(leaving.id));
    if (leaving.dir === 1) void saveGame(leaving.id);
    setLeaving(null);
  };

  const handleReset = () => {
    // brings passed games back; saved games stay in the account
    setSeenIds(new Set());
  };

  return (
    <>
      {/* Hidden, not removed, while a game is full size: the deck stays exactly as
        you left it */}
      <div
        className={`mx-auto max-w-md px-4 py-8 ${fullGame ? "hidden" : ""}`}
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

              {/* Empty state: a window with the message inside. Nothing is shown while
                  the games are still loading. */}
              {!currentGame && !loading && (
                <RetroWindow
                  title="GameMatch.exe"
                  className="absolute inset-0 flex flex-col"
                  bodyClassName="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center"
                >
                  <p
                    className={`${uiFont.className} leading-tight text-[#ece9ff]`}
                    style={{ fontSize: px(20) }}
                  >
                    You&apos;ve seen every game in the deck!
                  </p>
                  <RetroButton variant="magenta" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </RetroButton>
                </RetroWindow>
              )}
            </div>

            {/* Pass, Save and View */}
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
              onClick={() => router.push("/library")}
            />
          </div>
        </div>

        <AnimatePresence>
          {askSignIn && <SignInPrompt onClose={() => setAskSignIn(false)} />}
        </AnimatePresence>
        <SaveError message={saveError} />

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
