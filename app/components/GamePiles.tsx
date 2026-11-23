"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "./Gamematch";
import { uiFont, displayFont } from "./fonts";
import { CARD_W, CARD_H, px, scoreColor } from "./cardScale";
import CardFace from "./CardFace";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

// How much smaller a card in the pile is than the card you swipe
const MINI = 0.38;

// A small window holding a pile of the most recent cards (passed or saved), with
// a count in its title bar. Clicking it opens the full list. x and y are design
// units from the card's top-left corner, like the buttons.
export default function Pile({
  label,
  games,
  accent,
  x,
  y,
  onClick,
}: {
  label: string;
  games: Game[];
  accent: string;
  x: number;
  y: number;
  onClick: () => void;
}) {
  const shown = games.slice(-3); // the last one is on top
  const empty = games.length === 0;

  return (
    <div
      role="button"
      tabIndex={empty ? -1 : 0}
      aria-disabled={empty}
      aria-label={`${label}: ${games.length}. Open the list`}
      onClick={() => !empty && onClick()}
      onKeyDown={(e) => {
        if (!empty && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      className={`absolute z-10 ${empty ? "cursor-default" : "cursor-pointer active:translate-y-px"}`}
      style={{ left: px(x), top: px(y), width: px(152) }}
    >
      <RetroWindow
        title={`${label} (${games.length})`}
        maximizable={label === "SAVED"}
      >
        <div
          className="relative"
          style={{
            height: px(MINI * 488 + 18),
            borderBottom: `3px solid ${accent}`,
          }}
        >
          {empty && (
            <span
              className={`${uiFont.className} absolute inset-0 flex items-center justify-center text-sm text-[#a9a3e3]`}
            >
              empty
            </span>
          )}
          <AnimatePresence>
            {shown.map((g, i) => (
              <motion.span
                key={g.steam_app_id}
                className="pointer-events-none absolute block"
                style={{
                  left: px(10 + i * 3),
                  top: px(10 + i * 3),
                  width: px(MINI * 335),
                  height: px(MINI * 488),
                }}
                initial={{ scale: 0.4, opacity: 0, y: -50 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  // a steady tilt per game, so the pile looks hand-stacked
                  rotate: (g.steam_app_id % 7) - 3,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                {/* The real card, drawn at full size and shrunk */}
                <span
                  className="absolute left-0 top-0 block origin-top-left"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    transform: `scale(${MINI})`,
                  }}
                >
                  <CardFace game={g} />
                </span>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </RetroWindow>
    </div>
  );
}

// The full list for one pile, newest first. Clicking a game opens its details.
export function PileList({
  title,
  games,
  onOpen,
  onClose,
}: {
  title: string;
  games: Game[];
  onOpen: (game: Game) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const newestFirst = [...games].reverse();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <RetroWindow
          title={`${title} (${games.length})`}
          onClose={onClose}
          maximizable={title === "SAVED"}
          bodyClassName="flex max-h-[80vh] flex-col"
        >
          <ul className="flex-1 space-y-2 overflow-y-auto p-3">
            {newestFirst.map((g) => (
              <li key={g.steam_app_id}>
                <button
                  type="button"
                  onClick={() => onOpen(g)}
                  className="retro-raised flex w-full items-center gap-3 bg-[#a9a3e3] p-2 text-left active:translate-x-px active:translate-y-px"
                >
                  <span
                    className="retro-inset relative block w-24 shrink-0 bg-black"
                    style={{ aspectRatio: "460 / 215" }}
                  >
                    {g.header_url && (
                      <img
                        src={g.header_url}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span
                    className={`${uiFont.className} min-w-0 flex-1 truncate text-lg font-bold leading-6 text-[#14122b]`}
                  >
                    {g.title}
                  </span>
                  {g.metacritic != null && (
                    <span
                      className={`${displayFont.className} shrink-0 rounded-full border-2 border-[#14122b] px-2 py-1 text-[10px] font-bold text-[#14122b]`}
                      style={{ backgroundColor: scoreColor(g.metacritic) }}
                    >
                      {g.metacritic}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex justify-center border-t-2 border-[#1b1a24] px-4 py-3">
            <RetroButton variant="white" onClick={onClose}>
              Close
            </RetroButton>
          </div>
        </RetroWindow>
      </motion.div>
    </motion.div>
  );
}
