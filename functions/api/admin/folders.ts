import {
  changeFolders,
  type Folders,
  type FolderAction,
} from "../../../cms/folders";
import {
  fail,
  json,
  readJson,
  type AdminFunction,
} from "../../../cms/server/http";
import { getDraft } from "../../../cms/server/store";
const KEY = "meta/folders.json";
export const onRequestGet: AdminFunction = async ({ env }) => {
  const stored = await env.WRITING.get(KEY);
  return json({
    value: stored ? await stored.json() : { folders: [], assignments: {} },
    base: stored?.etag ?? null,
  });
};
export const onRequestPut: AdminFunction = async ({ env, request }) => {
  const body = await readJson<{ action: FolderAction; base: string | null }>(
    request,
  );
  if (
    !body.action ||
    typeof body.action !== "object" ||
    !(body.base === null || typeof body.base === "string")
  )
    return fail("Invalid folder request.");
  const stored = await env.WRITING.get(KEY);
  if ((stored?.etag ?? null) !== body.base)
    return fail("Folders changed in another tab. Refresh and retry.", 409);
  if (body.action.type === "move" && !(await getDraft(env, body.action.pageId)))
    return fail("Page no longer exists.", 404);
  let value: Folders;
  try {
    value = changeFolders(
      stored ? await stored.json<Folders>() : { folders: [], assignments: {} },
      body.action,
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Invalid folder action.");
  }
  const saved = await env.WRITING.put(KEY, JSON.stringify(value), {
    onlyIf: stored ? { etagMatches: stored.etag } : { etagDoesNotMatch: "*" },
  });
  return saved
    ? json({ value, base: saved.etag })
    : fail("Folders changed in another tab. Refresh and retry.", 409);
};
