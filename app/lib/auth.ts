import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { account } from "./supabase";

// Who is signed in, shared by the whole site.
export interface AuthState {
  user: User | null;
  loading: boolean; // true until Supabase has told us either way
}

const WAITING: AuthState = { user: null, loading: true };
let state: AuthState = WAITING;
let started = false;
const listeners = new Set<() => void>();

export function getAuth(): AuthState {
  return state;
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  if (!started && typeof window !== "undefined") {
    started = true;
    account.auth.onAuthStateChange((_event, session) => {
      // outside Supabase's own callback, so listeners may safely query it
      setTimeout(() => {
        state = { user: session?.user ?? null, loading: false };
        listeners.forEach((l) => l());
      }, 0);
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useUser(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuth, () => WAITING);
}

// The name to show: the chosen username, Google's name, or the email
export function displayName(user: User): string {
  const meta = user.user_metadata ?? {};
  return meta.username || meta.full_name || meta.name || user.email || "Player";
}

export function signOut() {
  return account.auth.signOut();
}
