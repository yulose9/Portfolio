import { HttpError, json, param, readJson, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { publish, schedule } from "../../../../../cms/server/publish";

/** Body: {} to publish now, or { at: ISO } to schedule a first publish. */
export const onRequestPost: AdminFunction<"id"> = async ({ env, params, request }) => {
  const { at } = await readJson<{ at?: string | null }>(request);
  if (at !== undefined && at !== null && (typeof at !== "string" || !at.trim() || !Number.isFinite(Date.parse(at)))) {
    throw new HttpError("Expected a valid scheduled date.");
  }
  const draft = await loadDraft(env, param(params.id));
  const post = at ? await schedule(env, draft, at) : await publish(env, draft);
  return json({ post });
};
