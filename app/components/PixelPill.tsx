"use client";

import Link from "next/link";
import { pressStart } from "./fonts";
import { NOTCH, px } from "./cardScale";

type Props = {
  color: string;
  textColor?: string; // defaults to black
  children: React.ReactNode;
  href?: string;
  // true opens the link in a new tab (for other websites)
  external?: boolean;
  onClick?: () => void;
};

// A button in the same style as the card's pill buttons: notched pixel corners,
// black border and a hard drop shadow. Renders a link when given an href.
export default function PixelPill({
  color,
  textColor = "#000",
  children,
  href,
  external,
  onClick,
}: Props) {
  const className =
    "relative inline-block cursor-pointer active:translate-x-0.5 active:translate-y-0.5";
  const style = { paddingRight: px(6), paddingBottom: px(6) };
  const content = (
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
          clipPath: NOTCH,
        }}
      />
      <span
        className="relative block bg-black"
        style={{ padding: px(3), clipPath: NOTCH }}
      >
        <span
          className={`${pressStart.className} block text-xs`}
          style={{
            backgroundColor: color,
            color: textColor,
            padding: `${px(8)} ${px(12)}`,
            clipPath: NOTCH,
          }}
        >
          {children}
        </span>
      </span>
    </>
  );

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className} style={style}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}
