/*
 * Pasting from anywhere, AI chats especially, which hand over one of three
 * things:
 *
 *  1. Rich HTML (ChatGPT, Gemini, Google Docs, Notion, web pages): kept, but
 *     cleaned of what doesn't belong in a post — inline styles, fonts,
 *     colours, classes, empty spans, Google Docs' wrapper <b>, <br>s used as
 *     paragraph breaks.
 *  2. Markdown as plain text (Claude, code editors, most "copy" buttons):
 *     parsed as Markdown, so **bold** becomes bold and ## a heading.
 *  3. Plain prose: blank lines become paragraphs; single newlines inside a
 *     paragraph become spaces, unless the text is clearly line-based.
 *
 * And when the HTML is just the Markdown source wrapped in <p>s (some apps
 * do exactly that), the Markdown wins.
 */

/** A score for "this plain text is Markdown". Two or more signals, or one strong one. */
export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  let score = 0;
  if (/^#{1,6}\s+\S/m.test(t)) score += 2;
  if (/^```/m.test(t)) score += 3;
  if (/^\s*[-*+]\s+\S/m.test(t)) score += 1;
  if (/^\s*\d+[.)]\s+\S/m.test(t)) score += 1;
  if (/^\s*[-*]\s+\[[ xX]\]\s/m.test(t)) score += 2;
  if (/^>\s?\S/m.test(t)) score += 1;
  if (/\*\*[^*\n]+\*\*/.test(t) || /__[^_\n]+__/.test(t)) score += 1;
  if (/\[[^\]\n]+\]\((https?:|\/)[^)\s]+\)/.test(t)) score += 2;
  if (/^\|.+\|\s*$/m.test(t) && /^\|?\s*:?-{3,}/m.test(t)) score += 3;
  if (/`[^`\n]+`/.test(t)) score += 1;
  if (/^(-{3,}|\*{3,})\s*$/m.test(t)) score += 1;
  return score >= 2;
}

const DROP_ATTRS = /\s(?:style|class|id|dir|lang|data-[\w-]+|aria-[\w-]+|role|color|face|size|width|height|align|valign|bgcolor|start)="[^"]*"/gi;

/** Clean pasted HTML down to structure. Runs before Tiptap parses it. */
export function cleanPastedHtml(html: string): string {
  let h = html
    // Office and Google Docs noise
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:o|w|v|m):[^>]*>/gi, "")
    .replace(/<meta[^>]*>|<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<b\b[^>]*id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, "$1");
  // Google Docs marks bold/italic by style, not tags: keep what the styles meant.
  h = h
    .replace(/<span\b[^>]*font-weight:\s*(?:700|bold)[^>]*>([\s\S]*?)<\/span>/gi, "<strong>$1</strong>")
    .replace(/<span\b[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<em>$1</em>");
  h = h
    .replace(DROP_ATTRS, "")
    .replace(/<\/?(?:span|font|div|section|article|main|header|footer)\b[^>]*>/gi, (tag) => (/^<\/?div/i.test(tag) ? (tag.startsWith("</") ? "</p>" : "<p>") : ""))
    // "<br><br>" used as a paragraph break
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, "</p><p>")
    .replace(/<p>\s*<\/p>/gi, "");
  return h;
}

/** HTML that's only Markdown wrapped in paragraphs: take the Markdown instead. */
export function htmlIsWrappedMarkdown(html: string, text: string): boolean {
  const structural = /<(h[1-6]|ul|ol|li|pre|code|table|blockquote|strong|b|em|i|a)\b/i.test(html);
  return !structural && looksLikeMarkdown(text);
}

/** Plain prose into paragraphs. Keeps line breaks when the text is line-based (poems, addresses, logs). */
export function proseToParagraphs(text: string): string[] {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const lines = b.split("\n");
    const lineBased = lines.length >= 3 && lines.every((l) => l.length < 60);
    return lineBased ? b : lines.join(" ").replace(/\s{2,}/g, " ");
  });
}
