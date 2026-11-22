// The artwork is drawn at 335x488. px(n) turns n design units into a CSS length
// that follows the CSS variable --s, which Gamematch sets from the screen width
// (S at most, smaller on phones). Because it is plain CSS, dragging stays exact.
export const S = 1.4;
export const px = (n: number) => `calc(${n}px * var(--s, ${S}))`;

export const CARD_W = px(335);
export const CARD_H = px(488);

// Clips a box so its four corners lose one pixel-step, like the pill buttons
export const NOTCH = (() => {
  const n = px(3);
  return (
    `polygon(${n} 0,calc(100% - ${n}) 0,calc(100% - ${n}) ${n},100% ${n},` +
    `100% calc(100% - ${n}),calc(100% - ${n}) calc(100% - ${n}),calc(100% - ${n}) 100%,${n} 100%,` +
    `${n} calc(100% - ${n}),0 calc(100% - ${n}),0 ${n},${n} ${n})`
  );
})();

// Pixel-round shape for the round buttons: each corner loses two pixel-steps
export const ROUND = (() => {
  const a = px(4);
  const b = px(10);
  return (
    `polygon(${b} 0,calc(100% - ${b}) 0,calc(100% - ${b}) ${a},calc(100% - ${a}) ${a},calc(100% - ${a}) ${b},100% ${b},` +
    `100% calc(100% - ${b}),calc(100% - ${a}) calc(100% - ${b}),calc(100% - ${a}) calc(100% - ${a}),calc(100% - ${b}) calc(100% - ${a}),calc(100% - ${b}) 100%,` +
    `${b} 100%,${b} calc(100% - ${a}),${a} calc(100% - ${a}),${a} calc(100% - ${b}),0 calc(100% - ${b}),` +
    `0 ${b},${a} ${b},${a} ${a},${b} ${a})`
  );
})();

// Metacritic score color: red under 30, orange under 50, yellow under 70,
// light green under 85, green from 85 up
export function scoreColor(score: number): string {
  if (score >= 85) return "#1fc94a";
  if (score >= 70) return "#9be86a";
  if (score >= 50) return "#ffd400";
  if (score >= 30) return "#ff8a1f";
  return "#ff3b3b";
}
