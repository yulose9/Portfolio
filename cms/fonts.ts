import type { FontChoice, Fonts } from "./format";

/*
 * Typefaces a post can wear, from free services. A curated shelf to pick from
 * quickly, and any other Google Fonts family by name.
 *
 * Google Fonts and Fontshare both serve a stylesheet per request; the article
 * page links the one it needs, so a post in Inter loads nothing extra.
 */

export type ShelfFont = FontChoice & { kind: "sans" | "serif" | "display" | "mono"; note: string };

export const FONT_SHELF: ShelfFont[] = [
  { family: "Inter", source: "google", kind: "sans", note: "The site's own" },
  { family: "Geist", source: "google", kind: "sans", note: "Crisp, technical" },
  { family: "IBM Plex Sans", source: "google", kind: "sans", note: "Engineered, warm" },
  { family: "Manrope", source: "google", kind: "sans", note: "Round, modern" },
  { family: "Satoshi", source: "fontshare", kind: "sans", note: "Fontshare · geometric" },
  { family: "General Sans", source: "fontshare", kind: "sans", note: "Fontshare · neutral" },
  { family: "Newsreader", source: "google", kind: "serif", note: "Made for reading" },
  { family: "Source Serif 4", source: "google", kind: "serif", note: "Book-like" },
  { family: "Literata", source: "google", kind: "serif", note: "Long-form" },
  { family: "Fraunces", source: "google", kind: "serif", note: "Soft, characterful" },
  { family: "EB Garamond", source: "google", kind: "serif", note: "Classic" },
  { family: "Gambetta", source: "fontshare", kind: "serif", note: "Fontshare · editorial" },
  { family: "Instrument Serif", source: "google", kind: "display", note: "Headlines" },
  { family: "Playfair Display", source: "google", kind: "display", note: "High contrast" },
  { family: "Clash Display", source: "fontshare", kind: "display", note: "Fontshare · bold" },
  { family: "Space Grotesk", source: "google", kind: "display", note: "Quirky grotesk" },
  { family: "JetBrains Mono", source: "google", kind: "mono", note: "Monospace" },
  { family: "IBM Plex Mono", source: "google", kind: "mono", note: "Monospace" },
];

const FALLBACK: Record<ShelfFont["kind"], string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  display: "ui-serif, Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export function fontStack(font: FontChoice): string {
  const kind = FONT_SHELF.find((f) => f.family === font.family)?.kind ?? "sans";
  return `"${font.family}", ${FALLBACK[kind]}`;
}

/** The stylesheet to link for a font; Inter is already self-hosted, so none. */
export function fontHref(font: FontChoice): string | null {
  if (font.family === "Inter" && font.source === "google") return null;
  if (font.source === "fontshare") {
    const slug = font.family.toLowerCase().replace(/\s+/g, "-");
    return `https://api.fontshare.com/v2/css?f[]=${slug}@300,400,500,600,700&display=swap`;
  }
  const family = font.family.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
}

export function fontLinks(fonts: Fonts | null | undefined): string[] {
  const hrefs = [fonts?.heading, fonts?.body].filter((f): f is FontChoice => Boolean(f)).map(fontHref);
  return [...new Set(hrefs.filter((h): h is string => Boolean(h)))];
}

/** CSS custom properties the article's styles read. */
export function fontVars(fonts: Fonts | null | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (fonts?.heading) vars["--article-heading-font"] = fontStack(fonts.heading);
  if (fonts?.body) vars["--article-body-font"] = fontStack(fonts.body);
  return vars;
}
