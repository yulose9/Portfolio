import { newId, postToDraft, type Draft } from "../../../../cms/format";
import { json, readJson, type AdminFunction } from "../../../../cms/server/http";
import { livePosts } from "../../../../cms/server/publish";
import { listDrafts, putDraft } from "../../../../cms/server/store";
import { summarize } from "../../../../cms/server/summary";

/** Every post: the R2 working copies, plus any live file never opened here. */
export const onRequestGet: AdminFunction = async ({ env }) => {
  const [drafts, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  const known = new Set(drafts.map((d) => d.id));
  const posts = [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)]
    .map(summarize)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return json({ posts });
};

/** A new, empty draft. */
export const onRequestPost: AdminFunction = async ({ env, request }) => {
  const input = await readJson<{ title?: string }>(request).catch(() => ({ title: "" }));
  const now = new Date().toISOString();
  const draft: Draft = {
    id: newId(),
    title: String(input.title ?? ""),
    slug: "",
    dek: "",
    tags: [],
    cover: null,
    body: "",
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
