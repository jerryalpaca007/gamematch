"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RetroButton from "./RetroButton";
import { displayFont } from "./fonts";

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
        // relative + z-20: stays bright and clickable above the sidebar and the dim
        className="retro-btn retro-btn-white relative z-20 h-10 w-11 flex-col gap-[5px] justify-self-start px-0"
      >
        <span className="h-[3px] w-6 bg-[#14122b]" />
        <span className="h-[3px] w-6 bg-[#14122b]" />
        <span className="h-[3px] w-6 bg-[#14122b]" />
      </button>

      {/* A full-height sidebar over the page, which is dimmed behind it. The page
          itself never moves. Click the dim area, the ✕, the menu button or press
          Escape to close it. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dim"
            aria-hidden
            className="fixed inset-0 bg-black/55"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        {open && (
          <motion.nav
            key="sidebar"
            aria-label="Menu"
            className="retro-raised fixed bottom-0 left-0 top-0 z-10 flex h-dvh w-64 flex-col bg-[#a9a3e3] p-[3px] shadow-[0_0_24px_rgba(214,47,184,0.35)] md:w-72"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            {/* Title bar, as tall as the navbar; the menu button sits on its left */}
            <div className="flex h-[60px] shrink-0 items-center justify-end gap-3 bg-gradient-to-b from-[#c9c4f6] to-[#8d86d6] px-3">
              <span
                className={`${displayFont.className} flex-1 pl-[64px] text-xl font-bold text-[#14122b]`}
              >
                MENU
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="retro-raised flex h-[22px] w-[22px] cursor-pointer items-center justify-center bg-[#d6d3f5] text-sm font-bold leading-none text-[#14122b]"
              >
                ✕
              </button>
            </div>
            <div className="retro-inset mt-[3px] flex flex-1 flex-col gap-3 overflow-y-auto bg-[#3b3a44] p-4">
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
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
