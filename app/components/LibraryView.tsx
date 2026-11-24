"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import { readSavedIds, writeSavedIds } from "@/app/lib/saved";
import type { Game } from "./Gamematch";
import CardFace from "./CardFace";
import GameDetails from "./GameDetails";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { uiFont, displayFont } from "./fonts";
import { CARD_W, CARD_H, scoreColor } from "./cardScale";

// A row of the deck holds this many cards; the next one starts a second row
const PER_ROW = 10;

// Cards in the library are drawn at this fraction of the design size
const DESKTOP_SCALE = 0.85;
// The window's widest size in px, wide enough for a full row of 10 cards
const WINDOW_MAX = 1520;
// Width of a row of 10 cards that overlap by 58%, in card widths: 1 + 9 * 0.42
const ROW_CARDS_WIDE = 4.78;

// Your saved games as a hand of trading cards inside a window. The cards
// overlap like a fanned deck; hover lifts one, click lifts and highlights it.
export default function LibraryView() {
  const router = useRouter();
  const [saved, setSaved] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Game | null>(null);
  const [scale, setScale] = useState(DESKTOP_SCALE);

  // Shrink the cards on phones so one fits the window
  useEffect(() => {
    const fit = () => {
      const w = Math.min(window.innerWidth, document.documentElement.clientWidth);
      if (w < 768) {
        // phones: one card at a time, the deck scrolls sideways
        setScale(Math.min(DESKTOP_SCALE, (w - 80) / 335));
      } else {
        // a full row of 10 overlapping cards is 4.78 cards wide; leave about
        // 150px for the page margin, window frame and padding
        const room = Math.min(w, WINDOW_MAX) - 150;
        setScale(Math.min(DESKTOP_SCALE, room / (335 * ROW_CARDS_WIDE)));
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ids = readSavedIds();
        if (ids.length === 0) return;
        const all = await fetchGamesFromSupabase();
        if (cancelled) return;
        const byId = new Map(all.map((g) => [g.steam_app_id, g]));
        // keep the order they were saved in
        const games = ids
          .map((id) => byId.get(id))
          .filter((g): g is NonNullable<typeof g> => !!g)
          .map(enrichGameData);
        setSaved(games);
        setSelected(games.length ? games[games.length - 1].steam_app_id : null);
      } catch (error) {
        console.error("Failed to load the library:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = (id: number) => {
    const next = saved.filter((g) => g.steam_app_id !== id);
    setSaved(next);
    writeSavedIds(next.map((g) => g.steam_app_id));
    setSelected(next.length ? next[next.length - 1].steam_app_id : null);
  };

  // the deck in rows of PER_ROW, in the order the games were saved
  const rows: Game[][] = [];
  for (let i = 0; i < saved.length; i += PER_ROW) {
    rows.push(saved.slice(i, i + PER_ROW));
  }

  const current = saved.find((g) => g.steam_app_id === selected) ?? null;

  return (
    <>
      <RetroWindow
        title="Library.exe - GameMatch"
        // the ✕ goes back to the swipe page
        onClose={() => router.push("/")}
        className="mx-auto max-w-[1520px]"
        bodyClassName="p-3 md:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className={`${displayFont.className} text-xs text-[#4fe3f0]`}>
            YOUR DECK
          </h1>
          <span className={`${uiFont.className} text-base text-[#ece9ff]`}>
            {loading ? "Loading..." : `${saved.length} saved`}
          </span>
        </div>

        {!loading && saved.length === 0 ? (
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
                              transform: isSelected ? "translateY(-18px)" : undefined,
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

            {/* Actions for the picked-up card */}
            {current && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`${uiFont.className} min-w-0 flex-1 truncate text-lg text-white`}
                >
                  {current.title}
                </span>
                {current.metacritic != null && (
                  <span
                    className={`${uiFont.className} rounded-full border-2 border-[#14122b] px-2 py-0.5 text-sm font-bold text-[#14122b]`}
                    style={{ backgroundColor: scoreColor(current.metacritic) }}
                  >
                    {current.metacritic}
                  </span>
                )}
                <RetroButton variant="indigo" onClick={() => setViewing(current)}>
                  View game
                </RetroButton>
                <RetroButton
                  variant="magenta"
                  onClick={() => remove(current.steam_app_id)}
                >
                  Remove
                </RetroButton>
              </div>
            )}
          </>
        )}
      </RetroWindow>

      <AnimatePresence>
        {viewing && (
          <GameDetails game={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
