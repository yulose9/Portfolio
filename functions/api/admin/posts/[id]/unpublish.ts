import { json, param, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { unpublish } from "../../../../../cms/server/publish";

/** Takes a live post down, or cancels a scheduled one. Either way it's a draft again. */
export const onRequestPost: AdminFunction<"id"> = async ({ env, params }) =>
  json({ post: await unpublish(env, await loadDraft(env, param(params.id))) });
