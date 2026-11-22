"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { pressStart } from "./fonts";
import { NOTCH, px } from "./cardScale";
import PixelPill from "./PixelPill";

// Add a link here and it shows up in the menu on every screen size
const links = [
  { href: "/signup", label: "SIGN UP", color: "#e0201b", text: "#fff" },
  { href: "/login", label: "LOGIN", color: "#e0201b", text: "#fff" },
  { href: "/library", label: "LIBRARY", color: "#ffffff" },
  { href: "/browse", label: "BROWSE", color: "#ffffff" },
  { href: "/about", label: "ABOUT", color: "#ffffff" },
];

// The three-line button in the navbar and the popup card it opens
export default function NavMenu() {
  const [open, setOpen] = useState(false);

  // Escape closes the menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="justify-self-start bg-white active:translate-x-0.5 active:translate-y-0.5"
        style={{ padding: px(3), clipPath: NOTCH }}
      >
        <span
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 bg-[#ffc400]"
          style={{ clipPath: NOTCH }}
        >
          <span className="h-1 w-6 bg-black" />
          <span className="h-1 w-6 bg-black" />
          <span className="h-1 w-6 bg-black" />
        </span>
      </button>

      {/* A panel that slides in from the left edge, under the navbar. There is
          no dark backdrop, so the page behind stays visible and usable. The
          navbar clips sideways overflow, so sliding in never widens the page. */}
      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Menu"
            className="absolute left-3 top-full z-10 mt-3 w-56 md:w-64"
            initial={{ x: "-120%" }}
            animate={{ x: 0 }}
            exit={{ x: "-120%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            {/* White outer shape + dark inner shape, both with notched corners */}
            <div
              className="bg-white"
              style={{ padding: px(3), clipPath: NOTCH }}
            >
              <div
                className="flex flex-col items-center gap-5 bg-[#262629] px-5 py-6"
                style={{ clipPath: NOTCH }}
              >
                <h2
                  className={`${pressStart.className} text-sm text-[#ffc400]`}
                >
                  MENU
                </h2>
                <div className="flex w-full flex-col items-center gap-4">
                  {links.map((link) => (
                    <PixelPill
                      key={link.href}
                      color={link.color}
                      textColor={link.text}
                      href={link.href}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </PixelPill>
                  ))}
                </div>
              </div>
            </div>

            {/* Close button sitting on the panel's top-left corner. It is a
                sibling of the clipped panel above, so the clip can't cut it off. */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute -left-2 -top-3 bg-black active:translate-x-0.5 active:translate-y-0.5"
              style={{ padding: px(3), clipPath: NOTCH }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center bg-[#e0201b] text-white"
                style={{ clipPath: NOTCH }}
              >
                <X className="h-4 w-4" strokeWidth={4} />
              </span>
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
