import { safeInlineUrl } from "./inline";

/*
 * A callout's own icon, chosen in the editor: an emoji, an uploaded image,
 * or none at all. Without one, the callout shows its kind's emoji (💡 for a
 * note), exactly as before.
 *
 * It rides in Obsidian's callout metadata, after a "|" in the type, so a
 * callout that keeps its kind's emoji is written the way it always was:
 *
 *   > [!NOTE]                        the kind's emoji
 *   > [!TIP|icon=🔥]                 an emoji
 *   > [!TIP|icon=%2Fmedia%2Fa.webp]  an image (encoded: no "]", "|" or spaces)
 *   > [!TIP|icon=none]               no icon
 *
 * Obsidian reads the metadata as data-callout-metadata and ignores it.
 */

export const NO_ICON = "none";

/** "icon=…" from the metadata after the "|", or "" when there is none. */
export function parseCalloutMeta(meta: string | undefined | null): string {
  if (!meta) return "";
  for (const part of meta.split("|")) {
    const m = /^\s*icon=(\S+)\s*$/.exec(part);
    if (!m) continue;
    try {
      return cleanCalloutIcon(decodeURIComponent(m[1]));
    } catch {
      return "";
    }
  }
  return "";
}

/** What goes after the type: "" (the kind's emoji), or "|icon=…". */
export function calloutMeta(icon: unknown): string {
  const value = cleanCalloutIcon(icon);
  if (!value) return "";
  // Emoji are written as themselves, so the Markdown stays readable; an
  // image's URL is encoded so it can't end the brackets or become a link.
  return `|icon=${calloutIconImage(value) ? encodeURIComponent(value) : value}`;
}

/** An emoji (a few characters, at least one beyond ASCII), an image URL, "none", or "". */
export function cleanCalloutIcon(value: unknown): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  if (!s) return "";
  if (s === NO_ICON) return NO_ICON;
  if (calloutIconImage(s)) return s.length <= 2048 ? s : "";
  return /^(?=[\s\S]*[^\x00-\x7f])[^\s\]|%/:<>"]{1,16}$/.test(s) ? s : "";
}

/** The image's URL when the icon is an image, else "". */
export function calloutIconImage(icon: string): string {
  if (!/^(\/|https?:\/\/)/.test(icon)) return "";
  return safeInlineUrl(icon, true);
}
