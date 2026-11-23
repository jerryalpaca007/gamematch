// Reads a game's minimum system requirements from Steam's HTML text and works
// out three things the Browse page can filter on:
//   minRamGb      the RAM the game needs, in GB
//   minGraphics   the graphics line as Steam prints it
//   integratedOk  a best guess: will it run on integrated graphics (Intel HD or
//                 UHD, Iris, AMD Vega and similar)? This is a judgement from free
//                 text, not a certainty. null means Steam did not say enough.

export type ParsedRequirements = {
  minRamGb: number | null;
  minGraphics: string | null;
  integratedOk: boolean | null;
};

function toLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseRam(lines: string[]): number | null {
  const line = lines.find((l) => /^(memory|ram|system memory)\b/i.test(l));
  if (!line) return null;
  const m = line.match(/([\d]+(?:[.,]\d+)?)\s*(gb|g\b|mb|m\b)/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  const gb = /^g/i.test(m[2]) ? value : value / 1024;
  return Math.round(gb * 100) / 100;
}

// One graphics card (or description) on its own: is it low-end enough for
// integrated graphics? true = yes, false = a real dedicated card, null = unclear.
function lowEnd(alt: string): boolean | null {
  const t = alt.toLowerCase();

  // Integrated graphics named outright, or very old / generic requirements
  if (
    /intel\s*(hd|uhd|iris|graphics|integrated)|integrated|igpu|onboard|shared (graphics )?memory|\bapu\b|vega\s*(3|6|7|8|10|11)\b|radeon\s*(r[2-5]\b|graphics)|\b(680|780)m\b/.test(
      t,
    )
  )
    return true;
  if (
    /\b\d{2,3}\s*mb\b.*(video|vram|graphics|memory)|(video|graphics).*\b\d{2,3}\s*mb\b|\bdirectx\s*(9|10)\b|shader model|pixel shader|any (dx|directx|video|graphics|gpu)|opengl\s*[1-3]\./.test(
      t,
    )
  )
    return true;

  // NVIDIA: GTX 6xx and below, any GT, and the old 8xxx / 9xxx series
  const gtx = t.match(/gtx\s*(\d{3,4})/);
  if (gtx) return Number(gtx[1]) <= 650;
  if (/\bgts?\s*\d{3,4}/.test(t)) return true;
  const old = t.match(/geforce\s*(?:gts?\s*)?(\d{4})\b/);
  if (old && Number(old[1]) < 1000) return true; // 8600, 9800 and so on
  if (/rtx\s*\d{3,4}|gtx\s*(9|10|16)\d{2}/.test(t)) return false;

  // AMD: Radeon HD up to about a 6670 / 7750, and the small R-series
  const hd = t.match(/radeon\s*hd\s*(\d{4})/) ?? t.match(/\bhd\s?(\d{4})\b/);
  if (hd) {
    const n = Number(hd[1]);
    const series = Math.floor(n / 1000);
    const sub = n % 1000;
    return (
      series <= 3 || (series <= 6 && sub <= 670) || (series === 7 && sub <= 750)
    );
  }
  if (
    /\brx\s*\d{3,4}|\br9\b|\bvega\s*(56|64)\b|radeon\s*vii|\barc\b|a\d{3}\b/.test(
      t,
    )
  )
    return false;
  return null;
}

function integratedGuess(graphics: string | null): boolean | null {
  if (!graphics) return null;
  // "A or B": the game runs if you have any one of them, so one low-end option is enough
  const alts = graphics
    .split(/\bor\b|\/|,|;|\band\b/i)
    .map((a) => a.trim())
    .filter(Boolean);
  const results = alts.map(lowEnd);
  if (results.some((r) => r === true)) return true;
  if (results.some((r) => r === false)) return false;
  return lowEnd(graphics);
}

export function parseRequirements(
  html: string | undefined | null,
): ParsedRequirements {
  if (!html || typeof html !== "string") {
    return { minRamGb: null, minGraphics: null, integratedOk: null };
  }
  const lines = toLines(html);
  const gfxLine = lines.find((l) => /^(graphics|video( card)?|gpu)\b/i.test(l));
  const minGraphics = gfxLine
    ? gfxLine.replace(/^[^:]*:\s*/, "").trim() || null
    : null;
  return {
    minRamGb: parseRam(lines),
    minGraphics,
    integratedOk: integratedGuess(minGraphics),
  };
}
