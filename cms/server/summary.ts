import { readingMinutes, type Draft } from "../format";

/** What the post list needs, without shipping every body to it. */
export function summarize(d: Draft) {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    dek: d.dek,
    tags: d.tags,
    cover: d.cover?.src ?? null,
    status: d.status,
    publishAt: d.publishAt,
    publishedAt: d.publishedAt,
    liveSlug: d.liveSlug,
    dirty: d.dirty,
    minutes: readingMinutes(d.body),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export type PostSummary = ReturnType<typeof summarize>;
