export interface MoodScores {
  excitement: number;
  chill: number;
  puzzle: number;
  story: number;
  challenge: number;
}

// Each mood has a key (used in code) and a label (shown to the user)
export const MOODS: { key: keyof MoodScores; label: string }[] = [
  { key: "excitement", label: "Excitement" },
  { key: "chill", label: "Chill" },
  { key: "puzzle", label: "Puzzle / Think" },
  { key: "story", label: "Story" },
  { key: "challenge", label: "Challenge" },
];
