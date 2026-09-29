export type OrderedPage = {
  id: string;
  parentId?: string | null;
  trashedAt?: string | null;
  createdAt: string;
  navigationOrder?: number;
};
export type PageOrders = Record<string, string[]>;
export const parentKey = (parent: string | null | undefined) =>
  parent || "root";

/** Order is private navigation state; untouched siblings have a deterministic fallback. */
export function comparePages(a: OrderedPage, b: OrderedPage) {
  return (
    (a.navigationOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.navigationOrder ?? Number.MAX_SAFE_INTEGER) ||
    b.createdAt.localeCompare(a.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
export function withPageOrder<T extends OrderedPage>(
  pages: T[],
  orders: PageOrders = {},
) {
  const ranks = new Map(
    Object.entries(orders).map(([key, ids]) => [
      key,
      new Map(ids.map((id, index) => [id, index])),
    ]),
  );
  return pages.map((p) => ({
    ...p,
    navigationOrder: ranks.get(parentKey(p.parentId))?.get(p.id),
  }));
}
export function siblingIds(pages: OrderedPage[], parent: string | null) {
  return pages
    .filter((p) => !p.trashedAt && (p.parentId ?? null) === parent)
    .sort(comparePages)
    .map((p) => p.id);
}
export function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** Keep ancestors visible during filtering without recursing through malformed legacy cycles. */
export function matchingPageIds<
  T extends { id: string; title: string; parentId?: string | null },
>(pages: T[], query: string) {
  const q = query
    .trim()
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{M}/gu, "");
  const found = new Set<string>();
  const byId = new Map(pages.map((p) => [p.id, p]));
  for (const p of pages) {
    if (
      !p.title
        .normalize("NFKD")
        .toLocaleLowerCase()
        .replace(/\p{M}/gu, "")
        .includes(q)
    )
      continue;
    let current: T | undefined = p;
    const path = new Set<string>();
    while (current && !path.has(current.id)) {
      found.add(current.id);
      path.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  return found;
}
