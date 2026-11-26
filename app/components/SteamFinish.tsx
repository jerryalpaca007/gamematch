"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/app/lib/supabase";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { uiFont } from "./fonts";

// Shared between React's two development runs, so the one-time token is used once
let pending: Promise<string | null> | null = null;

// Step 3: turn the one-time token from the server into a signed-in session.
// Returns an error message, or null when signed in.
async function finish(): Promise<string | null> {
  const token = document.cookie.match(/(?:^|; )gm_steam_token=([^;]+)/)?.[1];
  document.cookie = "gm_steam_token=; Max-Age=0; path=/auth/steam";
  if (!token) {
    const problem = new URLSearchParams(window.location.search).get("problem");
    if (problem === "setup") return "Steam sign-in isn't set up on the server.";
    if (problem === "rejected") return "Steam didn't confirm that sign-in.";
    return "Steam sign-in didn't finish. Please try again.";
  }
  const { error } = await account.auth.verifyOtp({
    token_hash: decodeURIComponent(token),
    type: "email",
  });
  return error ? `Steam sign-in failed: ${error.message}` : null;
}

export default function SteamFinish() {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pending ??= finish();
    pending.then((message) => {
      if (cancelled) return;
      pending = null;
      if (message) setProblem(message);
      else router.replace("/");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <RetroWindow
      title="Steam.exe - GameMatch"
      onClose={() => router.push("/")}
      className="mx-auto w-full max-w-md"
      bodyClassName="p-5 text-center"
    >
      <p role="status" className={`${uiFont.className} text-lg text-[#ece9ff]`}>
        {problem ?? "Signing you in with Steam..."}
      </p>
      {problem && (
        <div className="mt-4">
          <RetroButton variant="indigo" href="/login">
            Back to sign in
          </RetroButton>
        </div>
      )}
    </RetroWindow>
  );
}
