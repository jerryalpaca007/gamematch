"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Game } from "@/app/lib/types";
import { uiFont, displayFont } from "./fonts";
import { scoreColor } from "./cardScale";
import { useGameInfo } from "@/app/lib/useGameInfo";
import SteamDescription from "./SteamDescription";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

type Props = {
  game: Game;
  onClose: () => void;
  // when given, the window's maximize square opens the full page for this game
  onMaximize?: () => void;
};

// The expanded view of one game: bigger image, full description, score, price
// and a link to the Steam store page, in a retro window.
export default function GameDetails({ game, onClose, onMaximize }: Props) {
  const { info, loading } = useGameInfo(game.steam_app_id);
  const { description, price } = info;

  const storeUrl = `https://store.steampowered.com/app/${game.steam_app_id}`;

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const genres = game.genres.join(", ");

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
        aria-label={game.title}
        className="w-full max-w-xl"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <RetroWindow
          title={`${game.title} - GameMatch Browser`}
          onClose={onClose}
          maximizable={!!onMaximize}
          onMaximize={onMaximize}
          bodyClassName="flex max-h-[80vh] flex-col"
        >
          <div className="overflow-y-auto p-4">
            {/* The cover sits in a black "screen", like the globes in the reference */}
            <div className="retro-inset bg-black p-1.5">
              {game.header_url && (
                <img
                  src={game.header_url}
                  alt={game.title}
                  className="w-full"
                />
              )}
            </div>

            <h2
              className={`${displayFont.className} retro-glitch mt-4 text-2xl font-bold leading-8 text-white`}
            >
              {game.title}
            </h2>
            <p className={`${uiFont.className} mt-1 text-lg text-[#a9a3e3]`}>
              {genres} • {game.year}
            </p>

            {/* Score and price */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {game.metacritic != null && (
                <span
                  className={`${uiFont.className} retro-raised flex items-center gap-2 bg-[#a9a3e3] px-2 py-1 text-sm text-[#14122b]`}
                >
                  METACRITIC
                  <span
                    className="border-2 border-[#14122b] px-1.5 py-0.5"
                    style={{ backgroundColor: scoreColor(game.metacritic) }}
                  >
                    {game.metacritic}
                  </span>
                </span>
              )}
              {price && (
                <span
                  className={`${uiFont.className} retro-raised bg-[#a9a3e3] px-2 py-1 text-sm text-[#14122b]`}
                >
                  {price}
                </span>
              )}
            </div>

            {/* Full description, or the short one while loading or if Steam fails */}
            <h3
              className={`${displayFont.className} mt-5 text-xl text-[#4fe3f0]`}
            >
              ABOUT
            </h3>
            <div className="mt-2">
              <SteamDescription blocks={description} fallback={game.summary} />
            </div>
            {loading && (
              <p
                className={`${uiFont.className} mt-1 text-base text-[#a9a3e3]`}
              >
                Loading full description...
              </p>
            )}
          </div>

          {/* Buttons stay visible while the description scrolls */}
          <div className="flex flex-wrap items-center gap-3 border-t-2 border-[#1b1a24] px-4 py-3">
            <RetroButton variant="indigo" href={storeUrl} external>
              Buy on Steam
            </RetroButton>
            <RetroButton variant="white" onClick={onClose}>
              Close
            </RetroButton>
          </div>
        </RetroWindow>
      </motion.div>
    </motion.div>
  );
}
