export type PageLocation = {
  id: string;
  parentId?: string | null;
  title: string;
  trashedAt?: string | null;
  page?: boolean;
};
export function ancestors<T extends PageLocation>(pages: T[], id: string): T[] {
  const map = new Map(pages.map((p) => [p.id, p])),
    seen = new Set([id]),
    out: T[] = [];
  let parent = map.get(id)?.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const p = map.get(parent);
    if (!p) break;
    out.unshift(p);
    parent = p.parentId;
  }
  return out;
}
export function canParent(
  pages: PageLocation[],
  id: string,
  parent: string | null,
) {
  if (!parent) return true;
  if (parent === id) return false;
  const target = pages.find((p) => p.id === parent);
  return (
    !!target &&
    target.page !== false &&
    !target.trashedAt &&
    ancestors(pages, parent).length < 40 &&
    !ancestors(pages, parent).some((p) => p.id === id)
  );
}
