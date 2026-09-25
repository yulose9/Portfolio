import emojiRegex from "emoji-regex";

/*
 * Microsoft's Fluent 3D emoji, in place of the system set, everywhere a post
 * shows an emoji. The images come from the @lobehub/fluent-emoji-3d package on
 * jsDelivr, named by code points ("1f44b", "1f468-200d-1f4bb").
 *
 * The emoji itself stays in the text — the image is only its appearance — so
 * copying, searching and screen readers all still get the real character.
 */

const CDN = "https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets";

/**
 * The package names files by the fully-qualified sequence, which includes the
 * U+FE0F that marks "emoji, not text". Keyboards sometimes leave it off a
 * lone symbol like ❤ or ☺; it's added back for those.
 */
export function fluentUrl(emoji: string): string {
  const points = [...emoji].map((c) => c.codePointAt(0)!.toString(16));
  // ✨ is an emoji by default and has no FE0F; ❤ is text by default and needs one.
  if (points.length === 1 && !/\p{Emoji_Presentation}/u.test(emoji)) points.push("fe0f");
  return `${CDN}/${points.join("-")}.webp`;
}

export const emojiPattern = () => emojiRegex();

/** Split text into runs of plain text and emoji. */
export function splitEmoji(text: string): { text: string; emoji: boolean }[] {
  const out: { text: string; emoji: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(emojiRegex())) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), emoji: false });
    out.push({ text: match[0], emoji: true });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), emoji: false });
  return out;
}
