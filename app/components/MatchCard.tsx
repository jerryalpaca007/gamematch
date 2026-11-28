import type { Game } from "@/app/lib/types";
import { useUser } from "@/app/lib/auth";
import { engineMoods, matchPercent, ENGINE_MOODS } from "@/app/lib/moodEngine";
import { SAVES_NEEDED, useTaste } from "@/app/lib/useTaste";
import { uiFont } from "./fonts";

// From this match percentage upwards
const GREAT = 70;
const PARTLY = 45;

function verdict(percent: number) {
  if (percent >= GREAT) return { text: "Matches your taste", color: "#4fe3f0" };
  if (percent >= PARTLY) return { text: "Partly your taste", color: "#ffd75e" };
  return { text: "Not your usual taste", color: "#ff7bd5" };
}

// Tells you whether this game is like the games you saved
export default function MatchCard({ game }: { game: Game }) {
  const { user, loading: authLoading } = useUser();
  const taste = useTaste(game.steam_app_id);
  const text = `${uiFont.className} text-base text-[#a9a3e3]`;
  const box = "retro-inset bg-[#14122b] p-3";

  let message: string | null = null;
  if (authLoading) message = "Checking your taste...";
  else if (!user) message = "Sign in and save some games to see your match.";
  else if (taste.status === "loading") message = "Checking your taste...";
  else if (taste.status === "error")
    message = "Couldn't read your saved games. Try again later.";
  else if (taste.status === "too-few")
    message = `Save at least ${SAVES_NEEDED} other games to see your match (you have ${taste.count}).`;

  if (message || !taste.moods) {
    return (
      <div className={box}>
        <p className={text}>{message}</p>
      </div>
    );
  }

  const moods = engineMoods(game);
  const percent = matchPercent(moods, taste.moods);
  const result = verdict(percent);
  // the longest bar stands for the highest number shown
  const most = Math.max(
    1,
    ...ENGINE_MOODS.flatMap(({ key }) => [moods[key], taste.moods![key]]),
  );

  return (
    <div className={box}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          className={`${uiFont.className} text-xl`}
          style={{ color: result.color }}
        >
          {result.text}
        </p>
        <p className={`${uiFont.className} text-lg text-white`}>
          {percent}% match
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {ENGINE_MOODS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className={`${uiFont.className} w-24 shrink-0 sm:w-40 text-sm text-[#ece9ff]`}
            >
              {label}
            </span>
            {/* top bar: this game; bottom bar: your average */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5" aria-hidden>
              <span
                className="h-2 bg-[#4fe3f0]"
                style={{ width: `${(moods[key] / most) * 100}%` }}
              />
              <span
                className="h-2 bg-[#d62fb8]"
                style={{ width: `${(taste.moods![key] / most) * 100}%` }}
              />
            </span>
            <span
              className={`${uiFont.className} w-16 shrink-0 text-right sm:w-20 text-sm text-[#a9a3e3]`}
            >
              {moods[key]} / {taste.moods![key].toFixed(1)}
              <span className="sr-only"> (this game / your average)</span>
            </span>
          </div>
        ))}
      </div>

      <p className={`${uiFont.className} mt-3 text-sm text-[#a9a3e3]`}>
        <span className="text-[#4fe3f0]">■ This game</span>{" "}
        <span className="text-[#d62fb8]">■ Your average</span> • based on{" "}
        {taste.count} saved games
      </p>
    </div>
  );
}
