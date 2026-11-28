import { useSyncExternalStore } from "react";

// Games you swiped left on. They are kept in this browser (signed in or not),
// so they stay out of the deck after a refresh. Reset empties the list.

const KEY = "gamematch:passed";
const NONE: number[] = [];

let ids: number[] | null = null; // null = not read from the browser yet
const listeners = new Set<() => void>();

function read(): number[] {
  if (ids) return ids;
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(KEY) ?? "[]",
    );
    ids = Array.isArray(stored) ? stored.filter(Number.isInteger) : [];
  } catch {
    ids = []; // storage blocked or unreadable
  }
  return ids;
}

function set(next: number[]) {
  ids = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked or full: passes then last until the page is reloaded
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // another tab passed or reset games: read the list again
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    ids = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePassed(): number[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}

export function passGame(gameId: number) {
  const current = read();
  if (!current.includes(gameId)) set([...current, gameId]);
}

export function resetPassed() {
  set([]);
}
