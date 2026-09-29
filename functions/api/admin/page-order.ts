import {
  HttpError,
  ID,
  json,
  readJson,
  type AdminFunction,
} from "../../../cms/server/http";
import {
  applyParent,
  HIERARCHY_KEY,
  readHierarchy,
} from "../../../cms/server/hierarchy";
import { listDrafts } from "../../../cms/server/store";
import { livePosts } from "../../../cms/server/publish";
import {
  parentKey,
  sameIds,
  siblingIds,
  withPageOrder,
} from "../../../cms/page-order";
import { postToDraft } from "../../../cms/format";

/** Shares the hierarchy's CAS boundary with reparenting; never rewrites article content. */
export const onRequestPut: AdminFunction = async ({ env, request }) => {
  const input = await readJson<{
    parentId: string | null;
    previousIds: string[];
    ids: string[];
  }>(request);
  const validIds = (ids: unknown): ids is string[] =>
    Array.isArray(ids) &&
    ids.length <= 5000 &&
    ids.every((id) => typeof id === "string" && ID.test(id)) &&
    new Set(ids).size === ids.length;
  if (
    (input.parentId !== null &&
      (typeof input.parentId !== "string" || !ID.test(input.parentId))) ||
    !validIds(input.ids) ||
    !validIds(input.previousIds)
  )
    throw new HttpError("Invalid page order.");
  const [drafts, live] = await Promise.all([listDrafts(env), livePosts(env)]);
  const { value, etag } = await readHierarchy(env);
  const known = new Set(drafts.map((p) => p.id));
  const pages = withPageOrder(
    [...drafts, ...live.filter((p) => !known.has(p.id)).map(postToDraft)].map(
      (p) => applyParent(p, value),
    ),
    value.orders,
  );
  if (
    input.parentId &&
    !pages.some(
      (p) =>
        p.id === input.parentId &&
        p.page !== false &&
        !("trashedAt" in p && p.trashedAt),
    )
  )
    throw new HttpError("Parent page is unavailable.", 404);
  const previous = siblingIds(pages, input.parentId);
  if (!sameIds(previous, input.previousIds))
    throw new HttpError(
      "These pages changed in another tab. Refresh the navigator and try again.",
      409,
    );
  if (
    input.ids.length !== previous.length ||
    input.ids.some((id) => !previous.includes(id))
  )
    throw new HttpError("Reorder must contain every sibling exactly once.");
  const next = {
    ...value,
    orders: { ...value.orders, [parentKey(input.parentId)]: input.ids },
  };
  const body = JSON.stringify(next);
  if (body.length > 500000)
    throw new HttpError("The page hierarchy is too large.");
  const saved = await env.WRITING.put(HIERARCHY_KEY, body, {
    onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
  });
  if (!saved)
    throw new HttpError(
      "Another page moved at the same time. Refresh and try again.",
      409,
    );
  return json({ ids: input.ids });
};
