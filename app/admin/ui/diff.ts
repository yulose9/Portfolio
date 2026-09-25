/*
 * A word-level diff, for showing what a revision changed.
 *
 * Common prefix and suffix are trimmed first (between two saves of a post,
 * almost everything is), then the middle is diffed by longest common
 * subsequence. A middle too large for that (a paste of a whole new section,
 * say) is diffed by line instead, and failing that shown as replaced.
 */

export type Piece = { op: "eq" | "ins" | "del"; text: string };

const tokenize = (s: string) => s.match(/\s+|[\p{L}\p{N}’'_-]+|[^\s\p{L}\p{N}]/gu) ?? [];
const lines = (s: string) => s.match(/[^\n]*\n|[^\n]+$/g) ?? [];

const CELLS = 4_000_000;

function lcs(a: string[], b: string[]): Piece[] | null {
  const n = a.length;
  const m = b.length;
  if ((n + 1) * (m + 1) > CELLS) return null;
  const w = m + 1;
  const t = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const out: Piece[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: "eq", text: a[i] });
      i++;
      j++;
    } else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) out.push({ op: "del", text: a[i++] });
    else out.push({ op: "ins", text: b[j++] });
  }
  while (i < n) out.push({ op: "del", text: a[i++] });
  while (j < m) out.push({ op: "ins", text: b[j++] });
  return out;
}

function merge(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last && last.op === p.op) last.text += p.text;
    else out.push({ ...p });
  }
  return out;
}

export function diffWords(before: string, after: string): Piece[] {
  const a = tokenize(before);
  const b = tokenize(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const middle =
    lcs(midA, midB) ??
    lcs(lines(midA.join("")), lines(midB.join(""))) ?? [
      { op: "del" as const, text: midA.join("") },
      { op: "ins" as const, text: midB.join("") },
    ];
  return merge(([
    { op: "eq", text: a.slice(0, start).join("") },
    ...middle,
    { op: "eq", text: a.slice(endA).join("") },
  ] as Piece[]).filter((p) => p.text));
}

export const countWords = (s: string) => s.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;

/** Words added and removed, for the timeline's "+120 −4". */
export function wordDelta(pieces: Piece[]) {
  let added = 0;
  let removed = 0;
  for (const p of pieces) {
    if (p.op === "ins") added += countWords(p.text);
    if (p.op === "del") removed += countWords(p.text);
  }
  return { added, removed };
}
