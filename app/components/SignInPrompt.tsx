"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { uiFont } from "./fonts";

// Pops up when a signed-out visitor tries to save a game
export default function SignInPrompt({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to save games"
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <RetroWindow title="SignIn.exe" onClose={onClose} bodyClassName="p-5">
          <p
            className={`${uiFont.className} text-center text-lg text-[#ece9ff]`}
          >
            You need an account to save games.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <RetroButton variant="indigo" href="/login" className="w-full">
              Sign in
            </RetroButton>
            <RetroButton variant="magenta" href="/signup" className="w-full">
              Sign up
            </RetroButton>
            <RetroButton variant="white" onClick={onClose} className="w-full">
              Keep browsing
            </RetroButton>
          </div>
        </RetroWindow>
      </div>
    </motion.div>
  );
}

// A problem with saving, shown at the bottom of the screen
export function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`${uiFont.className} retro-raised fixed bottom-3 left-1/2 z-40 w-[min(92vw,34rem)] -translate-x-1/2 bg-[#14122b] px-3 py-2 text-center text-base text-[#ff8be6]`}
    >
      {message}
    </p>
  );
}
