"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "./Gamematch";
import { uiFont } from "./fonts";
import { CARD_W, CARD_H, px } from "./cardScale";
import CardFace from "./CardFace";
import RetroWindow from "./RetroWindow";

// How much smaller a card in the pile is than the card you swipe
const MINI = 0.38;
// The pile window is 184 design units wide (152 plus 16 on each side); inside it
// the cards sit in one tight overlapping row, like the Library's deck
const PILE_W = 184;
const PILE_ROOM = 152; // width the fan of cards may use
const MAX_SHOWN = 8; // only the newest cards are drawn
const MAX_STEP = 10; // gap between the left edges of neighbouring cards

// A small window holding the most recent saved cards, with a count in its title
// bar. Clicking anywhere on it runs onClick (the main page goes to the Library).
// x and y are design units from the card's top-left corner, like the buttons.
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
  const shown = games.slice(-MAX_SHOWN); // the newest one is on top, at the right
  // the left edges are STEP apart, shrinking so that every card fits in the window
  const miniW = MINI * 335;
  const step =
    shown.length > 1
      ? Math.min(MAX_STEP, (PILE_ROOM - miniW) / (shown.length - 1))
      : 0;
  const fanW = miniW + step * (shown.length - 1);
  const fanLeft = (PILE_W - 10 / 1.4 - fanW) / 2; // centred (10px of frame is not scaled)
  const empty = games.length === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${games.length}. Open the library`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className="absolute z-10 cursor-pointer active:translate-y-px"
      style={{ left: px(x), top: px(y), width: px(PILE_W) }}
    >
      <RetroWindow title={`${label} (${games.length})`}>
        <div
          className="relative overflow-hidden"
          style={{
            height: px(MINI * 488 + 18 + 32),
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
                  left: px(fanLeft + i * step),
                  top: px(7 + 16),
                  width: px(miniW),
                  height: px(MINI * 488),
                  zIndex: i,
                  // older cards are a little dimmer, like unselected cards in the Library
                  filter:
                    i === shown.length - 1 ? undefined : "brightness(0.8)",
                }}
                initial={{ scale: 0.4, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
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
