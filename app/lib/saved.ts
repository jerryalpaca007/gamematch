// Saved games are remembered in the browser (localStorage) as a list of Steam
// ids, oldest first. There are no accounts yet, so this is per browser.
const KEY = "gamematch:saved";

export function readSavedIds(): number[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function writeSavedIds(ids: number[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage blocked (private window): saving just won't last
  }
}
