"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { fetchGamesFromSupabase, enrichGameData } from "@/app/lib/db";
import type { Game } from "./Gamematch";
import GameDetails from "./GameDetails";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import PixelIcon from "./PixelIcon";
import { displayFont, uiFont } from "./fonts";
import { scoreColor } from "./cardScale";

// The real Steam genres. Some games came back with genres in other languages,
// so only these are offered as filters.
const GENRES = [
  "Action",
  "Adventure",
  "Casual",
  "Indie",
  "Massively Multiplayer",
  "Racing",
  "RPG",
  "Simulation",
  "Sports",
  "Strategy",
  "Free To Play",
  "Early Access",
];

// Player filters, matched against Steam's own category names
const PLAYERS = [
  { key: "single", label: "Single-player", test: /single-player/i },
  { key: "multi", label: "Multiplayer", test: /multi-player|mmo/i },
  { key: "coop", label: "Co-op", test: /co-op/i },
  { key: "pvp", label: "PvP", test: /pvp/i },
] as const;

const RAM_CHOICES = [1, 2, 4, 6, 8, 12, 16, 32];
const PAGE = 24;

type SortKey = "score" | "year" | "name" | "ram";

// ---------- small form pieces in the retro style ----------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className={`${displayFont.className} mb-2 mt-5 border-b-2 border-[#d62fb8] pb-1 text-[11px] text-[#4fe3f0] first:mt-0`}
    >
      {children}
    </h3>
  );
}

function Check({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`${uiFont.className} flex cursor-pointer items-center gap-2 py-0.5 text-base text-[#ece9ff] ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="retro-inset flex h-5 w-5 shrink-0 items-center justify-center bg-[#14122b] text-sm font-bold leading-none text-[#4fe3f0] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#4fe3f0]">
        {checked ? "✕" : ""}
      </span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`retro-btn ${active ? "retro-btn-indigo" : "retro-btn-white"} ${uiFont.className} !px-2 !py-0.5 text-xs`}
    >
      {children}
    </button>
  );
}

// Two sliders, for the low and the high end of a range
function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className={`${uiFont.className} text-sm text-[#ece9ff]`}>
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-[#4fe3f0]">
          {value[0]} - {value[1]}
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} from`}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) =>
          onChange([Math.min(Number(e.target.value), value[1]), value[1]])
        }
        className="mt-1 block w-full accent-[#d62fb8]"
      />
      <input
        type="range"
        aria-label={`${label} to`}
        min={min}
        max={max}
        step={step}
        value={value[1]}
        onChange={(e) =>
          onChange([value[0], Math.max(Number(e.target.value), value[0])])
        }
        className="block w-full accent-[#4fe3f0]"
      />
    </div>
  );
}

function RamSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label
      className={`${uiFont.className} flex items-center justify-between gap-2 text-sm text-[#ece9ff]`}
    >
      {label}
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="retro-inset bg-[#14122b] px-2 py-1 text-[#4fe3f0]"
      >
        <option value="">Any</option>
        {RAM_CHOICES.map((n) => (
          <option key={n} value={n}>
            {n} GB
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------- one game in the grid ----------

function Tile({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const genres = Array.isArray(game.genres) ? game.genres : [game.genres];
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
            className={`${displayFont.className} flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#14122b] px-1 text-[10px] font-bold text-[#14122b]`}
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
            <span
              className={`${displayFont.className} text-[9px] text-[#14122b]`}
            >
              {game.min_ram_gb}GB
            </span>
          )}
        </span>
        {/* Placeholder until accounts exist: there is nowhere to keep saves yet */}
        <button
          type="button"
          disabled
          title="Saving comes with accounts"
          aria-label={`Save ${game.title} (coming soon)`}
          className="retro-btn retro-btn-white !px-2 !py-0.5 text-xs opacity-60"
        >
          <PixelIcon name="star" color="#14122b" size="12px" />
          SAVE
        </button>
      </div>
    </div>
  );
}

// ---------- the page ----------

export default function BrowseView() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Game | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<Set<string>>(new Set());
  const [score, setScore] = useState<[number, number]>([0, 100]);
  const [includeUnscored, setIncludeUnscored] = useState(true);
  const [years, setYears] = useState<[number, number] | null>(null);
  const [ramMin, setRamMin] = useState<number | null>(null);
  const [ramMax, setRamMax] = useState<number | null>(null);
  const [integratedOnly, setIntegratedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    fetchGamesFromSupabase()
      .then((rows) => {
        if (!cancelled) setGames(rows.map((r) => enrichGameData(r)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Facts about the loaded games, used to build the filter controls
  const facts = useMemo(() => {
    const tagCount = new Map<string, number>();
    let minYear = 3000;
    let maxYear = 0;
    let hasHardware = false;
    for (const g of games) {
      for (const t of g.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      minYear = Math.min(minYear, g.year);
      maxYear = Math.max(maxYear, g.year);
      if (g.min_ram_gb != null || g.integrated_ok != null) hasHardware = true;
    }
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([t]) => t);
    return {
      topTags,
      minYear: games.length ? minYear : 1990,
      maxYear: games.length ? maxYear : 2026,
      hasHardware,
    };
  }, [games]);

  const yearRange: [number, number] = years ?? [facts.minYear, facts.maxYear];

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const out = games.filter((g) => {
      const title = g.title.toLowerCase();
      if (!words.every((w) => title.includes(w))) return false;
      const gGenres = Array.isArray(g.genres) ? g.genres : [g.genres];
      for (const want of genres) if (!gGenres.includes(want)) return false;
      for (const want of tags) if (!(g.tags ?? []).includes(want)) return false;
      for (const key of players) {
        const rule = PLAYERS.find((p) => p.key === key);
        if (rule && !(g.categories ?? []).some((c) => rule.test.test(c)))
          return false;
      }
      if (g.metacritic == null) {
        if (!includeUnscored) return false;
      } else if (g.metacritic < score[0] || g.metacritic > score[1])
        return false;
      if (g.year < yearRange[0] || g.year > yearRange[1]) return false;
      if (ramMin != null || ramMax != null) {
        if (g.min_ram_gb == null) return false;
        if (ramMin != null && g.min_ram_gb < ramMin) return false;
        if (ramMax != null && g.min_ram_gb > ramMax) return false;
      }
      if (integratedOnly && g.integrated_ok !== true) return false;
      return true;
    });
    const dir = (
      a: number | null | undefined,
      b: number | null | undefined,
      asc: boolean,
    ) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1; // unknown values always last
      if (b == null) return -1;
      return asc ? a - b : b - a;
    };
    out.sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "year"
          ? dir(a.year, b.year, false)
          : sort === "ram"
            ? dir(a.min_ram_gb, b.min_ram_gb, true)
            : dir(a.metacritic, b.metacritic, false),
    );
    return out;
  }, [
    games,
    query,
    genres,
    tags,
    players,
    score,
    includeUnscored,
    yearRange[0],
    yearRange[1],
    ramMin,
    ramMax,
    integratedOnly,
    sort,
  ]);

  // Any change to the filters starts the grid from the top again
  useEffect(
    () => setVisible(PAGE),
    [
      query,
      genres,
      tags,
      players,
      score,
      includeUnscored,
      years,
      ramMin,
      ramMax,
      integratedOnly,
      sort,
    ],
  );

  const toggle = (
    set: Set<string>,
    setter: (s: Set<string>) => void,
    key: string,
  ) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const reset = () => {
    setQuery("");
    setGenres(new Set());
    setTags(new Set());
    setPlayers(new Set());
    setScore([0, 100]);
    setIncludeUnscored(true);
    setYears(null);
    setRamMin(null);
    setRamMax(null);
    setIntegratedOnly(false);
  };

  const sidebar = (
    <div className="retro-inset bg-[#2a2933] p-3">
      <SectionTitle>GENRE</SectionTitle>
      {GENRES.map((g) => (
        <Check
          key={g}
          checked={genres.has(g)}
          onChange={() => toggle(genres, setGenres, g)}
        >
          {g}
        </Check>
      ))}

      <SectionTitle>PLAYERS</SectionTitle>
      {PLAYERS.map((p) => (
        <Check
          key={p.key}
          checked={players.has(p.key)}
          onChange={() => toggle(players, setPlayers, p.key)}
        >
          {p.label}
        </Check>
      ))}

      <SectionTitle>TAGS</SectionTitle>
      <div className="flex flex-wrap gap-1">
        {facts.topTags.map((t) => (
          <Chip
            key={t}
            active={tags.has(t)}
            onClick={() => toggle(tags, setTags, t)}
          >
            {t}
          </Chip>
        ))}
      </div>

      <SectionTitle>SCORE AND YEAR</SectionTitle>
      <Range
        label="Metacritic"
        min={0}
        max={100}
        step={5}
        value={score}
        onChange={setScore}
      />
      <div className="mt-1">
        <Check
          checked={includeUnscored}
          onChange={() => setIncludeUnscored((v) => !v)}
        >
          Include games with no score
        </Check>
      </div>
      <div className="mt-3">
        <Range
          label="Released"
          min={facts.minYear}
          max={facts.maxYear}
          step={1}
          value={yearRange}
          onChange={setYears}
        />
      </div>

      <SectionTitle>WILL IT RUN?</SectionTitle>
      {facts.hasHardware ? (
        <div className="space-y-2">
          <RamSelect label="RAM at least" value={ramMin} onChange={setRamMin} />
          <RamSelect label="RAM at most" value={ramMax} onChange={setRamMax} />
          <Check
            checked={integratedOnly}
            onChange={() => setIntegratedOnly((v) => !v)}
          >
            Runs on integrated graphics
          </Check>
          <p className={`${uiFont.className} text-xs leading-4 text-[#a9a3e3]`}>
            Based on each game&apos;s minimum requirements on Steam. The
            graphics answer is a best guess.
          </p>
        </div>
      ) : (
        <p className={`${uiFont.className} text-sm leading-4 text-[#a9a3e3]`}>
          System requirements have not been added to the database yet.
        </p>
      )}

      <div className="mt-5">
        <RetroButton variant="magenta" onClick={reset} className="w-full">
          Reset filters
        </RetroButton>
      </div>
    </div>
  );

  return (
    <>
      <RetroWindow
        title="Browse.exe - GameMatch"
        className="mx-auto max-w-6xl"
        bodyClassName="p-3 md:p-4"
      >
        {/* Search: a sunken field with a glossy GO button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setVisible(PAGE);
          }}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <div className="retro-inset flex flex-1 items-center bg-black px-2">
            <span className={`${displayFont.className} text-xs text-[#d62fb8]`}>
              &gt;
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              aria-label="Search games"
              className={`${uiFont.className} w-full bg-transparent px-2 py-2 text-lg text-[#4fe3f0] placeholder:text-[#6f69b8] focus:outline-none`}
            />
          </div>
          <RetroButton variant="indigo" className="!px-5 !py-2.5">
            Go
          </RetroButton>
        </form>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
          {/* Filters: always on screen on desktop, behind a button on phones */}
          <aside className="md:w-64 md:shrink-0">
            <div className="mb-2 md:hidden">
              <RetroButton
                variant="white"
                onClick={() => setShowFilters((v) => !v)}
                className="w-full"
              >
                {showFilters ? "Hide filters" : "Show filters"}
              </RetroButton>
            </div>
            <div className={showFilters ? "block" : "hidden md:block"}>
              {sidebar}
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`${uiFont.className} text-base text-[#ece9ff]`}>
                {loading
                  ? "Loading games..."
                  : `${results.length.toLocaleString()} games`}
              </span>
              <label
                className={`${uiFont.className} flex items-center gap-2 text-sm text-[#ece9ff]`}
              >
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="retro-inset bg-[#14122b] px-2 py-1 text-[#4fe3f0]"
                >
                  <option value="score">Score</option>
                  <option value="year">Newest</option>
                  <option value="name">Name</option>
                  {facts.hasHardware && <option value="ram">Lowest RAM</option>}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.slice(0, visible).map((g) => (
                <Tile
                  key={g.steam_app_id}
                  game={g}
                  onOpen={() => setViewing(g)}
                />
              ))}
            </div>

            {!loading && results.length === 0 && (
              <p
                className={`${uiFont.className} mt-6 text-center text-lg text-[#a9a3e3]`}
              >
                No games match. Try removing a filter.
              </p>
            )}

            {visible < results.length && (
              <div className="mt-5 flex flex-col items-center gap-1">
                <RetroButton
                  variant="indigo"
                  onClick={() => setVisible((v) => v + PAGE)}
                >
                  Load more
                </RetroButton>
                <span className={`${uiFont.className} text-sm text-[#a9a3e3]`}>
                  Showing {Math.min(visible, results.length)} of{" "}
                  {results.length.toLocaleString()}
                </span>
              </div>
            )}
          </section>
        </div>
      </RetroWindow>

      <AnimatePresence>
        {viewing && (
          <GameDetails game={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
