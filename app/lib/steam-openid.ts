import type { SupabaseClient } from "@supabase/supabase-js";

// SERVER ONLY: "Sign in through Steam". Steam speaks OpenID 2.0, which Supabase
// doesn't support, so we check Steam's answer ourselves and then open a
// Supabase session for that Steam id.

const STEAM = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const PICK = "http://specs.openid.net/auth/2.0/identifier_select";
const MAX_AGE_MS = 5 * 60 * 1000;

// The address of this site. It comes from configuration and never from the
// request's Host header, which the sender controls: trusting it would let an
// answer Steam gave to another website be replayed here.
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function steamLoginUrl(returnTo: string): string {
  const query = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": siteUrl(),
    "openid.identity": PICK,
    "openid.claimed_id": PICK,
  });
  return `${STEAM}?${query}`;
}

// The Steam id if Steam's answer is genuine, otherwise null
export async function verifySteamAnswer(
  params: URLSearchParams,
  expectedReturnTo: string,
  now = Date.now(),
): Promise<string | null> {
  const openid = [...params].filter(([key]) => key.startsWith("openid."));
  // a repeated field could make us read one value and Steam check another
  if (new Set(openid.map(([key]) => key)).size !== openid.length) return null;

  const get = (name: string) => params.get(`openid.${name}`) ?? "";
  if (get("ns") !== NS || get("mode") !== "id_res") return null;
  if (get("op_endpoint") !== STEAM) return null;
  if (get("return_to") !== expectedReturnTo) return null;

  const claimed = get("claimed_id");
  if (claimed !== get("identity")) return null;
  const match = claimed.match(
    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/,
  );
  if (!match) return null;

  const signed = get("signed").split(",");
  const mustBeSigned = [
    "op_endpoint",
    "claimed_id",
    "identity",
    "return_to",
    "response_nonce",
  ];
  if (!mustBeSigned.every((name) => signed.includes(name))) return null;

  // the nonce starts with the time Steam made the answer
  const made = Date.parse(get("response_nonce").slice(0, 20));
  if (!Number.isFinite(made) || Math.abs(now - made) > MAX_AGE_MS) return null;

  // the step that matters: ask Steam whether it really signed this
  const body = new URLSearchParams(openid);
  body.set("openid.mode", "check_authentication");
  const res = await fetch(STEAM, { method: "POST", body });
  if (!res.ok) return null;
  const answer = (await res.text()).split("\n");
  return answer.includes("is_valid:true") ? match[1] : null;
}

// The player's Steam name, from the public profile page
export async function steamName(steamId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://steamcommunity.com/profiles/${steamId}/?xml=1`,
    );
    const name = (await res.text()).match(
      /<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/,
    )?.[1];
    if (name) return name.slice(0, 32);
  } catch {
    // fall through to the plain name
  }
  return `Steam player ${steamId.slice(-4)}`;
}

// A one-time token that signs the browser in as the account for this Steam id,
// creating the account the first time. `admin` uses the service role key.
export async function steamSessionToken(
  admin: SupabaseClient,
  steamId: string,
  name: string,
): Promise<string> {
  // Steam gives no email, so the account gets an address that can't exist
  const email = `steam_${steamId}@steam.invalid`;

  const create = async () => {
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      // app_metadata can only be written with the service key: this is the
      // proof that the account was made here and not through public sign-up
      app_metadata: { steam_id: steamId },
      user_metadata: { username: name },
    });
    if (error && error.code !== "email_exists") throw error;
  };
  const link = async () => {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) throw error;
    return data;
  };

  await create();
  let data = await link();
  if (data.user.app_metadata?.steam_id !== steamId) {
    // someone signed up with this address themselves, to get in before the real
    // Steam player: remove that account and make a clean one
    const { error } = await admin.auth.admin.deleteUser(data.user.id);
    if (error) throw error;
    await create();
    data = await link();
    if (data.user.app_metadata?.steam_id !== steamId) {
      throw new Error("Could not secure the Steam account");
    }
  }
  return data.properties.hashed_token;
}
