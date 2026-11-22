// app/components/PixelButtons.tsx
import Image from "next/image";
import { px, ROUND } from "./cardScale";
import PixelIcon, { type PixelIconName } from "./PixelIcon";
import { pressStart } from "./fonts";

type ExtraId = "grey" | "pink" | "red";

type Props = {
  narrow?: boolean; // phone layout: buttons sit in a row below the card
  onPass: () => void; // green button, left of the card
  onLike: () => void; // orange button, right of the card
  onExtra?: (id: ExtraId) => void; // the three pill buttons from the design
};

const base =
  "absolute z-20 cursor-pointer border-0 bg-transparent p-0 leading-none " +
  "active:translate-x-0.5 active:translate-y-0.5 " +
  "focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#ffc400]";

// x and y are in design units, from the card's top-left. px() applies the scale.
export default function PixelButtons({
  onPass,
  onLike,
  onExtra,
  narrow,
}: Props) {
  const buttons: {
    label: string;
    text?: string; // optional words drawn on the button
    // round icon button: a fill color, an icon and the icon's color
    round?: { color: string; icon: PixelIconName; iconColor: string };
    src?: string; // otherwise the button is one of the pill images
    w: number;
    h: number;
    x: number;
    y: number;
    onClick: () => void;
  }[] = [
    {
      label: "Pass",
      round: { color: "#e0201b", icon: "x", iconColor: "#ffffff" },
      w: 70,
      h: 70,
      x: -86,
      y: 188,
      onClick: onPass,
    },
    {
      label: "Save",
      round: { color: "#ffc400", icon: "star", iconColor: "#000000" },
      w: 70,
      h: 70,
      x: 350,
      y: 188,
      onClick: onLike,
    },
    {
      label: "View game",
      text: "VIEW",
      src: "/btn-grey.svg",
      w: 87,
      h: 40,
      x: 358,
      y: 352,
      onClick: () => onExtra?.("grey"),
    },
    {
      label: "Pink button",
      src: "/btn-pink.svg",
      w: 87,
      h: 40,
      x: 360,
      y: 400,
      onClick: () => onExtra?.("pink"),
    },
    {
      label: "Dark red button",
      src: "/btn-red.svg",
      w: 87,
      h: 40,
      x: 360,
      y: 448,
      onClick: () => onExtra?.("red"),
    },
  ];

  // On a narrow screen there is no room beside the card, so the green, view and
  // orange buttons go in a row underneath it and the decorative pills are hidden
  const narrowSpot: Record<string, { x: number; y: number }> = {
    Pass: { x: 0, y: 512 },
    "View game": { x: 124, y: 524 },
    Save: { x: 265, y: 512 },
  };
  const shown = narrow ? buttons.filter((b) => narrowSpot[b.label]) : buttons;

  return (
    <>
      {shown.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.onClick}
          aria-label={b.label}
          className={base}
          style={{
            left: px(narrow ? narrowSpot[b.label].x : b.x),
            top: px(narrow ? narrowSpot[b.label].y : b.y),
            width: px(b.w),
            height: px(b.h),
          }}
        >
          {b.round ? (
            <>
              {/* The shadow is the same shape, shifted down and to the right */}
              <span
                aria-hidden
                className="absolute bg-black"
                style={{
                  left: px(6),
                  top: px(6),
                  right: 0,
                  bottom: 0,
                  clipPath: ROUND,
                }}
              />
              <span
                className="absolute bg-black"
                style={{
                  left: 0,
                  top: 0,
                  width: px(64),
                  height: px(64),
                  padding: px(4),
                  clipPath: ROUND,
                }}
              >
                <span
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: b.round.color, clipPath: ROUND }}
                >
                  <PixelIcon
                    name={b.round.icon}
                    color={b.round.iconColor}
                    size={px(26)}
                  />
                </span>
              </span>
            </>
          ) : (
            <Image
              src={b.src!}
              alt=""
              width={b.w}
              height={b.h}
              className="h-full w-full"
              unoptimized
            />
          )}
          {b.text && (
            <span
              className={`${pressStart.className} pointer-events-none absolute inset-0 flex items-center justify-center text-black`}
              style={{
                fontSize: px(9),
                paddingRight: px(3),
                paddingBottom: px(3),
              }}
            >
              {b.text}
            </span>
          )}
        </button>
      ))}
    </>
  );
}
