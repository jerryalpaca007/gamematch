import { useEffect, useState } from "react";

// Extra details Steam only gives one game at a time (see api/game/[id])
export interface GameInfo {
  description?: string;
  price?: string | null;
  screenshots?: { thumb: string; full: string }[];
  requirements?: { minimum: string | null; recommended: string | null };
  developers?: string[];
}

export function useGameInfo(id: number): { info: GameInfo; loading: boolean } {
  // remember which game the answer is for, so an old one is never shown
  const [loaded, setLoaded] = useState<{ id: number; info: GameInfo } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/game/${id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((info: GameInfo | null) => {
        if (!controller.signal.aborted) setLoaded({ id, info: info ?? {} });
      });
    return () => controller.abort();
  }, [id]);

  const current = loaded?.id === id ? loaded.info : null;
  return { info: current ?? {}, loading: current === null };
}
