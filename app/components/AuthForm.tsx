"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/app/lib/supabase";
import { displayName, signOut, useUser } from "@/app/lib/auth";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { displayFont, uiFont } from "./fonts";

export type AuthMode = "signup" | "login" | "forgot" | "reset";

const TEXT: Record<
  AuthMode,
  { window: string; title: string; intro: string; button: string }
> = {
  signup: {
    window: "SignUp.exe",
    title: "SIGN UP",
    intro: "Make an account to save games.",
    button: "Create account",
  },
  login: {
    window: "SignIn.exe",
    title: "SIGN IN",
    intro: "Welcome back. Your deck is waiting.",
    button: "Sign in",
  },
  forgot: {
    window: "Reset.exe",
    title: "FORGOT?",
    intro: "We'll email you a link to set a new password.",
    button: "Send reset link",
  },
  reset: {
    window: "Reset.exe",
    title: "NEW PASSWORD",
    intro: "Choose a new password for your account.",
    button: "Save password",
  },
};

function Field({
  label,
  name,
  type,
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`${uiFont.className} text-base text-[#ece9ff]`}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className={`${uiFont.className} retro-inset w-full bg-black px-3 py-2 text-lg text-[#4fe3f0] focus:outline-2 focus:outline-[#d62fb8]`}
      />
    </label>
  );
}

// "Continue with Google", shown only once Google is switched on in Supabase
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEnabled(!!data?.external?.google);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;
  return (
    <RetroButton
      variant="white"
      className="w-full !py-3 !text-lg"
      onClick={async () => {
        const { error } = await account.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/` },
        });
        if (error) onError(error.message);
      }}
    >
      Continue with Google
    </RetroButton>
  );
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const text = TEXT[mode];

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setError("");
    setNotice("");

    if (
      (mode === "signup" || mode === "reset") &&
      value("password") !== value("confirm")
    ) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await account.auth.signInWithPassword({
          email: value("email"),
          password: value("password"),
        });
        if (error) setError(error.message);
        else router.push("/");
      } else if (mode === "signup") {
        const { data, error } = await account.auth.signUp({
          email: value("email"),
          password: value("password"),
          options: {
            data: { username: value("username").trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) setError(error.message);
        else if (data.session) router.push("/");
        // no session means Supabase is waiting for the email to be confirmed
        else setNotice("Check your email to confirm your account.");
      } else if (mode === "forgot") {
        const { error } = await account.auth.resetPasswordForEmail(
          value("email"),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (error) setError(error.message);
        // the same answer either way, so nobody can test which emails exist
        else
          setNotice(
            "If that email has an account, a reset link is on its way.",
          );
      } else {
        const { error } = await account.auth.updateUser({
          password: value("password"),
        });
        if (error) setError(error.message);
        else setNotice("Password changed. You're signed in.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const link = "text-[#4fe3f0] underline";
  const signedInAlready = !!user && (mode === "login" || mode === "signup");
  // a new password can only be set after opening the link from the email
  const needsLink = mode === "reset" && !loading && !user;

  return (
    <RetroWindow
      title={`${text.window} - GameMatch`}
      onClose={() => router.push("/")}
      className="mx-auto w-full max-w-md"
      bodyClassName="p-5 md:p-6"
    >
      <h1
        className={`${displayFont.className} retro-glitch text-center text-3xl font-bold text-white`}
      >
        {text.title}
      </h1>
      <p
        className={`${uiFont.className} mt-2 text-center text-base text-[#a9a3e3]`}
      >
        {signedInAlready
          ? `You're signed in as ${displayName(user)}.`
          : needsLink
            ? "This reset link has expired or was already used."
            : text.intro}
      </p>

      {signedInAlready ? (
        <div className="mt-5 flex flex-col gap-3">
          <RetroButton variant="indigo" href="/library" className="w-full">
            Open my library
          </RetroButton>
          <RetroButton variant="magenta" onClick={signOut} className="w-full">
            Sign out
          </RetroButton>
        </div>
      ) : needsLink ? (
        <div className="mt-5">
          <RetroButton
            variant="indigo"
            href="/forgot-password"
            className="w-full"
          >
            Send a new link
          </RetroButton>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          {mode === "signup" && (
            <Field
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
            />
          )}
          {mode !== "reset" && (
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
            />
          )}
          {mode !== "forgot" && (
            <Field
              label={mode === "reset" ? "New password" : "Password"}
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? undefined : 8}
            />
          )}
          {(mode === "signup" || mode === "reset") && (
            <Field
              label="Confirm password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
          )}
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className={`${uiFont.className} -mt-2 self-end text-sm ${link}`}
            >
              Forgot password?
            </Link>
          )}

          <RetroButton
            type="submit"
            variant="indigo"
            className="w-full !py-3 !text-lg"
          >
            {busy ? "Please wait..." : text.button}
          </RetroButton>

          {(mode === "login" || mode === "signup") && (
            <>
              <GoogleButton onError={setError} />
              {/* a full page load: the server sends the browser on to Steam */}
              <a
                href="/api/auth/steam"
                className={`retro-btn retro-btn-white ${uiFont.className} w-full !py-3 !text-lg`}
              >
                Continue with Steam
              </a>
            </>
          )}

          <div role="status" className={`${uiFont.className} text-center`}>
            {error && <p className="text-base text-[#ff8be6]">{error}</p>}
            {notice && <p className="text-base text-[#4fe3f0]">{notice}</p>}
          </div>
        </form>
      )}

      <p
        className={`${uiFont.className} mt-5 border-t-2 border-[#d62fb8] pt-3 text-center text-base text-[#ece9ff]`}
      >
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className={link}>
              Sign in
            </Link>
          </>
        ) : mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className={link}>
              Sign up
            </Link>
          </>
        ) : (
          <Link href="/login" className={link}>
            Back to sign in
          </Link>
        )}
      </p>
    </RetroWindow>
  );
}
