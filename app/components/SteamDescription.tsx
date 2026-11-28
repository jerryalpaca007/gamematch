"use client";

import { useEffect, useRef } from "react";
import type { DescriptionBlock } from "@/app/lib/steam-description";
import { uiFont } from "./fonts";

// A short silent clip, like a GIF. It only loads and plays while it is on screen.
function Clip({
  block,
}: {
  block: Extract<DescriptionBlock, { type: "video" }>;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    watch.observe(video);
    return () => watch.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={block.poster}
      width={block.width}
      height={block.height}
      aria-hidden
      className="mx-auto h-auto max-w-full"
    >
      {block.sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}

// A game's long description: text with Steam's pictures and clips in between.
// Until it has loaded (or if Steam fails) the short summary is shown.
export default function SteamDescription({
  blocks,
  fallback,
}: {
  blocks?: DescriptionBlock[];
  fallback: string;
}) {
  const shown = blocks?.length
    ? blocks
    : [{ type: "text" as const, text: fallback }];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {shown.map((block, i) =>
        block.type === "text" ? (
          <p
            key={i}
            className={`${uiFont.className} whitespace-pre-line text-lg [overflow-wrap:anywhere] leading-6 text-[#ece9ff]`}
          >
            {block.text}
          </p>
        ) : block.type === "image" ? (
          <img
            key={block.src + i}
            src={block.src}
            alt=""
            loading="lazy"
            width={block.width}
            height={block.height}
            className="mx-auto h-auto max-w-full"
          />
        ) : (
          <Clip key={block.sources[0].src + i} block={block} />
        ),
      )}
    </div>
  );
}
