import { SLUG_MAX, slugify } from "./format";

/*
 * The slug suggested for a new post. slugify() makes any title URL-safe
 * (lowercase ASCII, hyphens); this also keeps it short and to the point:
 * filler words go once the title runs long, and it stops at a word boundary.
 *
 *   "The age of constant change and uncertainty" → "age-constant-change-uncertainty"
 *   "Why retrieval was never the hard part"      → "why-retrieval-never-hard-part"
 *
 * Only ever a suggestion for a slug that isn't live yet: a published slug is
 * never rewritten, and a renamed one 301s through `redirectFrom`.
 */

/** Words that carry no meaning in a URL. Question words stay: they match how people search. */
const FILLER = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "of", "to", "in", "on", "at", "by", "for", "from", "with", "into", "onto",
  "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that", "these", "those",
  "just", "very", "really", "so", "than", "then", "my", "our", "your",
]);

/** Short titles keep every word: trimming three words would only blur them. */
const KEEP_ALL_UNDER = 4;
/** A good slug is a handful of words; past this the rest is noise. */
const MAX_WORDS = 7;
const TARGET_LENGTH = 60;

export function suggestSlug(title: string): string {
  const full = slugify(title);
  const words = full.split("-").filter(Boolean);
  if (words.length < KEEP_ALL_UNDER) return full;
  const meaningful = words.filter((w, i) => !FILLER.has(w) || (i === 0 && /^(how|why|what|when|where|who)$/.test(w)));
  const chosen = meaningful.length >= 2 ? meaningful : words;
  const out: string[] = [];
  for (const w of chosen.slice(0, MAX_WORDS)) {
    if ([...out, w].join("-").length > Math.min(TARGET_LENGTH, SLUG_MAX)) break;
    out.push(w);
  }
  return slugify(out.join("-")) || full;
}
