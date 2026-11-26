import { NextResponse, type NextRequest } from "next/server";
import { siteUrl, steamLoginUrl } from "@/app/lib/steam-openid";

// Step 1: send the visitor to Steam
export async function GET(request: NextRequest) {
  const site = siteUrl();
  // cookies only come back if we start on the same address Steam returns to
  if (request.headers.get("host") !== new URL(site).host) {
    return NextResponse.redirect(`${site}/api/auth/steam`);
  }

  // a random value tying Steam's answer to this browser
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    steamLoginUrl(`${site}/api/auth/steam/callback?state=${state}`),
  );
  response.cookies.set("gm_steam_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: site.startsWith("https:"),
    path: "/api/auth/steam",
    maxAge: 600,
  });
  return response;
}
