export type TagPage = { title: string; description: string; updatedAt: string | null };
export const validTagSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160;
export function tagPage(value: unknown): TagPage {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    title: typeof v.title === "string" ? v.title.trim().slice(0, 100) : "",
    description: typeof v.description === "string" ? v.description.trim().slice(0, 2000) : "",
    updatedAt: typeof v.updatedAt === "string" && Number.isFinite(Date.parse(v.updatedAt)) ? v.updatedAt : null,
  };
}
