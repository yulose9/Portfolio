import type { DocumentIndex } from "./research";

export type SearchOptions = {
  mode?: "phrase" | "words";
  status?: string;
  tag?: string;
  root?: string;
};
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/ς/g, "σ")
    .replace(/\s+/g, " ");
/** Preserve offsets into the displayed string even when normalization expands characters. */
export function normalizedText(text: string) {
  let value = "";
  const starts: number[] = [],
    ends: number[] = [];
  let offset = 0;
  for (const char of text) {
    const normalized = normalizeSearch(char);
    for (const c of normalized) {
      const token = /\s/u.test(c) ? " " : c;
      if (token === " " && value.endsWith(" ")) {
        ends[ends.length - 1] = offset + char.length;
        continue;
      }
      value += token;
      for (let i = 0; i < token.length; i++) {
        starts.push(offset);
        ends.push(offset + char.length);
      }
    }
    offset += char.length;
    if (!normalized && ends.length) ends[ends.length - 1] = offset;
  }
  return { value, starts, ends };
}
export function searchDocuments(
  all: DocumentIndex[],
  query: string,
  options: SearchOptions = {},
) {
  const q = normalizeSearch(query).trim();
  if (!q) return [];
  const terms = [...new Set(options.mode === "words" ? q.split(" ") : [q])];
  const byId = new Map(all.map((d) => [d.id, d]));
  const inScope = (id: string) => {
    if (!options.root) return true;
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      if (id === options.root) return true;
      seen.add(id);
      id = byId.get(id)?.parentId ?? "";
    }
    return false;
  };
  const candidates = all
    .filter(
      (d) =>
        (!options.status || d.status === options.status) &&
        (!options.tag || d.tags.includes(options.tag)) &&
        inScope(d.id),
    )
    .flatMap((d) => {
      const hay =
        d.searchText ?? normalizeSearch(`${d.title} ${d.dek} ${d.text}`);
      if (!terms.every((t) => hay.includes(t))) return [];
      const title = d.searchTitle ?? normalizeSearch(d.title);
      let total = 0;
      for (const term of terms)
        for (
          let at = hay.indexOf(term);
          at !== -1;
          at = hay.indexOf(term, at + term.length)
        )
          total++;
      const score =
        (title === q ? 1000 : 0) +
        (title.includes(q) ? 100 : 0) +
        terms.filter((t) => title.includes(t)).length * 10;
      return [{ d, total, score }];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.total - a.total ||
        b.d.updatedAt.localeCompare(a.d.updatedAt) ||
        a.d.id.localeCompare(b.d.id),
    )
    .slice(0, 30);
  return candidates.map(({ d, total, score }) => {
    const hits: {
      field: "title" | "dek" | "body";
      snippet: string;
      start: number;
      length: number;
      occurrence: number;
      blockId?: string;
    }[] = [];
    const collect = (
      text: string,
      field: "title" | "dek" | "body",
      blockId?: string,
    ) => {
      if (
        hits.filter((h) => h.field === field).length >=
        (field === "body" ? 3 : 1)
      )
        return;
      // Common ASCII prose has a direct offset map; avoid allocating a mapping
      // for every character of a long document just to show three snippets.
      const direct = !/[^\x20-\x7e]| {2}/.test(text);
      const n = direct
        ? { value: text.toLowerCase(), starts: null, ends: null }
        : normalizedText(text);
      const ranges: { start: number; end: number }[] = [];
      for (const term of terms)
        for (
          let at = n.value.indexOf(term);
          at !== -1;
          at = n.value.indexOf(term, at + term.length)
        ) {
          if (ranges.length < 12)
            ranges.push({
              start: n.starts?.[at] ?? at,
              end: n.ends?.[at + term.length - 1] ?? at + term.length,
            });
        }
      ranges.sort((a, b) => a.start - b.start);
      for (const r of ranges) {
        if (
          hits.filter((h) => h.field === field).length >=
          (field === "body" ? 3 : 1)
        )
          break;
        const lo = Math.max(0, r.start - 60),
          hi = Math.min(text.length, r.end + 80),
          prefix = lo ? "…" : "";
        hits.push({
          field,
          snippet: prefix + text.slice(lo, hi) + (hi < text.length ? "…" : ""),
          start: prefix.length + r.start - lo,
          length: r.end - r.start,
          occurrence: hits.filter((h) => h.field === field).length,
          ...(blockId ? { blockId } : {}),
        });
      }
    };
    collect(d.title, "title");
    collect(d.dek, "dek");
    if (d.blocks.length) d.blocks.forEach((b) => collect(b.text, "body", b.id));
    else collect(d.text, "body");
    return {
      id: d.id,
      title: d.title,
      icon: d.icon,
      status: d.status,
      dirty: d.dirty,
      updatedAt: d.updatedAt,
      total,
      hits,
      score,
    };
  });
}
