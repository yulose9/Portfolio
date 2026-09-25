import { newId, type Draft } from "../../../../../cms/format";
import { json, param, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { putDraft, snapshot } from "../../../../../cms/server/store";

/** A copy as a fresh draft: same words, new id, no URL, nothing live. */
export const onRequestPost: AdminFunction<"id"> = async ({ env, params }) => {
  const source = await loadDraft(env, param(params.id));
  const now = new Date().toISOString();
  const copy: Draft = {
    ...source,
    id: newId(),
    title: source.title.trim() ? `${source.title.trim()} (copy)` : "",
    slug: "",
    status: "draft",
    publishAt: null,
    publishedAt: null,
    liveSlug: null,
    redirectFrom: [],
    dirty: true,
    createdAt: now,
    updatedAt: now,
  };
  await putDraft(env, copy);
  await snapshot(env, copy, true, `Duplicated from “${source.title.trim() || "Untitled"}”`);
  return json({ post: copy }, 201);
};
