import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  siteUrl,
  steamName,
  steamSessionToken,
  verifySteamAnswer,
} from "@/app/lib/steam-openid";

// Step 2: Steam sends the visitor back here with its answer
export async function GET(request: NextRequest) {
  const site = siteUrl();
  const done = (query = "") => {
    const response = NextResponse.redirect(`${site}/auth/steam${query}`);
    response.cookies.set("gm_steam_state", "", {
      path: "/api/auth/steam",
      maxAge: 0,
    });
    return response;
  };

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  if (!state || state !== request.cookies.get("gm_steam_state")?.value) {
    return done("?problem=expired");
  }

  // the service role key stays on the server; never give it a NEXT_PUBLIC_ name
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return done("?problem=setup");

  try {
    const steamId = await verifySteamAnswer(
      params,
      `${site}/api/auth/steam/callback?state=${state}`,
    );
    if (!steamId) return done("?problem=rejected");

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = await steamSessionToken(
      admin,
      steamId,
      await steamName(steamId),
    );

    // Handed over in a short-lived cookie, not in the address: a link someone
    // sends you can't set our cookies, so it can't sign you in as them
    const response = done();
    response.cookies.set("gm_steam_token", token, {
      sameSite: "lax",
      secure: site.startsWith("https:"),
      path: "/auth/steam",
      maxAge: 120,
    });
    return response;
  } catch (error) {
    console.error("Steam sign-in failed:", error);
    return done("?problem=server");
  }
}
