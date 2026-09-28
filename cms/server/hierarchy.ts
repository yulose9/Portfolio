import type { StoreEnv } from "./store";
export const HIERARCHY_KEY = "meta/page-hierarchy.json";
export type Hierarchy = { version: 1; parents: Record<string, string | null> };
export async function readHierarchy(env: StoreEnv) {
  const object = await env.WRITING.get(HIERARCHY_KEY);
  const value = object
    ? await object.json<Hierarchy>()
    : { version: 1 as const, parents: {} };
  if (
    value.version !== 1 ||
    !value.parents ||
    typeof value.parents !== "object" ||
    Array.isArray(value.parents) ||
    Object.entries(value.parents).some(
      ([id, parent]) =>
        !/^[a-z0-9]{12}$/.test(id) ||
        (parent !== null &&
          (typeof parent !== "string" || !/^[a-z0-9]{12}$/.test(parent))),
    )
  )
    throw new Error("Unsupported page hierarchy. Your pages remain stored.");
  return { value, etag: object?.etag };
}
export function applyParent<T extends { id: string; parentId?: string | null }>(
  page: T,
  hierarchy: Hierarchy,
): T {
  return Object.hasOwn(hierarchy.parents, page.id)
    ? { ...page, parentId: hierarchy.parents[page.id] }
    : page;
}
