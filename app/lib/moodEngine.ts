// The mood calculator for the whole site. These are the rules from
// mood_engine.py, rewritten in TypeScript: if you change the rules there,
// change them here too.

// Your game types, with the names Steam uses for each. Only the types that a
// rule below gives points to are listed.
const TYPES: Record<string, string[]> = {
  action: ["action"],
  adventure: ["adventure"],
  sports: ["sports"],
  simulation: ["simulation"],
  platformer: ["platformer", "2d platformer", "3d platformer"],
  rpg: ["rpg"],
  shooter: ["shooter"],
  action_adventure: ["action-adventure"],
  fighting: ["fighting"],
  "rhythm & music": ["rhythm", "music"],
  puzzle: ["puzzle"],
  sandbox: ["sandbox"],
  party: ["party", "party game"],
  "card & board": ["card game", "board game"],
  "interactive story & visual novel": [
    "visual novel",
    "interactive fiction",
    "choose your own adventure",
  ],
};

const EXCITING_TYPES = [
  "action",
  "adventure",
  "sports",
  "simulation",
  "platformer",
  "rpg",
  "shooter",
  "action_adventure",
  "fighting",
];
const COMPETITIVE_TYPES = ["fighting", "shooter", "action"];
const CASUAL_TYPES = [
  "rhythm & music",
  "sandbox",
  "party",
  "card & board",
  "interactive story & visual novel",
  "puzzle",
];

// calm, rush and morning have no rules yet, so they are left out. Add them here
// once mood_engine.py can score them.
export const ENGINE_MOODS = [
  { key: "fun", label: "Fun" },
  { key: "competitive", label: "Competitive" },
  { key: "exciting", label: "Exciting" },
  { key: "freetime", label: "Free time" },
  { key: "casual", label: "Casual" },
  { key: "casual_and_friends", label: "Casual with friends" },
] as const;

export type EngineMoods = Record<(typeof ENGINE_MOODS)[number]["key"], number>;

// The parts of a game the calculator reads
export interface MoodInput {
  genres: string[] | null;
  tags: string[] | null;
  categories: string[] | null;
}

const lower = (list: string[] | null) =>
  (list ?? []).map((word) => word.toLowerCase());

const noMoods = (): EngineMoods => ({
  fun: 0,
  competitive: 0,
  exciting: 0,
  freetime: 0,
  casual: 0,
  casual_and_friends: 0,
});

export function engineMoods(game: MoodInput): EngineMoods {
  const categories = lower(game.categories);
  const labels = new Set([
    ...lower(game.genres),
    ...lower(game.tags),
    ...categories,
  ]);
  const types = Object.keys(TYPES).filter((type) =>
    TYPES[type].some((name) => labels.has(name)),
  );
  const withFriends =
    categories.includes("multi-player") ||
    categories.includes("co-op") ||
    types.includes("party");

  const moods = noMoods();
  for (const type of types) {
    if (EXCITING_TYPES.includes(type)) {
      moods.fun += 1;
      moods.exciting += 1;
      if (COMPETITIVE_TYPES.includes(type)) moods.competitive += 1;
    }
    if (CASUAL_TYPES.includes(type)) {
      moods.fun += 1;
      moods.exciting += 1;
      moods.freetime += 1;
      moods.casual += 1;
      if (withFriends) moods.casual_and_friends += 1;
    }
  }
  return moods;
}

// Your taste: the average of each mood over a list of games
export function averageMoods(list: EngineMoods[]): EngineMoods {
  const average = noMoods();
  for (const { key } of ENGINE_MOODS) {
    average[key] =
      list.reduce((sum, moods) => sum + moods[key], 0) / (list.length || 1);
  }
  return average;
}

// How alike a game and your taste are, 0 to 100: the points they have in common
// divided by the points either of them has
export function matchPercent(game: EngineMoods, taste: EngineMoods): number {
  let shared = 0;
  let total = 0;
  for (const { key } of ENGINE_MOODS) {
    shared += Math.min(game[key], taste[key]);
    total += Math.max(game[key], taste[key]);
  }
  return total === 0 ? 0 : Math.round((shared / total) * 100);
}
