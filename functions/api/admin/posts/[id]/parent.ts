import { canParent } from "../../../../../cms/page-tree";
import {
  applyParent,
  HIERARCHY_KEY,
  readHierarchy,
} from "../../../../../cms/server/hierarchy";
import {
  HttpError,
  ID,
  json,
  param,
  readJson,
  type AdminFunction,
} from "../../../../../cms/server/http";
import { livePosts } from "../../../../../cms/server/publish";
import { listDrafts } from "../../../../../cms/server/store";
export const onRequestPut: AdminFunction<"id"> = async ({
  env,
  params,
  request,
}) => {
  const id = param(params.id),
    input = await readJson<{
      parentId: string | null;
      previousParentId: string | null;
    }>(request);
  if (
    !ID.test(id) ||
    (input.parentId !== null &&
      (typeof input.parentId !== "string" || !ID.test(input.parentId)))
  )
    throw new HttpError("Invalid parent page.");
  const [drafts, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  const { value, etag } = await readHierarchy(env);
  const pages = [
    ...drafts,
    ...live.filter((p) => !drafts.some((d) => d.id === p.id)),
  ].map((p) => applyParent(p, value));
  const current = pages.find((p) => p.id === id);
  if (!current || ("trashedAt" in current && current.trashedAt))
    throw new HttpError("Page not found.", 404);
  if ((current.parentId ?? null) !== input.previousParentId)
    throw new HttpError(
      "This page moved in another tab. Refresh its location.",
      409,
    );
  if (!canParent(pages, id, input.parentId))
    throw new HttpError(
      "A page cannot move inside itself, its descendants or an unavailable page.",
    );
  const next = {
    version: 1,
    parents: { ...value.parents, [id]: input.parentId },
  };
  if (JSON.stringify(next).length > 500000)
    throw new HttpError("The page hierarchy is too large.");
  const saved = await env.WRITING.put(HIERARCHY_KEY, JSON.stringify(next), {
    onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
  });
  if (!saved)
    throw new HttpError(
      "Another page moved at the same time. Refresh and try again.",
      409,
    );
  return json({ parentId: input.parentId });
};
