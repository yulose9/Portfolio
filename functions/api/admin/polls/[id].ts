import { POLL_ID } from "../../../../cms/blocks";
import { fail, json, type AdminFunction } from "../../../../cms/server/http";
import { clearVotes, optionCount, results, tally } from "../../../../cms/server/poll-store";

/*
 * A poll's votes, for the editor (app/admin/ui/extensions/poll.tsx). Behind
 * the admin middleware, like everything under /api/admin.
 *
 *   GET    /api/admin/polls/<id>?options=3 → { counts, total, voted: null }, counted fresh
 *   DELETE /api/admin/polls/<id>           → { removed: 12 }, every vote gone
 */

const kvOf = (env: unknown) => (env as { POLLS?: KVNamespace }).POLLS;

export const onRequestGet: AdminFunction<"id"> = async ({ env, params, request }) => {
  const id = String(params.id);
  if (!POLL_ID.test(id)) return fail("Unknown poll.", 404);
  const kv = kvOf(env);
  if (!kv) return fail("Polls aren't set up on this deployment.", 503);
  const options = optionCount(new URL(request.url).searchParams.get("options")) ?? 2;
  return json(results(await tally(kv, id, options, true), null));
};

export const onRequestDelete: AdminFunction<"id"> = async ({ env, params }) => {
  const id = String(params.id);
  if (!POLL_ID.test(id)) return fail("Unknown poll.", 404);
  const kv = kvOf(env);
  if (!kv) return fail("Polls aren't set up on this deployment.", 503);
  return json({ removed: await clearVotes(kv, id) });
};
