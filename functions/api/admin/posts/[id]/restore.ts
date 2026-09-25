import { json, param, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { putDraft } from "../../../../../cms/server/store";

/** Out of the trash, as a draft. (If it had been live, publish it again.) */
export const onRequestPost: AdminFunction<"id"> = async ({ env, params }) => {
  const draft = await loadDraft(env, param(params.id));
  const post = { ...draft, trashedAt: null, updatedAt: new Date().toISOString() };
  await putDraft(env, post);
  return json({ post });
};
