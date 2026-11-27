// Fetches the long description and price for one game from Steam. The browser
// can't call Steam's store API directly, so this runs on the server.

import { descriptionBlocks, htmlToText } from "@/app/lib/steam-description";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Only digits are allowed, so the id can't change which URL is requested
  if (!/^\d{1,10}$/.test(id)) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }

  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=english`,
  );
  if (!res.ok) {
    return Response.json({ error: "Steam is unavailable" }, { status: 502 });
  }

  const json = (await res.json()) as Record<
    string,
    {
      success: boolean;
      data?: {
        about_the_game?: string;
        detailed_description?: string;
        short_description?: string;
        is_free?: boolean;
        price_overview?: { final_formatted?: string };
        screenshots?: { path_thumbnail?: string; path_full?: string }[];
        pc_requirements?: { minimum?: string; recommended?: string } | [];
        developers?: string[];
        publishers?: string[];
      };
    }
  >;
  const data = json[id]?.success ? json[id].data : undefined;
  if (!data) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }

  // Steam sends [] instead of an object when a game lists no requirements
  const req = Array.isArray(data.pc_requirements)
    ? {}
    : (data.pc_requirements ?? {});
  const reqText = (html?: string) =>
    html
      ? htmlToText(html.replace(/<\/?strong>/gi, "")).replace(
          /^(minimum|recommended):\s*/i,
          "",
        )
      : null;

  return Response.json({
    screenshots: (data.screenshots ?? [])
      .slice(0, 8)
      .map((s) => ({ thumb: s.path_thumbnail, full: s.path_full }))
      .filter((s) => s.thumb && s.full),
    requirements: {
      minimum: reqText(req.minimum),
      recommended: reqText(req.recommended),
    },
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    description: descriptionBlocks(
      data.about_the_game ??
        data.detailed_description ??
        data.short_description ??
        "",
    ),
    price: data.is_free
      ? "Free to play"
      : (data.price_overview?.final_formatted ?? null),
  });
}
