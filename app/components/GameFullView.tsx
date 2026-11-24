"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Game } from "./Gamematch";
import { uiFont, displayFont } from "./fonts";
import { scoreColor } from "./cardScale";
import RetroButton from "./RetroButton";
import RetroWindow from "./RetroWindow";
import MoodCard from "./MoodCard";

// A heading bar used for each section of the full view
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3
        className={`${displayFont.className} border-b-2 border-[#d62fb8] pb-1 text-[10px] text-[#4fe3f0]`}
      >
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

// The maximized game page. It replaces the contents of the Browse window, so
// the game feels like a page of the Browse app instead of a pop-up.
export default function GameFullView({
  game,
  onBack,
  backLabel = "Back to results",
}: {
  game: Game;
  onBack: () => void;
  // where Back goes: "Back to results" in Browse, "Back to GameMatch" on the swipe page
  backLabel?: string;
}) {
  const [description, setDescription] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shots, setShots] = useState<{ thumb: string; full: string }[]>([]);
  const [shot, setShot] = useState(0);
  // true while the big "Screenshot" window is open
  const [zoom, setZoom] = useState(false);
  const [reqs, setReqs] = useState<{ minimum: string | null; recommended: string | null }>({
    minimum: null,
    recommended: null,
  });
  const [makers, setMakers] = useState<string[]>([]);

  const storeUrl = `https://store.steampowered.com/app/${game.steam_app_id}`;
  const genres = Array.isArray(game.genres) ? game.genres : [game.genres];

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/game/${game.steam_app_id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.description) setDescription(data.description);
        if (data?.price) setPrice(data.price);
        if (data?.screenshots) setShots(data.screenshots);
        if (data?.requirements) setReqs(data.requirements);
        if (data?.developers) setMakers(data.developers);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [game.steam_app_id]);

  // Start at the top of the page, and let Escape go back
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => {
      // Escape closes the screenshot window first, then leaves the page
      if (e.key === "Escape" && !zoom) onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, zoom]);

  // Keys inside the screenshot window: Escape closes, arrows flip through
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") setShot((i) => (i - 1 + shots.length) % shots.length);
      if (e.key === "ArrowRight") setShot((i) => (i + 1) % shots.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, shots.length]);

  const badge = `${displayFont.className} retro-raised flex items-center gap-2 bg-[#a9a3e3] px-2 py-1 text-[10px] text-[#14122b]`;
  const hasHardware =
    game.min_ram_gb != null || !!game.min_graphics || game.integrated_ok != null;

  return (
    <div>
      <RetroButton variant="white" onClick={onBack}>
        ◄ {backLabel}
      </RetroButton>

      <h2
        className={`${displayFont.className} retro-glitch mt-4 text-lg font-bold leading-7 text-white`}
      >
        {game.title}
      </h2>
      <p className={`${uiFont.className} mt-1 text-lg text-[#a9a3e3]`}>
        {genres.join(" • ")} • {game.year}
      </p>
      {makers.length > 0 && (
        <p className={`${uiFont.className} text-base text-[#a9a3e3]`}>
          By {makers.join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {game.metacritic != null && (
          <span className={badge}>
            METACRITIC
            <span
              className="border-2 border-[#14122b] px-1.5 py-0.5"
              style={{ backgroundColor: scoreColor(game.metacritic) }}
            >
              {game.metacritic}
            </span>
          </span>
        )}
        {price && <span className={badge}>{price}</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <RetroButton variant="indigo" href={storeUrl} external>
          Buy on Steam
        </RetroButton>
        <RetroButton variant="white" onClick={onBack}>
          Close
        </RetroButton>
      </div>


      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Left: cover, quick facts and the buy button */}
        <div>
          <div className="retro-inset bg-black p-1.5">
            {game.header_url && (
              <img src={game.header_url} alt={game.title} className="w-full" />
            )}
          </div>

          {shots.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setZoom(true)}
                aria-label="Open screenshot in a bigger window"
                className="retro-inset block w-full cursor-zoom-in bg-black p-1.5"
              >
                <img src={shots[shot].full} alt={`${game.title} screenshot ${shot + 1}`} className="w-full" />
              </button>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {shots.map((sh, i) => (
                  <button
                    key={sh.thumb}
                    type="button"
                    onClick={() => setShot(i)}
                    aria-label={`Screenshot ${i + 1}`}
                    className={`retro-inset cursor-pointer bg-black p-0.5 ${i === shot ? "outline-2 outline-[#4fe3f0]" : "opacity-70 hover:opacity-100"}`}
                  >
                    <img src={sh.thumb} alt="" className="w-full" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <Section title="MOOD">
            <MoodCard game={game} />
          </Section>
        </div>

        {/* Right: the written information */}
        <div className="min-w-0">
          <Section title="ABOUT">
            <p
              className={`${uiFont.className} whitespace-pre-line text-lg leading-6 text-[#ece9ff]`}
            >
              {description ?? game.summary}
            </p>
            {loading && (
              <p className={`${uiFont.className} mt-1 text-base text-[#a9a3e3]`}>
                Loading full description...
              </p>
            )}
          </Section>

          <Section title="SYSTEM REQUIREMENTS (MINIMUM)">
            {hasHardware ? (
              <dl
                className={`${uiFont.className} grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base text-[#ece9ff]`}
              >
                <dt className="text-[#a9a3e3]">Memory</dt>
                <dd>{game.min_ram_gb != null ? `${game.min_ram_gb} GB RAM` : "Not listed"}</dd>
                <dt className="text-[#a9a3e3]">Graphics</dt>
                <dd>{game.min_graphics || "Not listed"}</dd>
                <dt className="text-[#a9a3e3]">Integrated GPU</dt>
                <dd>
                  {game.integrated_ok == null
                    ? "Unknown"
                    : game.integrated_ok
                      ? "Probably runs"
                      : "Needs a dedicated card"}
                </dd>
              </dl>
            ) : (
              <p className={`${uiFont.className} text-base text-[#a9a3e3]`}>
                System requirements have not been added to the database yet.
              </p>
            )}
          </Section>

          {(reqs.minimum || reqs.recommended) && (
            <Section title="FULL SYSTEM SPECS">
              <div className="grid gap-3 sm:grid-cols-2">
                {([["Minimum", reqs.minimum], ["Recommended", reqs.recommended]] as const).map(
                  ([label, text]) =>
                    text && (
                      <div key={label} className="retro-inset bg-[#14122b] p-2">
                        <div className={`${displayFont.className} text-[9px] text-[#d62fb8]`}>
                          {label.toUpperCase()}
                        </div>
                        <p className={`${uiFont.className} mt-1 whitespace-pre-line text-sm leading-5 text-[#ece9ff]`}>
                          {text}
                        </p>
                      </div>
                    ),
                )}
              </div>
            </Section>
          )}

          {game.categories && game.categories.length > 0 && (
            <Section title="FEATURES">
              <ul className="flex flex-wrap gap-2">
                {game.categories.map((c) => (
                  <li
                    key={c}
                    className={`${uiFont.className} retro-raised bg-[#d6d3f5] px-2 py-0.5 text-sm text-[#14122b]`}
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {game.tags && game.tags.length > 0 && (
            <Section title="TAGS">
              <ul className="flex flex-wrap gap-2">
                {game.tags.map((t) => (
                  <li
                    key={t}
                    className={`${uiFont.className} retro-raised bg-[#a9a3e3] px-2 py-0.5 text-sm uppercase text-[#14122b]`}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className={`${uiFont.className} mt-5 text-sm text-[#a9a3e3]`}>
            Steam app #{game.steam_app_id}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {zoom && shots[shot] && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Screenshot"
              className="w-full max-w-5xl"
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <RetroWindow
                title={`Screenshot - ${game.title} (${shot + 1}/${shots.length})`}
                onClose={() => setZoom(false)}
                bodyClassName="p-2"
              >
                <div className="retro-inset bg-black p-1.5">
                  <img
                    src={shots[shot].full}
                    alt={`${game.title} screenshot ${shot + 1}`}
                    className="mx-auto max-h-[75vh] w-auto max-w-full"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <RetroButton
                    variant="white"
                    onClick={() => setShot((i) => (i - 1 + shots.length) % shots.length)}
                  >
                    ◄ Prev
                  </RetroButton>
                  <RetroButton
                    variant="white"
                    onClick={() => setShot((i) => (i + 1) % shots.length)}
                  >
                    Next ►
                  </RetroButton>
                </div>
              </RetroWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
