import type { Game } from "./Gamematch";
import { MOODS } from "./moods";
import { cardTier, moodTotal, USE_MOOD_TIERS } from "./moodTier";
import { uiFont, displayFont } from "./fonts";

// Same silver frame and ink colour as the swipe card (see CardFace.tsx)
const INK = "#14122b";

// A small trading card listing all five mood scores of a game, in the style of
// the card on the swipe page. Sized with plain CSS, so it fits any column.
export default function MoodCard({ game }: { game: Game }) {
  const total = moodTotal(game.mood);
  const tier = cardTier(game.mood);

  return (
    <div
      className="mx-auto max-w-[22rem] rounded-2xl p-3"
      style={{ background: tier.frame, boxShadow: `0 0 0 2px ${INK}, 0 0 18px rgba(214,47,184,0.35)` }}
    >
      <div
        className="overflow-hidden rounded-lg border-2"
        style={{ borderColor: INK, backgroundColor: game.bg }}
      >
        <div className="flex flex-col gap-3 p-4" style={{ background: `linear-gradient(${tier.tint}, ${tier.tint}), rgba(20,18,43,0.7)` }}>
          {/* Title bar: name on the left, total on the right */}
          <div
            className="flex items-center justify-between gap-2 rounded-md border-2 px-3 py-2"
            style={{ background: tier.bar, borderColor: INK }}
          >
            <span className={`${displayFont.className} text-xs font-bold text-[#14122b]`}>
              {USE_MOOD_TIERS ? `${tier.name.toUpperCase()} CARD` : "MOOD CARD"}
            </span>
            <span
              className={`${displayFont.className} flex h-8 min-w-8 items-center justify-center rounded-full border-2 bg-[#4fe3f0] px-1.5 text-[10px] font-bold text-[#14122b]`}
              style={{ borderColor: INK }}
              aria-label={`${total} out of 25`}
            >
              {total}
            </span>
          </div>

          {/* One "attack" row per mood */}
          {MOODS.map((m) => (
            <div
              key={m.key}
              className="flex items-center gap-3 rounded-md border-2 px-3 py-2.5"
              style={{ background: tier.panel, borderColor: INK }}
            >
              <span className="flex shrink-0 gap-1" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="h-4 w-4 rounded-full border"
                    style={{
                      borderColor: INK,
                      background: n <= game.mood[m.key] ? "#3a2bd1" : "rgba(20,18,43,0.14)",
                    }}
                  />
                ))}
              </span>
              <span className={`${uiFont.className} min-w-0 flex-1 truncate text-lg text-[#14122b]`}>
                {m.label}
              </span>
              <span className={`${displayFont.className} text-sm font-bold text-[#14122b]`}>
                {game.mood[m.key]}
              </span>
            </div>
          ))}

          <p className={`${uiFont.className} text-center text-sm text-white/70`}>
            {USE_MOOD_TIERS
              ? "Total 20+ Diamond · 17+ Gold · 13+ Silver · 10+ Bronze"
              : "Guessed from genres and score"}
          </p>
        </div>
      </div>
    </div>
  );
}
