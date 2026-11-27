"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { Game } from "@/app/lib/types";
import CardFace from "./CardFace";
import { displayFont } from "./fonts";

// One card of the swipe deck. Only the top card can be dragged; the cards behind
// it show their contents too, so the next game is visible as the top one leaves.
export default function SwipeCard({
  game,
  index = 0,
  totalCards = 1,
  leaving,
  onRequestSwipe,
  onCommit,
}: {
  game: Game;
  index?: number;
  totalCards?: number;
  // 1 or -1 while this card is flying off the screen, otherwise null
  leaving: 1 | -1 | null;
  onRequestSwipe: (liked: boolean) => boolean;
  onCommit: () => void;
}) {
  const isTop = index === 0;

  // x follows the finger; tilt, fade and the SAVE / PASS stamps are derived from it
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const fade = useTransform(x, [-600, -250, 0, 250, 600], [0, 1, 1, 1, 0]);
  const opacityLike = useTransform(x, [10, 100], [0, 1]);
  const opacityNope = useTransform(x, [-10, -100], [0, 1]);

  // Cards behind the top one are smaller and lower, which makes the stack.
  // 30+ keeps every card above the pixel buttons (z-20) while it moves.
  const scale = 1 - index * 0.05;
  const yOffset = index * 12;
  const zIndex = 30 + totalCards - index;

  // When asked to leave, slide off the screen from wherever the card is now,
  // and only then tell the deck (onCommit). A ref keeps the latest onCommit.
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  });
  useEffect(() => {
    if (leaving === null) return;
    const controls = animate(x, leaving * 700, {
      duration: 0.26,
      ease: "easeIn",
      onComplete: () => commitRef.current(),
    });
    return () => controls.stop();
  }, [leaving, x]);

  // A long drag or a quick flick asks for a swipe; otherwise the card springs back
  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const right = info.offset.x > 100 || info.velocity.x > 600;
    const left = info.offset.x < -100 || info.velocity.x < -600;
    if ((right || left) && onRequestSwipe(right)) return;
    animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
  };

  return (
    <motion.div
      initial={{ scale, y: yOffset }}
      animate={{ scale, y: yOffset }}
      // when a card moves up the stack it springs into place
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? fade : 1,
        zIndex,
        // pan-y: the browser keeps vertical scrolling, we get horizontal drags
        touchAction: "pan-y",
        // Draw the card on its own layer so moving it doesn't repaint it
        willChange: "transform",
      }}
      drag={isTop && leaving === null ? "x" : false}
      dragElastic={1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <CardFace game={game}>
        {/* SAVE and PASS stamps: only on the top card */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: opacityLike }}
              className={`${displayFont.className} pointer-events-none absolute right-8 top-10 z-10 rotate-12 retro-raised bg-[#31e08a] px-2 py-1 text-xs text-[#14122b]`}
            >
              SAVE
            </motion.div>
            <motion.div
              style={{ opacity: opacityNope }}
              className={`${displayFont.className} pointer-events-none absolute left-8 top-10 z-10 -rotate-12 retro-raised bg-[#d62fb8] px-2 py-1 text-xs text-white`}
            >
              PASS
            </motion.div>
          </>
        )}
      </CardFace>
    </motion.div>
  );
}
