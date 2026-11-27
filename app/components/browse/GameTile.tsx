"use client";

import type { Game } from "@/app/lib/types";
import PixelIcon from "../PixelIcon";
import { uiFont } from "../fonts";
import { scoreColor } from "../cardScale";

// One game in the Browse grid: click to open it, or save it
export default function GameTile({
  game,
  onOpen,
  saved,
  onSave,
}: {
  game: Game;
  onOpen: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  const { genres } = game;
  return (
    <div className="retro-raised flex flex-col bg-[#a9a3e3] p-1.5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${game.title}`}
        className="block text-left active:translate-x-px active:translate-y-px"
      >
        <span
          className="retro-inset relative block bg-black"
          style={{ aspectRatio: "460 / 215" }}
        >
          {game.header_url && (
            <img
              src={game.header_url}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </span>
        <span
          className={`${uiFont.className} mt-1.5 block truncate text-base font-bold leading-5 text-[#14122b]`}
        >
          {game.title}
        </span>
        <span
          className={`${uiFont.className} block truncate text-sm leading-4 text-[#3a3772]`}
        >
          {genres.slice(0, 3).join(" · ")} • {game.year}
        </span>
      </button>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span
            className={`${uiFont.className} flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#14122b] px-1 text-[13px] font-bold text-[#14122b]`}
            style={{
              backgroundColor:
                game.metacritic != null
                  ? scoreColor(game.metacritic)
                  : "#ece9ff",
            }}
          >
            {game.metacritic ?? "--"}
          </span>
          {game.min_ram_gb != null && (
            <span className={`${uiFont.className} text-[12px] text-[#14122b]`}>
              {game.min_ram_gb}GB
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onSave}
          aria-pressed={saved}
          aria-label={`${saved ? "Remove" : "Save"} ${game.title}`}
          className={`retro-btn ${saved ? "retro-btn-indigo" : "retro-btn-white"} !px-2 !py-0.5 text-xs`}
        >
          <PixelIcon
            name="star"
            color={saved ? "#ffffff" : "#14122b"}
            size="12px"
          />
          {saved ? "SAVED" : "SAVE"}
        </button>
      </div>
    </div>
  );
}
