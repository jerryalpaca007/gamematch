import { displayFont, uiFont } from "./fonts";
import { px, scoreColor } from "./cardScale";
import { MOODS } from "./moods";
import { cardTier } from "./moodTier";
import type { Game } from "@/app/lib/types";

const INK = "#14122b";

// The look of one game card, modelled on a trading card: silver frame, a title
// bar with the score on the right, a framed art window, an "ability" box with the
// description, one "attack" row per strong mood, a stats row, a rule box and a
// tiny footer. The swipe card and the small cards in the piles both use this, so
// they always match. children are drawn on top (the SAVE and PASS stamps).
export default function CardFace({
  game,
  children,
}: {
  game: Game;
  children?: React.ReactNode;
}) {
  const { genres } = game;
  // The two strongest moods, like a card's two attacks
  const topMoods = [...MOODS]
    .sort((a, b) => game.mood[b.key] - game.mood[a.key])
    .slice(0, 2);
  const rules = (game.categories?.length ? game.categories : genres).slice(
    0,
    3,
  );

  // the whole card takes the metal of its total mood score
  const tier = cardTier(game.mood);
  const box = {
    background: tier.panel,
    border: `2px solid ${INK}`,
    borderRadius: px(6),
  } as const;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        borderRadius: px(16),
        padding: px(9),
        background: tier.frame,
        boxShadow: `0 0 0 2px ${INK}, 0 0 18px rgba(214,47,184,0.35)`,
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: px(9),
          border: `2px solid ${INK}`,
          backgroundColor: game.bg,
        }}
      >
        {/* Backdrop: a tiny copy of the cover, blurred while it is still tiny
            (which costs almost nothing) and then blown up, so it is very soft */}
        {game.header_url && (
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden"
            style={{ width: "6.25%", height: "6.25%", transform: "scale(16)" }}
          >
            <img
              src={game.header_url}
              alt=""
              draggable={false}
              className="h-full w-full scale-125 object-cover"
              style={{ filter: "blur(1.6px)" }}
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(rgba(8,7,15,0.1), rgba(8,7,15,0.55) 60%, rgba(8,7,15,0.7))",
          }}
        />
        <div className="absolute inset-0" style={{ background: tier.tint }} />

        <div
          className="relative flex h-full flex-col"
          style={{ padding: px(8), gap: px(6) }}
        >
          {/* Title bar: genre badge and name on the left, score on the right */}
          <div
            className="flex shrink-0 items-center"
            style={{
              background: tier.bar,
              border: `2px solid ${INK}`,
              borderRadius: px(8),
              height: px(36),
              padding: `0 ${px(6)}`,
              gap: px(6),
            }}
          >
            <span
              className={`${uiFont.className} shrink-0 italic`}
              style={{
                fontSize: px(7),
                color: "#fff",
                background: INK,
                borderRadius: px(4),
                padding: `${px(2)} ${px(5)}`,
                maxWidth: px(70),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {(genres[0] ?? "GAME").toUpperCase()}
            </span>
            <span
              className={`${displayFont.className} min-w-0 flex-1 truncate font-bold`}
              style={{
                fontSize: px(
                  game.title.length > 22
                    ? 9.5
                    : game.title.length > 15
                      ? 11
                      : 13,
                ),
                color: INK,
              }}
            >
              {game.title}
            </span>
            <span
              className={`${uiFont.className} shrink-0`}
              style={{ fontSize: px(7), color: INK }}
            >
              SCORE
            </span>
            <span
              className={`${uiFont.className} flex shrink-0 items-center justify-center font-bold`}
              style={{
                width: px(
                  game.metacritic != null && game.metacritic >= 100 ? 30 : 26,
                ),
                height: px(24),
                fontSize: px(
                  game.metacritic != null && game.metacritic >= 100 ? 10 : 13,
                ),
                borderRadius: px(12),
                border: `2px solid ${INK}`,
                background:
                  game.metacritic != null
                    ? scoreColor(game.metacritic)
                    : "#ece9ff",
                color: INK,
              }}
            >
              {game.metacritic ?? "--"}
            </span>
          </div>

          {/* Art window. The box has Steam's header ratio, so the whole cover shows */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              aspectRatio: "460 / 215",
              border: `${px(3)} solid #fff`,
              borderRadius: px(10),
              boxShadow: `0 0 0 2px ${INK}`,
              backgroundColor: game.bg,
            }}
          >
            {game.header_url && (
              <img
                src={game.header_url}
                alt={game.title}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {/* a few sparkles, like the shiny cards */}
            {[
              { left: "6%", top: "14%", size: 7 },
              { left: "90%", top: "22%", size: 9 },
              { left: "82%", top: "74%", size: 6 },
            ].map((s, i) => (
              <span
                key={i}
                className="absolute rotate-45 bg-white/90"
                style={{
                  left: s.left,
                  top: s.top,
                  width: px(s.size),
                  height: px(s.size),
                }}
              />
            ))}
          </div>

          {/* "Ability": the genres and the description */}
          <div
            className="min-h-0 flex-1 overflow-hidden"
            style={{ ...box, padding: px(6) }}
          >
            <div className="flex items-center" style={{ gap: px(6) }}>
              <span
                className={`${uiFont.className} shrink-0 text-white`}
                style={{
                  fontSize: px(8),
                  background: "linear-gradient(#e847cb,#a81f90)",
                  border: `2px solid ${INK}`,
                  borderRadius: px(9),
                  padding: `${px(1)} ${px(8)}`,
                }}
              >
                INFO
              </span>
              <span
                className={`${uiFont.className} min-w-0 truncate font-bold`}
                style={{ fontSize: px(10), color: "#b3158c" }}
              >
                {genres.slice(0, 3).join(" · ")}
              </span>
            </div>
            <p
              className={`${uiFont.className} line-clamp-6`}
              style={{
                fontSize: px(12.5),
                lineHeight: px(14),
                color: INK,
                marginTop: px(3),
              }}
            >
              {game.summary}
            </p>
          </div>

          {/* "Attacks": the two strongest moods, with energy circles */}
          <div className="flex shrink-0 flex-col" style={{ gap: px(3) }}>
            {topMoods.map((m) => (
              <div
                key={m.key}
                className="flex items-center"
                style={{
                  ...box,
                  padding: `${px(3)} ${px(6)}`,
                  gap: px(6),
                }}
              >
                <span className="flex shrink-0" style={{ gap: px(2) }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      style={{
                        width: px(9),
                        height: px(9),
                        borderRadius: "50%",
                        border: `1px solid ${INK}`,
                        background:
                          n <= game.mood[m.key]
                            ? "#3a2bd1"
                            : "rgba(20,18,43,0.14)",
                      }}
                    />
                  ))}
                </span>
                <span
                  className={`${uiFont.className} min-w-0 flex-1 truncate font-bold`}
                  style={{ fontSize: px(10), color: INK }}
                >
                  {m.label}
                </span>
                <span
                  className={`${uiFont.className} font-bold`}
                  style={{ fontSize: px(13), color: INK }}
                >
                  {game.mood[m.key]}
                </span>
              </div>
            ))}
          </div>

          {/* Stats row, where a card shows weakness and retreat */}
          <div
            className={`${uiFont.className} flex shrink-0 justify-between text-white`}
            style={{ fontSize: px(9) }}
          >
            <span>YEAR {game.year}</span>
            <span>GENRES {genres.length}</span>
            <span>
              MOOD{" "}
              {game.mood.excitement +
                game.mood.chill +
                game.mood.puzzle +
                game.mood.story +
                game.mood.challenge}
              /25
            </span>
          </div>

          {/* Rule box, where a card prints its special rule */}
          <div
            className={`${uiFont.className} flex shrink-0 items-center justify-center text-center`}
            style={{
              background: tier.bar,
              border: `2px solid ${INK}`,
              borderRadius: px(12),
              minHeight: px(26),
              padding: `${px(2)} ${px(8)}`,
              fontSize: px(10),
              lineHeight: px(11),
              color: INK,
              fontWeight: 700,
            }}
          >
            {rules.join(" · ")}
          </div>

          {/* Tiny footer line */}
          <div
            className={`${uiFont.className} flex shrink-0 justify-between text-white/70`}
            style={{ fontSize: px(8) }}
          >
            <span>STEAM #{game.steam_app_id}</span>
            <span>GAMEMATCH ★</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
