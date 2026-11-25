"use client";

import { useRouter } from "next/navigation";
import RetroWindow from "./RetroWindow";

// The About page: an empty window for now. The ✕ goes back to the swipe page,
// like on Browse and Library.
export default function AboutView() {
  const router = useRouter();

  return (
    <RetroWindow
      title="About.exe - GameMatch"
      onClose={() => router.push("/")}
      className="mx-auto max-w-6xl"
      bodyClassName="min-h-[60vh] p-3 md:p-4"
    >
      {null}
    </RetroWindow>
  );
}
