"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import { removeGame, useSaved } from "@/app/lib/saved";
import { useUser } from "@/app/lib/auth";
import { SaveError } from "./SignInPrompt";
import type { Game } from "./Gamematch";
import CardFace from "./CardFace";
import GameDetails from "./GameDetails";
import GameFullView from "./GameFullView";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { uiFont, displayFont } from "./fonts";
import { CARD_W, CARD_H, scoreColor } from "./cardScale";

// A row of the deck holds this many cards; the next one starts a second row
const PER_ROW = 7;

// Cards in the library are drawn at this fraction of the design size
const DESKTOP_SCALE = 0.85;
// The selected-card window sits at the left edge of the screen from the lg
// breakpoint (1024px) up: 256px wide, or 320px from 2xl (1536px). It is pulled
// 12px into the page margin, so it takes (its width + 4px of gap) from the page
// area. The deck window stays centred, so the same room is kept on the right.
const panelRoom = (screen: number) => (screen >= 1536 ? 320 : 256) + 4;
// Width of a row of 7 cards that overlap by 58%, in card widths: 1 + 6 * 0.42
const ROW_CARDS_WIDE = 3.52;
// Window frame, body padding and the deck's own padding around the cards, in px
const CHROME = 100;

// Your saved games as a hand of trading cards inside a window. The cards
// overlap like a fanned deck; hover lifts one, click lifts and highlights it.
export default function LibraryView() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { ids, loading: savedLoading, error: saveError } = useSaved();
  // every game, loaded once, to turn the saved ids into cards
  const [catalog, setCatalog] = useState<Map<number, Game> | null>(null);
  // the picked card: undefined = the newest one, null = none
  const [picked, setSelected] = useState<number | null | undefined>(undefined);
  const [viewing, setViewing] = useState<Game | null>(null);
  // The game shown full size (replaces the deck until you go back)
  const [fullGame, setFullGame] = useState<Game | null>(null);
  const [scale, setScale] = useState(DESKTOP_SCALE);
  // The deck window's width on tablets and desktops (null on phones, where it
  // fills the screen). It depends only on the screen, never on how many cards
  // there are or whether the selected-card window is open, so nothing jumps.
  const [windowW, setWindowW] = useState<number | null>(null);

  // The page area the library lives in; its real width decides the card size
  const [area, setArea] = useState<HTMLDivElement | null>(null);

  // Shrink the cards on phones so one fits the window
  useEffect(() => {
    if (!area) return;
    const fit = () => {
      const w = Math.min(
        window.innerWidth,
        document.documentElement.clientWidth,
      );
      if (w < 768) {
        // phones: one card at a time, the deck scrolls sideways
        setScale(Math.min(DESKTOP_SCALE, (w - 80) / 335));
        setWindowW(null);
      } else {
        // a row of 7 overlapping cards is 3.52 cards wide; keep the side margins
        // free for the selected-card window when it sits beside the deck
        const room =
          area.clientWidth - (w >= 1024 ? 2 * panelRoom(w) : 0) - CHROME;
        const s = Math.min(DESKTOP_SCALE, room / (335 * ROW_CARDS_WIDE));
        setScale(s);
        setWindowW(Math.round(335 * s * ROW_CARDS_WIDE + CHROME));
      }
    };
    // fires on window resizes, zooming and any other change of the real width
    const watch = new ResizeObserver(fit);
    watch.observe(area);
    window.addEventListener("resize", fit);
    return () => {
      watch.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [area]);

  useEffect(() => {
    let cancelled = false;
    fetchGamesFromSupabase()
      .then((all) => {
        if (cancelled) return;
        setCatalog(
          new Map(all.map((g) => [g.steam_app_id, enrichGameData(g)])),
        );
      })
      .catch((error) => {
        console.error("Failed to load the library:", error);
        if (!cancelled) setCatalog(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // the saved games, in the order they were saved
  const saved = useMemo(
    () =>
      ids
        .map((id) => catalog?.get(id))
        .filter((g): g is Game => g !== undefined),
    [ids, catalog],
  );
  const loading = authLoading || savedLoading || catalog === null;
  const signedOut = !authLoading && !user;
  const selected =
    picked === null
      ? null
      : picked !== undefined && ids.includes(picked)
        ? picked
        : (saved[saved.length - 1]?.steam_app_id ?? null);

  const remove = (id: number) => {
    setSelected(undefined);
    void removeGame(id);
  };

  // the deck in rows of PER_ROW, in the order the games were saved
  const rows: Game[][] = [];
  for (let i = 0; i < saved.length; i += PER_ROW) {
    rows.push(saved.slice(i, i + PER_ROW));
  }

  const current = saved.find((g) => g.steam_app_id === selected) ?? null;

  const genres = current
    ? (Array.isArray(current.genres) ? current.genres : [current.genres]).join(
        " • ",
      )
    : "";

  // A game opened full size takes over the page, like on Browse and the main page
  if (fullGame) {
    return (
      <div className="mx-auto max-w-6xl">
        <RetroWindow
          title={`${fullGame.title} - Library.exe`}
          onClose={() => router.push("/")}
          bodyClassName="p-3 md:p-4"
        >
          <GameFullView
            game={fullGame}
            backLabel="Back to Library"
            onBack={() => setFullGame(null)}
          />
        </RetroWindow>
      </div>
    );
  }

  return (
    <div
      ref={setArea}
      className="relative flex w-full flex-col items-center gap-4"
    >
      {/* The window for the picked card: on the left of the deck, or above it on
          smaller screens. Its ✕ puts the card down again. */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.aside
            key={current.steam_app_id}
            aria-label="Selected game"
            className="w-full lg:absolute lg:-left-3 lg:top-0 lg:w-64 2xl:w-80"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
          >
            <RetroWindow
              title="Card.exe"
              onClose={() => setSelected(null)}
              bodyClassName="flex flex-col gap-4 p-4"
            >
              {current.header_url && (
                <div className="retro-inset bg-black p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={current.header_url} alt="" className="w-full" />
                </div>
              )}
              <h2
                className={`${displayFont.className} retro-glitch text-2xl font-bold leading-8 text-white`}
              >
                {current.title}
              </h2>
              <p className={`${uiFont.className} text-xl text-[#a9a3e3]`}>
                {genres} • {current.year}
              </p>
              {current.metacritic != null && (
                <div
                  className={`${uiFont.className} flex items-center gap-2 text-base text-[#ece9ff]`}
                >
                  METACRITIC
                  <span
                    className="border-2 border-[#14122b] px-1.5 py-0.5 text-[#14122b]"
                    style={{ backgroundColor: scoreColor(current.metacritic) }}
                  >
                    {current.metacritic}
                  </span>
                </div>
              )}
              <RetroButton
                variant="indigo"
                onClick={() => setViewing(current)}
                className="w-full !py-3 !text-lg"
              >
                View game
              </RetroButton>
              <RetroButton
                variant="magenta"
                onClick={() => remove(current.steam_app_id)}
                className="w-full !py-3 !text-lg"
              >
                Remove
              </RetroButton>
            </RetroWindow>
          </motion.aside>
        )}
      </AnimatePresence>

      <RetroWindow
        title="Library.exe - GameMatch"
        // the ✕ goes back to the swipe page
        onClose={() => router.push("/")}
        className="max-w-full lg:max-w-[calc(100%-520px)] 2xl:max-w-[calc(100%-648px)]"
        style={windowW ? { width: windowW } : { width: "100%" }}
        bodyClassName="p-3 md:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className={`${displayFont.className} text-xl text-[#4fe3f0]`}>
            YOUR DECK
          </h1>
          <span className={`${uiFont.className} text-base text-[#ece9ff]`}>
            {signedOut ? "" : loading ? "Loading..." : `${saved.length} saved`}
          </span>
        </div>

        {signedOut ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className={`${uiFont.className} text-lg text-[#a9a3e3]`}>
              Sign in to see your saved games.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <RetroButton variant="indigo" href="/login">
                Sign in
              </RetroButton>
              <RetroButton variant="magenta" href="/signup">
                Sign up
              </RetroButton>
            </div>
          </div>
        ) : !loading && saved.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className={`${uiFont.className} text-lg text-[#a9a3e3]`}>
              Your deck is empty. Save games on the swipe page and they will
              show up here.
            </p>
            <RetroButton variant="indigo" href="/">
              Start swiping
            </RetroButton>
          </div>
        ) : (
          <>
            {/* The deck: rows of up to 10 cards that overlap by half; scrolls sideways */}
            <div
              className="retro-inset isolate mt-3 overflow-x-auto bg-[#14122b] px-4 pb-4 pt-8"
              style={{ ["--s" as string]: scale }}
            >
              <div className="flex w-max flex-col gap-6 pr-4">
                {rows.map((row, r) => (
                  <ul key={r} className="flex">
                    {row.map((g, i) => {
                      const isSelected = g.steam_app_id === selected;
                      return (
                        <li
                          key={g.steam_app_id}
                          className="relative shrink-0"
                          style={{
                            width: CARD_W,
                            height: CARD_H,
                            marginLeft: i === 0 ? 0 : `calc(${CARD_W} * -0.58)`,
                            // keep the fan order, so cards to the right stay clickable
                            zIndex: i,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(g.steam_app_id)}
                            aria-label={`${g.title}${isSelected ? " (selected)" : ""}`}
                            className="block h-full w-full cursor-pointer text-left transition-transform duration-150 hover:-translate-y-3"
                            style={{
                              transform: isSelected
                                ? "translateY(-18px)"
                                : undefined,
                              filter: isSelected
                                ? "drop-shadow(0 0 10px #4fe3f0) drop-shadow(0 0 3px #4fe3f0)"
                                : "brightness(0.8)",
                            }}
                          >
                            <CardFace game={g} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
          </>
        )}
      </RetroWindow>

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
  );
}
