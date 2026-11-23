"use client";

import Link from "next/link";
import { uiFont } from "./fonts";

type Props = {
  children: React.ReactNode;
  variant?: "indigo" | "white" | "magenta";
  href?: string;
  // true opens the link in a new tab (for other websites)
  external?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

// A glossy bevelled button like the ones in the reference windows. Renders a
// link when given an href, otherwise a button.
export default function RetroButton({
  children,
  variant = "indigo",
  href,
  external,
  onClick,
  className = "",
  ariaLabel,
}: Props) {
  const classes = `retro-btn retro-btn-${variant} ${uiFont.className} text-sm ${className}`;

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={classes}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
