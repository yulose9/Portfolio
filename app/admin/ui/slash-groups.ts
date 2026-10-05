/*
 * How the "/" menu is grouped and searched, kept apart from the menu's React
 * so it can be tested on its own.
 *
 * The sections follow Notion's menu, in Notion's order. Every item has an id;
 * SLASH_ORDER says where it sits, and its section is the last heading above
 * it. An id that isn't listed goes to the end of "Advanced".
 */

export const SLASH_GROUPS = ["Basic blocks", "Media", "Advanced", "Inline"] as const;
export type SlashGroup = (typeof SLASH_GROUPS)[number];

export const SLASH_ORDER: Record<SlashGroup, string[]> = {
  "Basic blocks": [
    "paragraph",
    "h1",
    "h2",
    "h3",
    "bullet",
    "ordered",
    "todo",
    "toggle",
    "quote",
    "divider",
    "callout",
    "toggleH1",
    "toggleH2",
    "toggleH3",
    "page-link",
  ],
  Media: ["image", "voice", "embed", "github"],
  Advanced: ["table", "data-table", "code", "code-tabs", "chart", "poll", "citation", "heading-icon"],
  Inline: ["mention", "date", "emoji", "inline-logo"],
};

const PLACE = new Map<string, { group: SlashGroup; rank: number }>();
let rank = 0;
for (const group of SLASH_GROUPS) for (const id of SLASH_ORDER[group]) PLACE.set(id, { group, rank: rank++ });

/** Unlisted items: after the last listed "Advanced" one, before "Inline". */
const UNLISTED = PLACE.get(SLASH_ORDER.Inline[0])!.rank - 0.5;

/** The section an item belongs to. */
export const slashGroupOf = (id: string): SlashGroup => PLACE.get(id)?.group ?? "Advanced";

type Searchable = { id: string; title: string; keywords: string[]; shortcut?: string };

/** Put items in menu order: section by section, Notion's order within each. */
export function orderSlashItems<T extends Searchable>(items: T[]): T[] {
  const place = (item: T) => PLACE.get(item.id)?.rank ?? UNLISTED;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => place(a.item) - place(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * How well an item matches the query, lower is better; null when it doesn't.
 * The title counts most (whole, then its start, then the start of a word),
 * then a keyword, then the Markdown shortcut, then the title anywhere.
 */
export function slashScore(item: Searchable, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = item.title.toLowerCase();
  if (title === q) return 0;
  if (title.startsWith(q)) return 1;
  if (title.split(/[\s,/-]+/).some((word) => word.startsWith(q))) return 2;
  if (item.keywords.some((k) => k === q)) return 3;
  if (item.keywords.some((k) => k.startsWith(q))) return 4;
  if (item.shortcut && item.shortcut === q) return 4;
  if (title.includes(q)) return 5;
  return null;
}

/**
 * The menu for a query. With nothing typed, every item in menu order. With a
 * query, only the items that match: sections with no match drop out, the
 * section holding the best match comes first, and within a section the best
 * match leads. Sections stay together, so each heading appears once.
 */
export function filterSlashItems<T extends Searchable & { group: SlashGroup }>(items: T[], query: string): T[] {
  const ordered = orderSlashItems(items);
  if (!query.trim()) return ordered;
  const scored = ordered
    .map((item, index) => ({ item, index, score: slashScore(item, query) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null);
  const best = new Map<SlashGroup, number>();
  for (const { item, score } of scored) best.set(item.group, Math.min(best.get(item.group) ?? Infinity, score));
  const groupRank = (group: SlashGroup) => SLASH_GROUPS.indexOf(group);
  return scored
    .sort(
      (a, b) =>
        best.get(a.item.group)! - best.get(b.item.group)! ||
        groupRank(a.item.group) - groupRank(b.item.group) ||
        a.score - b.score ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}
