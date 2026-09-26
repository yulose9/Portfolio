import type { Draft } from "../../../cms/format";
import { HttpError, ID, json, readJson, type AdminFunction } from "../../../cms/server/http";
import { loadDraft } from "../../../cms/server/load";
import { publishMany, schedule, unpublishMany } from "../../../cms/server/publish";
import { deleteDraft, putDraft, setScheduled } from "../../../cms/server/store";

/*
 * Many posts at once: POST { action, ids, at? }.
 *
 *   publish      one commit for all of them (one site rebuild)
 *   unpublish    one commit; each becomes a draft
 *   schedule     each gets the same go-live time (`at`)
 *   trash        off the site (one commit) and into the trash
 *   restore      out of the trash
 *   destroy      deleted forever, with history
 *   pin / unpin
 *
 * Answers { posts, failed }: what changed, and what couldn't and why.
 */

type Body = { action: string; ids: string[]; at?: string };

export const onRequestPost: AdminFunction = async ({ env, request }) => {
  const { action, ids, at } = await readJson<Body>(request);
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every((id) => typeof id === "string" && ID.test(id)) || new Set(ids).size !== ids.length) throw new HttpError("Pick between 1 and 200 distinct posts.");
  if (!["publish", "unpublish", "schedule", "trash", "restore", "destroy", "pin", "unpin"].includes(action)) throw new HttpError("Unknown bulk action.");
  if (action === "schedule" && (typeof at !== "string" || !Number.isFinite(Date.parse(at)))) throw new HttpError("Expected a valid scheduled date.");
  const drafts = await Promise.all(ids.map((id) => loadDraft(env, id)));
  const now = new Date().toISOString();
  const failed: { id: string; error: string }[] = [];
  let posts: Draft[] = [];

  switch (action) {
    case "publish": {
      const r = await publishMany(env, drafts.filter((d) => !d.trashedAt));
      posts = r.done;
      failed.push(...r.failed);
      break;
    }
    case "unpublish":
      posts = await unpublishMany(env, drafts.filter((d) => d.status !== "draft"));
      break;
    case "schedule":
      if (!at) throw new HttpError("Pick a time.");
      for (const d of drafts) {
        try {
          posts.push(await schedule(env, d, at));
        } catch (error) {
          failed.push({ id: d.id, error: error instanceof Error ? error.message : "Couldn't schedule" });
        }
      }
      break;
    case "trash": {
      const taken = await unpublishMany(env, drafts.filter((d) => d.liveSlug));
      const byId = new Map(taken.map((d) => [d.id, d]));
      for (const d of drafts) {
        const next: Draft = { ...(byId.get(d.id) ?? d), status: "draft", liveSlug: null, publishAt: null, trashedAt: now, updatedAt: now };
        await putDraft(env, next);
        await setScheduled(env, d.id, null);
        posts.push(next);
      }
      break;
    }
    case "restore":
      for (const d of drafts) {
        const next = { ...d, trashedAt: null, updatedAt: now };
        await putDraft(env, next);
        posts.push(next);
      }
      break;
    case "destroy":
      for (const d of drafts) await deleteDraft(env, d.id);
      return json({ posts: [], deleted: ids, failed });
    case "pin":
    case "unpin":
      for (const d of drafts) {
        const next = { ...d, pinned: action === "pin" };
        await putDraft(env, next);
        posts.push(next);
      }
      break;
    default:
      throw new HttpError("Unknown action.");
  }
  return json({ posts, failed });
};
