// Chunky pixel icons in the style of the pixel icon pack: each icon is a grid
// of squares ("X" = filled), drawn with crisp edges so it stays sharp at any size.
const ICONS = {
  x: [
    "XX........XX",
    "XXX......XXX",
    ".XXX....XXX.",
    "..XXX..XXX..",
    "...XXXXXX...",
    "....XXXX....",
    "....XXXX....",
    "...XXXXXX...",
    "..XXX..XXX..",
    ".XXX....XXX.",
    "XXX......XXX",
    "XX........XX",
  ],
  star: [
    ".....XX.....",
    ".....XX.....",
    "....XXXX....",
    "....XXXX....",
    "XXXXXXXXXXXX",
    ".XXXXXXXXXX.",
    "..XXXXXXXX..",
    "..XXXXXXXX..",
    ".XXXXXXXXXX.",
    ".XXXX..XXXX.",
    ".XXX....XXX.",
    ".XX......XX.",
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

export default function PixelIcon({
  name,
  color,
  size,
}: {
  name: PixelIconName;
  color: string;
  size: string; // any CSS length
}) {
  const rows = ICONS[name];
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      fill={color}
      aria-hidden
      style={{ width: size, height: size, display: "block" }}
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "X" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
          ) : null,
        ),
      )}
    </svg>
  );
}
