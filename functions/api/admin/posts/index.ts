import { DEFAULT_AUTHOR, newId, postToDraft, type Draft } from "../../../../cms/format";
import { json, readJson, type AdminFunction } from "../../../../cms/server/http";
import { livePosts } from "../../../../cms/server/publish";
import { deleteDraft, listDrafts, putDraft } from "../../../../cms/server/store";
import { summarize } from "../../../../cms/server/summary";

/** Every post: the R2 working copies, plus any live file never opened here. */
const TRASH_DAYS = 60;

export const onRequestGet: AdminFunction = async ({ env, waitUntil }) => {
  const [all, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  // Empty trash older than 60 days, after answering.
  const cutoff = Date.now() - TRASH_DAYS * 864e5;
  const expired = all.filter((d) => d.trashedAt && Date.parse(d.trashedAt) < cutoff);
  if (expired.length) waitUntil(Promise.all(expired.map((d) => deleteDraft(env, d.id))));
  const drafts = all.filter((d) => !expired.includes(d));
  const known = new Set(drafts.map((d) => d.id));
  const posts = [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)]
    .map(summarize)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return json({ posts });
};

/** A new, empty draft. */
export const onRequestPost: AdminFunction = async ({ env, request }) => {
  type Input = { title?: string; body?: string; tags?: string[]; page?: boolean };
  const input: Input = await readJson<Input>(request).catch(() => ({}));
  const now = new Date().toISOString();
  const draft: Draft = {
    id: newId(),
    title: String(input.title ?? "").slice(0, 300),
    slug: "",
    dek: "",
    icon: null,
    authors: [DEFAULT_AUTHOR],
    fonts: null,
    page: input.page !== false,
    ogImage: null,
    tags: Array.isArray(input.tags) ? input.tags.map(String).slice(0, 8) : [],
    cover: null,
    body: typeof input.body === "string" ? input.body.slice(0, 400_000) : "",
    status: "draft",
    publishAt: null,
    publishedAt: null,
    liveSlug: null,
    redirectFrom: [],
    dirty: true,
    createdAt: now,
    updatedAt: now,
  };
  await putDraft(env, draft);
  return json({ post: draft }, 201);
};
