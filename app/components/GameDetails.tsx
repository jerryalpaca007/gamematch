"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Game } from "./Gamematch";
import { uiFont, displayFont } from "./fonts";
import { scoreColor } from "./cardScale";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

type Props = {
  game: Game;
  onClose: () => void;
};

// The expanded view of one game: bigger image, full description, score, price
// and a link to the Steam store page, in a retro window.
export default function GameDetails({ game, onClose }: Props) {
  const [description, setDescription] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const storeUrl = `https://store.steampowered.com/app/${game.steam_app_id}`;

  // Load the long description and price from our own API route
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/game/${game.steam_app_id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.description) setDescription(data.description);
        if (data?.price) setPrice(data.price);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [game.steam_app_id]);

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const genres = Array.isArray(game.genres)
    ? game.genres.join(", ")
    : game.genres;

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
          maximizable
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
              className={`${displayFont.className} retro-glitch mt-4 text-base font-bold leading-6 text-white`}
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
                  className={`${displayFont.className} retro-raised flex items-center gap-2 bg-[#a9a3e3] px-2 py-1 text-[10px] text-[#14122b]`}
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
                  className={`${displayFont.className} retro-raised bg-[#a9a3e3] px-2 py-1 text-[10px] text-[#14122b]`}
                >
                  {price}
                </span>
              )}
            </div>

            {/* Full description, or the short one while loading or if Steam fails */}
            <h3
              className={`${displayFont.className} mt-5 text-[10px] text-[#4fe3f0]`}
            >
              ABOUT
            </h3>
            <p
              className={`${uiFont.className} mt-2 whitespace-pre-line text-lg leading-6 text-[#ece9ff]`}
            >
              {description ?? game.summary}
            </p>
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
