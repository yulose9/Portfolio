import { DEFAULT_AUTHOR, newId, postToDraft, type Draft } from "../../../../cms/format";
import { json, readJson, type AdminFunction } from "../../../../cms/server/http";
import { livePosts } from "../../../../cms/server/publish";
import { listDrafts, putDraft } from "../../../../cms/server/store";
import { summarize } from "../../../../cms/server/summary";

/** Every post: the R2 working copies, plus any live file never opened here. */
export const onRequestGet: AdminFunction = async ({ env }) => {
  const [all, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  // Reading the list must never permanently delete content.
  const drafts = all;
  const known = new Set(drafts.map((d) => d.id));
  const posts = [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)]
    .map(summarize)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return json({ posts });
};

/** A new, empty draft. */
export const onRequestPost: AdminFunction = async ({ env, request }) => {
  type Input = { title?: string; body?: string; tags?: string[]; page?: boolean };
  const input: Input = await readJson<Input>(request);
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
    tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim().slice(0, 80)).filter(Boolean).slice(0, 8) : [],
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
