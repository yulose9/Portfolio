import { postToDraft, type Draft } from "../../../cms/format";
import { fail, json, type AdminFunction } from "../../../cms/server/http";
import { livePosts } from "../../../cms/server/publish";
import { listDrafts } from "../../../cms/server/store";

/*
 * Full-text search across every post: titles, standfirsts and bodies, drafts
 * and live alike. Bodies are searched as the words you'd read, with Markdown
 * syntax stripped, so "hard part" finds **hard** part. Each hit says which
 * occurrence it is, and the editor jumps straight to that one.
 */

/** Markdown → the words on the page, near enough for searching. */
export function plainText(md: string): string {
  return md
    .replace(/```[^\n]*\n/g, "")
    .replace(/```/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/gm, "")
    .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, "")
    .replace(/(\*\*|__|==|~~|`)/g, "")
    .replace(/(^|\s)[*_](\S)/g, "$1$2")
    .replace(/(\S)[*_](\s|$)/g, "$1$2")
    .replace(/\|/g, " ")
    .replace(/[ \t]+/g, " ");
}

type Hit = { field: "title" | "dek" | "body"; snippet: string; start: number; length: number; occurrence: number };

function find(text: string, q: string, field: Hit["field"], limit: number): Hit[] {
  const hay = text.toLowerCase();
  const needle = q.toLowerCase();
  const hits: Hit[] = [];
  let from = 0;
  let occurrence = 0;
  while (hits.length < limit) {
    const at = hay.indexOf(needle, from);
    if (at === -1) break;
    const lo = Math.max(0, at - 60);
    const hi = Math.min(text.length, at + needle.length + 80);
    const prefix = lo > 0 ? "…" : "";
    const snippet = prefix + text.slice(lo, hi).replace(/\s+/g, " ") + (hi < text.length ? "…" : "");
    const start = prefix.length + text.slice(lo, at).replace(/\s+/g, " ").length;
    hits.push({ field, snippet, start, length: needle.length, occurrence });
    occurrence++;
    from = at + needle.length;
  }
  return hits;
}

function count(text: string, q: string): number {
  const hay = text.toLowerCase();
  const needle = q.toLowerCase();
  let n = 0;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) n++;
  return n;
}

export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return fail("Type at least two characters.");
  if (q.length > 100) return fail("That search is too long.");

  const [drafts, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  const known = new Set(drafts.map((d) => d.id));
  const all: Draft[] = [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)];

  const results = all
    .map((d) => {
      const body = plainText(d.body);
      const hits = [...find(d.title, q, "title", 1), ...find(d.dek, q, "dek", 1), ...find(body, q, "body", 3)];
      const total = count(d.title, q) + count(d.dek, q) + count(body, q);
      return { id: d.id, title: d.title, icon: d.icon ?? null, status: d.status, dirty: d.dirty, updatedAt: d.updatedAt, total, hits };
    })
    .filter((r) => r.total > 0)
    // Title matches first, then the most mentions, then the most recent.
    .sort(
      (a, b) =>
        Number(b.hits.some((h) => h.field === "title")) - Number(a.hits.some((h) => h.field === "title")) ||
        b.total - a.total ||
        (a.updatedAt < b.updatedAt ? 1 : -1)
    )
    .slice(0, 30);

  return json({ q, results });
};
