// One size setting for the whole console. The artwork is drawn at 335x488;
// every position, size and font on the card and buttons is multiplied by S.
export const S = 1.4;
export const px = (n: number) => n * S;

export const CARD_W = px(335);
export const CARD_H = px(488);

// The white screen on the card (game-card-pixel.svg), from the card's top-left.
// The image fills all of it, so no white shows between the image and the frame.
export const SCREEN = {
  left: px(23),
  top: px(38.5),
  width: px(283.5),
  height: px(204),
};

// Clips a rectangle to the screen's stepped corners: three steps, 4 wide and
// about 4.76 tall each (design units), as drawn in game-card-pixel.svg
const ax = px(4);
const bx = px(8);
const cx = px(12);
const ay = px(4.76);
const by = px(9.52);
const cy = px(14.28);
export const SCREEN_CLIP =
  `polygon(0 ${cy}px,${ax}px ${cy}px,${ax}px ${by}px,${bx}px ${by}px,${bx}px ${ay}px,${cx}px ${ay}px,${cx}px 0,` +
  `calc(100% - ${cx}px) 0,calc(100% - ${cx}px) ${ay}px,calc(100% - ${bx}px) ${ay}px,calc(100% - ${bx}px) ${by}px,calc(100% - ${ax}px) ${by}px,calc(100% - ${ax}px) ${cy}px,100% ${cy}px,` +
  `100% calc(100% - ${cy}px),calc(100% - ${ax}px) calc(100% - ${cy}px),calc(100% - ${ax}px) calc(100% - ${by}px),calc(100% - ${bx}px) calc(100% - ${by}px),calc(100% - ${bx}px) calc(100% - ${ay}px),calc(100% - ${cx}px) calc(100% - ${ay}px),calc(100% - ${cx}px) 100%,` +
  `${cx}px 100%,${cx}px calc(100% - ${ay}px),${bx}px calc(100% - ${ay}px),${bx}px calc(100% - ${by}px),${ax}px calc(100% - ${by}px),${ax}px calc(100% - ${cy}px),0 calc(100% - ${cy}px))`;

// Clips a box so its four corners lose one pixel-step, like the pill buttons
export const NOTCH = (() => {
  const n = `${px(3)}px`;
  return (
    `polygon(${n} 0,calc(100% - ${n}) 0,calc(100% - ${n}) ${n},100% ${n},` +
    `100% calc(100% - ${n}),calc(100% - ${n}) calc(100% - ${n}),calc(100% - ${n}) 100%,${n} 100%,` +
    `${n} calc(100% - ${n}),0 calc(100% - ${n}),0 ${n},${n} ${n})`
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
