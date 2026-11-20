"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Game } from "./Gamematch";
import { jersey, pressStart } from "./fonts";
import { NOTCH, px, scoreColor } from "./cardScale";

type Props = {
  game: Game;
  onClose: () => void;
};

// A button in the same style as the card's pill buttons: notched pixel corners,
// black border and a hard drop shadow. Renders a link when given an href.
function PixelPill({
  color,
  href,
  onClick,
  children,
}: {
  color: string;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "relative inline-block cursor-pointer active:translate-x-0.5 active:translate-y-0.5";
  const style = { paddingRight: px(6), paddingBottom: px(6) };
  const content = (
    <>
      {/* The shadow is the same shape, shifted down and to the right */}
      <span
        aria-hidden
        className="absolute bg-black"
        style={{
          left: px(6),
          top: px(6),
          right: 0,
          bottom: 0,
          clipPath: NOTCH,
        }}
      />
      <span
        className="relative block bg-black"
        style={{ padding: px(3), clipPath: NOTCH }}
      >
        <span
          className={`${pressStart.className} block text-xs text-black`}
          style={{
            backgroundColor: color,
            padding: `${px(8)} ${px(12)}`,
            clipPath: NOTCH,
          }}
        >
          {children}
        </span>
      </span>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}

// The expanded view of one game: bigger image, full description, score, price
// and a link to the Steam store page. Same pixel style as the card.
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
      {/* Black outer shape + light-blue inner shape, both with notched corners */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={game.title}
        className="w-full max-w-xl bg-black"
        style={{ padding: px(3), clipPath: NOTCH }}
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[88vh] flex-col bg-[#8ebdff]"
          style={{ clipPath: NOTCH }}
        >
          <div className="overflow-y-auto p-5">
          {game.header_url && (
            <img
              src={game.header_url}
              alt={game.title}
              className="w-full border-4 border-black"
            />
          )}

          <h2
            className={`${pressStart.className} mt-4 text-base leading-6 text-black`}
          >
            {game.title}
          </h2>
          <p className={`${jersey.className} mt-1 text-xl text-black/70`}>
            {genres} • {game.year}
          </p>

          {/* Score and price */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {game.metacritic != null && (
              <span
                className={`${pressStart.className} flex items-center gap-2 border-4 border-black bg-[#cfe3ff] px-2 py-1 text-[10px] text-black`}
              >
                METACRITIC
                <span
                  className="border-2 border-black px-1.5 py-0.5"
                  style={{ backgroundColor: scoreColor(game.metacritic) }}
                >
                  {game.metacritic}
                </span>
              </span>
            )}
            {price && (
              <span
                className={`${pressStart.className} border-4 border-black bg-[#cfe3ff] px-2 py-1 text-[10px] text-black`}
              >
                {price}
              </span>
            )}
          </div>

          {/* Full description, or the short one while loading or if Steam fails */}
          <h3 className={`${pressStart.className} mt-5 text-[10px] text-black`}>
            ABOUT
          </h3>
          <p
            className={`${jersey.className} mt-2 whitespace-pre-line text-xl leading-6 text-black`}
          >
            {description ?? game.summary}
          </p>
          {loading && (
            <p className={`${jersey.className} mt-1 text-lg text-black/60`}>
              Loading full description...
            </p>
          )}

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {game.tags.slice(0, 10).map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-black"
                  style={{ padding: px(3), clipPath: NOTCH }}
                >
                  <span
                    className={`${jersey.className} block bg-[#cfe3ff] px-2 text-lg leading-5 text-black`}
                    style={{ clipPath: NOTCH }}
                  >
                    {tag}
                  </span>
                </span>
              ))}
            </div>
          )}

          </div>

          {/* Buttons stay visible while the description scrolls */}
          <div className="flex flex-wrap items-center gap-4 border-t-4 border-black px-5 pb-1 pt-4">
            <PixelPill color="#ff6b2c" href={storeUrl}>
              BUY ON STEAM
            </PixelPill>
            <PixelPill color="#ff4d68" onClick={onClose}>
              CLOSE
            </PixelPill>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
