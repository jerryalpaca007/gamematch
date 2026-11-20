// app/components/PixelButtons.tsx
import Image from "next/image";
import { px } from "./cardScale";
import { pressStart } from "./fonts";

type ExtraId = "grey" | "pink" | "red";

type Props = {
  onPass: () => void; // green button, left of the card
  onLike: () => void; // orange button, right of the card
  onExtra?: (id: ExtraId) => void; // the three pill buttons from the design
};

const base =
  "absolute z-20 cursor-pointer border-0 bg-transparent p-0 leading-none " +
  "active:translate-x-0.5 active:translate-y-0.5 " +
  "focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#5b7eff]";

// x and y are in design units, from the card's top-left. px() applies the scale.
export default function PixelButtons({ onPass, onLike, onExtra }: Props) {
  const buttons: {
    label: string;
    text?: string; // optional words drawn on the button
    src: string;
    w: number;
    h: number;
    x: number;
    y: number;
    onClick: () => void;
  }[] = [
    { label: "Pass", src: "/btn-green.svg", w: 70, h: 70, x: -86, y: 188, onClick: onPass },
    { label: "Save", src: "/btn-orange.svg", w: 70, h: 70, x: 350, y: 188, onClick: onLike },
    { label: "View game", text: "VIEW", src: "/btn-grey.svg", w: 87, h: 40, x: 358, y: 352, onClick: () => onExtra?.("grey") },
    { label: "Pink button", src: "/btn-pink.svg", w: 87, h: 40, x: 360, y: 400, onClick: () => onExtra?.("pink") },
    { label: "Dark red button", src: "/btn-red.svg", w: 87, h: 40, x: 360, y: 448, onClick: () => onExtra?.("red") },
  ];

  return (
    <>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.onClick}
          aria-label={b.label}
          className={base}
          style={{
            left: px(b.x),
            top: px(b.y),
            width: px(b.w),
            height: px(b.h),
          }}
        >
          <Image
            src={b.src}
            alt=""
            width={px(b.w)}
            height={px(b.h)}
            unoptimized
          />
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
