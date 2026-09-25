import type { Draft } from "../../../../../../cms/format";
import { HttpError, json, param, type AdminEnv, type AdminFunction } from "../../../../../../cms/server/http";
import { loadDraft } from "../../../../../../cms/server/load";
import { getRevision, putDraft, snapshot } from "../../../../../../cms/server/store";

type P = "id" | "at";

async function find(env: AdminEnv, id: string, at: string): Promise<Draft> {
  if (!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(at)) throw new HttpError("That revision link isn’t valid.");
  const rev = await getRevision(env, id, at);
  if (!rev) throw new HttpError("That revision is gone.", 404);
  return rev;
}

export const onRequestGet: AdminFunction<P> = async ({ env, params }) =>
  json({ revision: await find(env, param(params.id), param(params.at)) });

/**
 * Restore: the revision's words come back into the working copy. Status and
 * what's live stay put — restoring never publishes — and the current text is
 * snapshotted first, so a restore can itself be undone.
 */
export const onRequestPost: AdminFunction<P> = async ({ env, params }) => {
  const id = param(params.id);
  const [current, rev] = await Promise.all([loadDraft(env, id), find(env, id, param(params.at))]);
  await snapshot(env, current, true, "Before restore");
  const next: Draft = {
    ...current,
    title: rev.title,
    // A live post's URL is only changed deliberately, never by a restore.
    slug: current.liveSlug ? current.slug : rev.slug,
    dek: rev.dek,
    tags: rev.tags,
    cover: rev.cover,
    body: rev.body,
    dirty: true,
    updatedAt: new Date().toISOString(),
  };
  await putDraft(env, next);
  return json({ post: next });
};
