"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RetroWindow from "./RetroWindow";
import RetroButton from "./RetroButton";
import { displayFont, uiFont } from "./fonts";

// MOCKUP ONLY. This shows how Sign up and Sign in will look. It does nothing:
// there is no form to submit, the buttons have no action and nothing typed here
// is read, sent or saved.

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: "text" | "email" | "password";
  autoComplete: string;
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
        className={`${uiFont.className} retro-inset w-full bg-black px-3 py-2 text-lg text-[#4fe3f0] focus:outline-2 focus:outline-[#d62fb8]`}
      />
    </label>
  );
}

export default function AuthMockup({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const signup = mode === "signup";

  return (
    <RetroWindow
      title={signup ? "SignUp.exe - GameMatch" : "SignIn.exe - GameMatch"}
      onClose={() => router.push("/")}
      className="mx-auto w-full max-w-md"
      bodyClassName="p-5 md:p-6"
    >
      <h1
        className={`${displayFont.className} retro-glitch text-center text-3xl font-bold text-white`}
      >
        {signup ? "SIGN UP" : "SIGN IN"}
      </h1>
      <p
        className={`${uiFont.className} mt-2 text-center text-base text-[#a9a3e3]`}
      >
        {signup
          ? "Make an account to keep your deck."
          : "Welcome back. Your deck is waiting."}
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {signup && (
          <Field
            label="Username"
            name="username"
            type="text"
            autoComplete="username"
          />
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {signup && (
          <Field
            label="Confirm password"
            name="confirm"
            type="password"
            autoComplete="new-password"
          />
        )}
        {!signup && (
          <span
            className={`${uiFont.className} -mt-2 self-end text-sm text-[#6f69b8]`}
            title="Coming with accounts"
          >
            Forgot password?
          </span>
        )}

        <RetroButton variant="indigo" className="w-full !py-3 !text-lg">
          {signup ? "Create account" : "Sign in"}
        </RetroButton>
      </div>

      <p
        className={`${uiFont.className} mt-5 border-t-2 border-[#d62fb8] pt-3 text-center text-base text-[#ece9ff]`}
      >
        {signup ? "Already have an account? " : "New here? "}
        <Link
          href={signup ? "/login" : "/signup"}
          className="text-[#4fe3f0] underline"
        >
          {signup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </RetroWindow>
  );
}
