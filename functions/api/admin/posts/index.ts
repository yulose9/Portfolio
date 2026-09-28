import { DEFAULT_AUTHOR, newId, postToDraft, type Draft } from "../../../../cms/format";
import { HttpError, ID, json, readJson, type AdminFunction } from "../../../../cms/server/http";
import { livePosts } from "../../../../cms/server/publish";
import { createDraft, getDraft, listDrafts } from "../../../../cms/server/store";
import { summarize } from "../../../../cms/server/summary";
import { publishedFingerprint } from "../../../../cms/published-fingerprint";
import { applyParent, readHierarchy } from "../../../../cms/server/hierarchy";

/** Every post: the R2 working copies, plus any live file never opened here. */
export const onRequestGet: AdminFunction = async ({ env }) => {
  const [all, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  // Reading the list must never permanently delete content.
  const drafts = all;
  const known = new Set(drafts.map((d) => d.id));
  const hierarchy=(await readHierarchy(env)).value;
  const posts = [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)]
    .map(p=>applyParent(p,hierarchy))
    .map(summarize)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return json({ posts });
};

/** A new, empty draft. */
export const onRequestPost: AdminFunction = async ({ env, request }) => {
  type Input = { title?: string; body?: string; tags?: string[]; page?: boolean; parentId?: string; requestId?:string };
  const input: Input = await readJson<Input>(request);
  if(input.requestId!==undefined && (typeof input.requestId!=="string"||! /^[a-f0-9-]{36}$/.test(input.requestId)))throw new HttpError("Invalid create request ID.");
  const id=input.requestId?(await publishedFingerprint(input.requestId))!.slice(0,12):newId();
  const existing=input.requestId?await getDraft(env,id):null;
  if(existing){if(existing.creationRequestId!==input.requestId)throw new HttpError("This create request conflicts with another page.",409);return json({post:existing});}
  if (input.parentId !== undefined) {
    if (typeof input.parentId !== "string" || !ID.test(input.parentId)) throw new HttpError("Invalid parent page.");
    const parent = await getDraft(env, input.parentId) ?? (await livePosts(env)).find(p => p.id === input.parentId);
    if (!parent || parent.page === false || ("trashedAt" in parent && parent.trashedAt)) throw new HttpError("Parent page not found.", 404);
  }
  const now = new Date().toISOString();
  const draft: Draft = {
    id,
    creationRequestId:input.requestId,
    parentId: input.parentId ?? null,
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
  if(!await createDraft(env,draft)){
    const raced=await getDraft(env,id);
    if(input.requestId&&raced?.creationRequestId===input.requestId)return json({post:raced});
    throw new HttpError("Could not reserve this page ID. Try creating it again.",409);
  }
  return json({ post: draft }, 201);
};
