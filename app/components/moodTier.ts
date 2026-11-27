import type { MoodScores } from "./moods";

// The whole card takes the "metal" that matches its total mood score (out of 25):
//   20 or more = diamond, 17 or more = gold, 13 or more = silver,
//   10 or more = bronze, and below 10 = silver again (never bronze).
// These are the old 5/4/3/2-out-of-5 cut-offs scaled to the totals games really
// get (10 to 21): a literal 5 of 5 would be 25, which no game reaches.
export interface CardTier {
  name: "Diamond" | "Gold" | "Silver" | "Bronze";
  frame: string; // the outer frame of the card
  bar: string; // title bar and rule box
  panel: string; // translucent fill behind the text boxes
  tint: string; // faint colour wash over the card's backdrop
}

const TIERS: Record<CardTier["name"], CardTier> = {
  // icy blues and whites with light bands, like light through a cut stone
  Diamond: {
    name: "Diamond",
    frame:
      "linear-gradient(135deg,#c9f8ff 0%,#ffffff 20%,#7fd0ff 38%,#f0e0ff 55%,#ffffff 70%,#8fe6ff 100%)",
    bar: "repeating-linear-gradient(115deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,0.45) 14px 17px), linear-gradient(120deg,#b9f6ff 0%,#ffffff 22%,#8fd8ff 40%,#e9d9ff 58%,#ffffff 74%,#a6ecff 100%)",
    panel: "rgba(226,248,255,0.9)",
    tint: "rgba(79,227,240,0.2)",
  },
  Gold: {
    name: "Gold",
    frame:
      "linear-gradient(135deg,#fff1a8 0%,#e8b523 30%,#b8860b 52%,#ffe27a 74%,#d9a21a 100%)",
    bar: "linear-gradient(120deg,#fff1a8 0%,#f5c842 30%,#c99410 55%,#ffe27a 78%,#e0a91a 100%)",
    panel: "rgba(255,244,200,0.9)",
    tint: "rgba(245,200,66,0.22)",
  },
  Silver: {
    name: "Silver",
    frame:
      "linear-gradient(135deg,#f1f0f8 0%,#a4a3b8 32%,#e2e1ee 50%,#8f8ea6 72%,#cfcee0 100%)",
    bar: "linear-gradient(135deg,#f1f0f8 0%,#a4a3b8 32%,#e2e1ee 50%,#8f8ea6 72%,#cfcee0 100%)",
    panel: "rgba(236,233,255,0.88)",
    tint: "rgba(0,0,0,0)",
  },
  Bronze: {
    name: "Bronze",
    frame:
      "linear-gradient(135deg,#f2b27d 0%,#b8692f 32%,#e0a46c 52%,#8a501f 74%,#cf9158 100%)",
    bar: "linear-gradient(120deg,#f2b27d 0%,#c27a3a 35%,#9a5a28 60%,#d89a5f 100%)",
    panel: "rgba(250,226,204,0.9)",
    tint: "rgba(194,122,58,0.22)",
  },
};

export function moodTotal(mood: MoodScores): number {
  return (
    mood.excitement + mood.chill + mood.puzzle + mood.story + mood.challenge
  );
}

// Switched off until the real mood system exists: the current mood scores are
// rough guesses from genres, so most games would come out diamond or bronze.
// Set to true to bring the metals back.
export const USE_MOOD_TIERS = false;

export function cardTier(mood: MoodScores): CardTier {
  if (!USE_MOOD_TIERS) return TIERS.Silver;
  const total = moodTotal(mood);
  if (total >= 20) return TIERS.Diamond;
  if (total >= 17) return TIERS.Gold;
  if (total >= 10 && total < 13) return TIERS.Bronze;
  return TIERS.Silver;
}
