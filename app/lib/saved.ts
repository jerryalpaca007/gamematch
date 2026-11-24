import { useMemo, useSyncExternalStore } from "react";

// Saved games are remembered in the browser (localStorage) as a list of Steam
// ids, oldest first. There are no accounts yet, so this is per browser.
const KEY = "gamematch:saved";
const CHANGED = "gamematch:saved-changed";

function parse(raw: string): number[] {
  try {
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function readSavedIds(): number[] {
  return parse(readRaw());
}

export function writeSavedIds(ids: number[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage blocked (private window): saving just won't last
  }
  // tell every part of this page (the "storage" event only reaches other tabs)
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGED, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGED, callback);
  };
}

// The saved ids as React state that always follows the storage, including
// changes made on another page or in another tab. The storage is the one source
// of truth, so a page that was kept alive in the background can never bring
// back a game that was removed somewhere else.
export function useSavedIds(): number[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parse(raw), [raw]);
}
