/**
 * Drafts, revisions and schedule markers in the private R2 bucket.
 *
 *   drafts/<id>/current.json          the working copy
 *   drafts/<id>/rev/<iso>.json        snapshots, newest kept, oldest pruned
 *   scheduled/<id>                    a marker per scheduled post; the cron
 *                                     lists this prefix instead of every draft
 *   media/<yyyy>/<name>.<ext>         uploaded images (the only public prefix)
 *
 * The bucket has no public access. Media is served by functions/media, which
 * refuses anything outside media/, so drafts can't be reached by guessing.
 */

import type { Draft } from "../format";

export type StoreEnv = { WRITING: R2Bucket };

const current = (id: string) => `drafts/${id}/current.json`;
const revPrefix = (id: string) => `drafts/${id}/rev/`;
const marker = (id: string) => `scheduled/${id}`;

/** Kept per post. Autosave only snapshots every ten minutes, so this is days of work. */
const MAX_REVISIONS = 60;
const AUTOSNAPSHOT_MS = 10 * 60 * 1000;

export async function getDraft(env: StoreEnv, id: string): Promise<Draft | null> {
  const obj = await env.WRITING.get(current(id));
  return obj ? ((await obj.json()) as Draft) : null;
}

export async function putDraft(env: StoreEnv, draft: Draft): Promise<void> {
  await env.WRITING.put(current(draft.id), JSON.stringify(draft), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { title: draft.title.slice(0, 200), status: draft.status, updatedAt: draft.updatedAt },
  });
}

export async function listDrafts(env: StoreEnv): Promise<Draft[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: "drafts/", delimiter: "/", cursor });
    for (const p of page.delimitedPrefixes) ids.push(p.slice("drafts/".length, -1));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const drafts = await Promise.all(ids.map((id) => getDraft(env, id)));
  return drafts.filter((d): d is Draft => d !== null);
}

/**
 * Snapshot the draft. `force` for deliberate moments (⌘S, publish, restore);
 * autosaves only snapshot when the newest one is ten minutes old, so undo
 * history doesn't turn into a file per keystroke.
 */
export async function snapshot(env: StoreEnv, draft: Draft, force: boolean, label?: string): Promise<boolean> {
  const revs = await listRevisions(env, draft.id);
  if (!force && revs[0] && Date.now() - Date.parse(revs[0].at) < AUTOSNAPSHOT_MS) return false;

  const at = new Date().toISOString();
  await env.WRITING.put(`${revPrefix(draft.id)}${at}.json`, JSON.stringify(draft), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { label: label ?? (force ? "Saved" : "Autosave"), words: String(countWords(draft.body)) },
  });

  const stale = revs.slice(MAX_REVISIONS - 1);
  if (stale.length) await env.WRITING.delete(stale.map((r) => r.key));
  return true;
}

export type Revision = { key: string; at: string; label: string; words: number };

/** Newest first. */
export async function listRevisions(env: StoreEnv, id: string): Promise<Revision[]> {
  const out: Revision[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: revPrefix(id), cursor, include: ["customMetadata"] });
    for (const o of page.objects) {
      out.push({
        key: o.key,
        at: o.key.slice(revPrefix(id).length, -".json".length),
        label: o.customMetadata?.label ?? "Saved",
        words: Number(o.customMetadata?.words ?? 0),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function getRevision(env: StoreEnv, id: string, at: string): Promise<Draft | null> {
  const obj = await env.WRITING.get(`${revPrefix(id)}${at}.json`);
  return obj ? ((await obj.json()) as Draft) : null;
}

export async function deleteDraft(env: StoreEnv, id: string): Promise<void> {
  const keys: string[] = [marker(id)];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: `drafts/${id}/`, cursor });
    keys.push(...page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  // R2 deletes up to 1000 keys per call.
  for (let i = 0; i < keys.length; i += 1000) await env.WRITING.delete(keys.slice(i, i + 1000));
}

export async function setScheduled(env: StoreEnv, id: string, publishAt: string | null): Promise<void> {
  if (publishAt) await env.WRITING.put(marker(id), publishAt, { customMetadata: { publishAt } });
  else await env.WRITING.delete(marker(id));
}

/** Scheduled posts whose time has come. */
export async function dueScheduled(env: StoreEnv, now = Date.now()): Promise<string[]> {
  const due: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: "scheduled/", cursor, include: ["customMetadata"] });
    for (const o of page.objects) {
      const at = Date.parse(o.customMetadata?.publishAt ?? "");
      if (Number.isFinite(at) && at <= now) due.push(o.key.slice("scheduled/".length));
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return due;
}

export function countWords(markdown: string): number {
  return markdown.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;
}
