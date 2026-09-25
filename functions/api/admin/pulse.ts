import { json, type AdminFunction } from "../../../cms/server/http";
import { draftVersion, pulse } from "../../../cms/server/store";

/*
 * "Has anything changed?" — cheap enough to ask every couple of seconds.
 *
 *   GET /api/admin/pulse            → { at, id }   the latest change to any draft
 *   GET /api/admin/pulse?post=<id>  → { at, id, version }  plus that draft's save time
 */
export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const post = new URL(request.url).searchParams.get("post");
  const [latest, version] = await Promise.all([pulse(env), post && /^[a-z0-9]{6,32}$/.test(post) ? draftVersion(env, post) : null]);
  return json({ ...latest, ...(post ? { version } : {}) });
};
