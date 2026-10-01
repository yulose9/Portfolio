import type { DocumentIndex } from "./research";
import { normalizeSearch, normalizedText } from "./search";

export type UnlinkedMention = {
  id: string;
  title: string;
  snippet: string;
  start: number;
  length: number;
  blockId?: string;
};
export function unlinkedMentions(index: DocumentIndex[], id: string) {
  const target = index.find((d) => d.id === id);
  const query = normalizeSearch(target?.title ?? "").trim();
  const items: UnlinkedMention[] = [];
  let total = 0;
  if (query.length < 2 || query === "untitled") return { items, total };
  const word = (char: string) => /[\p{L}\p{N}_]/u.test(char);
  for (const source of [...index].sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
  )) {
    if (source.id === id || source.references.some((r) => r.target === id))
      continue;
    for (const block of source.mentionBlocks ?? []) {
      const value = normalizeSearch(block.text);
      let at = value.indexOf(query);
      while (
        at !== -1 &&
        ((word(query[0]) && word(value[at - 1] ?? "")) ||
          (word(query.at(-1)!) && word(value[at + query.length] ?? "")))
      )
        at = value.indexOf(query, at + query.length);
      if (at === -1) continue;
      total++;
      if (items.length < 30) {
        const mapped = normalizedText(block.text);
        const start = mapped.starts[at],
          end = mapped.ends[at + query.length - 1];
        const lo = Math.max(0, start - 60),
          hi = Math.min(block.text.length, end + 100),
          prefix = lo ? "…" : "";
        items.push({
          id: source.id,
          title: source.title,
          snippet:
            prefix +
            block.text.slice(lo, hi) +
            (hi < block.text.length ? "…" : ""),
          start: prefix.length + start - lo,
          length: end - start,
          ...(block.blockId ? { blockId: block.blockId } : {}),
        });
      }
      break;
    }
  }
  return { items, total };
}

export function connectionHealth(index: DocumentIndex[]) {
  const byId = new Map(index.map((d) => [d.id, d]));
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const doc of index) {
    const targets = new Set(
      doc.references.map((r) => r.target).filter((id) => id !== doc.id),
    );
    outgoing.set(doc.id, targets);
    for (const id of targets)
      if (byId.has(id)) {
        const sources = incoming.get(id) ?? new Set<string>();
        sources.add(doc.id);
        incoming.set(id, sources);
      }
  }
  return index
    .map((doc) => {
      const targets = [...(outgoing.get(doc.id) ?? [])];
      return {
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        incoming: incoming.get(doc.id)?.size ?? 0,
        outgoing: targets.filter((id) => byId.has(id)).length,
        missing: targets.filter((id) => !byId.has(id)).length,
      };
    })
    .sort(
      (a, b) =>
        b.missing - a.missing ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
}
export type ConnectionRow = ReturnType<typeof connectionHealth>[number];
