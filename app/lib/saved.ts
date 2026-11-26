import { useSyncExternalStore } from "react";
import { getAuth, subscribeAuth } from "./auth";
import { account } from "./supabase";

// Saved games belong to an account: they live in the Supabase table
// "saved_games" (see supabase/saved_games.sql). Row Level Security there lets
// each person read and change only their own rows. Signed out, nothing saves.

export interface SavedState {
  ids: number[]; // Steam ids, oldest first
  loading: boolean;
  error: string | null;
}

// Where games were kept before accounts; moved into the account at sign-in
const BROWSER_KEY = "gamematch:saved";

const WAITING: SavedState = { ids: [], loading: true, error: null };
const SIGNED_OUT: SavedState = { ids: [], loading: false, error: null };

let state: SavedState = WAITING;
let userId: string | null | undefined; // undefined = not known yet
let watching = false;
const listeners = new Set<() => void>();

function set(next: SavedState) {
  state = next;
  listeners.forEach((l) => l());
}

function explain(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return "Saving isn't set up yet: run supabase/saved_games.sql in Supabase.";
  }
  return `Couldn't update your saved games: ${error.message}`;
}

// Copy games saved in this browser before accounts existed into the account
async function moveBrowserSaves(id: string): Promise<void> {
  let ids: unknown;
  try {
    ids = JSON.parse(window.localStorage.getItem(BROWSER_KEY) ?? "[]");
  } catch {
    return;
  }
  if (!Array.isArray(ids) || ids.length === 0) return;
  const start = Date.now();
  const rows = ids.filter(Number.isInteger).map((steam_app_id, i) => ({
    user_id: id,
    steam_app_id,
    saved_at: new Date(start + i).toISOString(), // keeps their order
  }));
  const { error } = await account.from("saved_games").upsert(rows, {
    onConflict: "user_id,steam_app_id",
    ignoreDuplicates: true,
  });
  // only forget the browser copy once the account really has it
  if (!error) window.localStorage.removeItem(BROWSER_KEY);
}

async function load(id: string) {
  await moveBrowserSaves(id);
  const { data, error } = await account
    .from("saved_games")
    .select("steam_app_id")
    .order("saved_at", { ascending: true });
  if (userId !== id) return; // someone else signed in meanwhile
  set(
    error
      ? { ids: [], loading: false, error: explain(error) }
      : {
          ids: data.map((row) => Number(row.steam_app_id)),
          loading: false,
          error: null,
        },
  );
}

function followAccount() {
  const { user, loading } = getAuth();
  if (loading) return;
  const id = user?.id ?? null;
  if (id === userId) return;
  userId = id;
  if (!id) {
    set(SIGNED_OUT);
    return;
  }
  set(WAITING);
  void load(id);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    subscribeAuth(followAccount);
    followAccount();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useSaved(): SavedState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => WAITING,
  );
}

// The screen updates straight away; if Supabase refuses, the change is undone
export async function saveGame(gameId: number) {
  const id = userId;
  if (!id || state.ids.includes(gameId)) return;
  set({ ...state, ids: [...state.ids, gameId], error: null });
  const { error } = await account
    .from("saved_games")
    .upsert(
      { user_id: id, steam_app_id: gameId },
      { onConflict: "user_id,steam_app_id", ignoreDuplicates: true },
    );
  if (error && userId === id) {
    set({
      ...state,
      ids: state.ids.filter((x) => x !== gameId),
      error: explain(error),
    });
  }
}

export async function removeGame(gameId: number) {
  const id = userId;
  if (!id) return;
  const before = state.ids;
  set({ ...state, ids: before.filter((x) => x !== gameId), error: null });
  const { error } = await account
    .from("saved_games")
    .delete()
    .eq("user_id", id)
    .eq("steam_app_id", gameId);
  if (error && userId === id) {
    set({ ...state, ids: before, error: explain(error) });
  }
}
