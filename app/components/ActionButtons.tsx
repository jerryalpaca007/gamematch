import { px } from "./cardScale";
import { uiFont } from "./fonts";
import PixelIcon from "./PixelIcon";

type Props = {
  narrow?: boolean; // phone layout: buttons sit in a row below the card
  onPass: () => void;
  onLike: () => void;
  onView: () => void;
};

// x and y are in design units, from the card's top-left. px() applies the scale.
const SIZE = { w: 90, h: 46 };

export default function ActionButtons({
  narrow,
  onPass,
  onLike,
  onView,
}: Props) {
  const buttons = [
    {
      label: "Pass",
      text: "PASS",
      icon: "x" as const,
      variant: "magenta",
      wide: { x: -106, y: 196 },
      row: { x: 0, y: 512 },
      onClick: onPass,
    },
    {
      label: "Save",
      text: "SAVE",
      icon: "star" as const,
      variant: "indigo",
      wide: { x: 351, y: 196 },
      row: { x: 245, y: 512 },
      onClick: onLike,
    },
    {
      label: "View game",
      text: "VIEW",
      variant: "white",
      wide: { x: 351, y: 262 },
      row: { x: 122.5, y: 512 },
      onClick: onView,
    },
  ];

  return (
    <>
      {buttons.map((b) => {
        const at = narrow ? b.row : b.wide;
        return (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            aria-label={b.label}
            className={`retro-btn retro-btn-${b.variant} ${uiFont.className} absolute z-20 focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#4fe3f0]`}
            style={{
              left: px(at.x),
              top: px(at.y),
              width: px(SIZE.w),
              height: px(SIZE.h),
              fontSize: px(14),
              padding: 0,
              boxShadow: "0 0 14px rgba(214,47,184,0.35)",
            }}
          >
            {b.icon && (
              <PixelIcon name={b.icon} color="#ffffff" size={px(14)} />
            )}
            {b.text}
          </button>
        );
      })}
    </>
  );
}
