// Fetches the long description and price for one game from Steam. The browser
// can't call Steam's store API directly, so this runs on the server.

// Steam returns HTML; turn it into plain text so it is safe to show
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|h[1-6]|li|div|ul)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
      };
    }
  >;
  const data = json[id]?.success ? json[id].data : undefined;
  if (!data) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }

  const text = htmlToText(
    data.about_the_game ??
      data.detailed_description ??
      data.short_description ??
      "",
  );

  return Response.json({
    description: text.length > 1500 ? `${text.slice(0, 1500).trimEnd()}…` : text,
    price: data.is_free
      ? "Free to play"
      : (data.price_overview?.final_formatted ?? null),
  });
}
