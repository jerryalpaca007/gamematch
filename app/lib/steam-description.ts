// Turns Steam's "about this game" HTML into a list of blocks we can show safely:
// plain text, pictures and short silent clips. Steam's HTML is never put on the
// page itself; only text and media links from Steam's own servers get through.

export type DescriptionBlock =
  | { type: "text"; text: string }
  | { type: "image"; src: string; width?: number; height?: number }
  | {
      type: "video";
      sources: { src: string; type: string }[];
      poster?: string;
      width?: number;
      height?: number;
    };

export function htmlToText(html: string): string {
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

// The value of one attribute of an HTML tag
function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return (match?.[1] ?? match?.[2] ?? match?.[3])?.replace(/&amp;/g, "&");
}

// Only https links to Steam's own file servers
function steamUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.endsWith(".steamstatic.com")
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function size(tag: string) {
  const number = (name: string) => Number(attribute(tag, name)) || undefined;
  return { width: number("width"), height: number("height") };
}

export function descriptionBlocks(html: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  // the capturing group keeps the media tags as their own pieces
  const pieces = html.split(/(<video\b[\s\S]*?<\/video>|<img\b[^>]*>)/i);
  for (const piece of pieces) {
    if (/^<img\b/i.test(piece)) {
      const src = steamUrl(attribute(piece, "src"));
      if (src) blocks.push({ type: "image", src, ...size(piece) });
    } else if (/^<video\b/i.test(piece)) {
      const opening = piece.slice(0, piece.indexOf(">") + 1);
      const sources = (piece.match(/<source\b[^>]*>/gi) ?? []).flatMap(
        (tag) => {
          const src = steamUrl(attribute(tag, "src"));
          return src ? [{ src, type: attribute(tag, "type") ?? "" }] : [];
        },
      );
      if (sources.length) {
        blocks.push({
          type: "video",
          sources,
          poster: steamUrl(attribute(opening, "poster")),
          ...size(opening),
        });
      }
    } else {
      const text = htmlToText(piece);
      if (text) blocks.push({ type: "text", text });
    }
  }
  return blocks;
}
