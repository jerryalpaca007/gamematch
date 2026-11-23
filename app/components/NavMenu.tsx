"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";

// Add a link here and it shows up in the menu on every screen size
const links = [
  { href: "/signup", label: "Sign up", variant: "indigo" },
  { href: "/login", label: "Login", variant: "indigo" },
  { href: "/library", label: "Library", variant: "white" },
  { href: "/browse", label: "Browse", variant: "white" },
  { href: "/about", label: "About", variant: "white" },
] as const;

// The menu button in the navbar and the window it opens
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
        className="retro-btn retro-btn-white h-10 w-11 flex-col gap-[5px] justify-self-start px-0"
      >
        <span className="h-[3px] w-6 bg-[#14122b]" />
        <span className="h-[3px] w-6 bg-[#14122b]" />
        <span className="h-[3px] w-6 bg-[#14122b]" />
      </button>

      {/* A window that slides in from the left edge, under the navbar. There is
          no dark backdrop, so the page behind stays visible and usable. The
          navbar clips sideways overflow, so sliding in never widens the page. */}
      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Menu"
            className="absolute left-3 top-full z-10 mt-3 w-56 md:w-64"
            // 100% is the navbar's height, so this reaches the bottom of the screen
            style={{ height: "calc(100dvh - 100% - 24px)" }}
            initial={{ x: "-120%" }}
            animate={{ x: 0 }}
            exit={{ x: "-120%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <RetroWindow
              title="Menu"
              onClose={() => setOpen(false)}
              className="flex h-full flex-col"
              bodyClassName="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            >
              {links.map((link) => (
                <RetroButton
                  key={link.href}
                  variant={link.variant}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="w-full"
                >
                  {link.label}
                </RetroButton>
              ))}
            </RetroWindow>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
