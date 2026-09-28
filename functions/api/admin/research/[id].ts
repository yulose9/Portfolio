import { cleanResearchItem, type ResearchItem } from "../../../../cms/research";
import { publishedFingerprint } from "../../../../cms/published-fingerprint";
import {
  HttpError,
  json,
  param,
  readJson,
  type AdminFunction,
} from "../../../../cms/server/http";
export const onRequestPut: AdminFunction<"id"> = async ({
  env,
  params,
  request,
}) => {
  const id = param(params.id);
  if (!/^[\w-]{8,80}$/.test(id)) throw new HttpError("Invalid research ID.");
  const input = await readJson<ResearchItem & { base?: string }>(request);
  const key = `research/${id}.json`;
  const old = await env.WRITING.get(key);
  const previous = old ? await old.json<ResearchItem>() : undefined;
  if (previous && input.base !== previous.updatedAt) {
    // A lost response can retry the same creation without making a second item.
    if (!input.base) {
      try {
        const same = cleanResearchItem(input, id, previous.updatedAt, previous);
        same.sourceFingerprint=await publishedFingerprint(same.body)??undefined;
        if (JSON.stringify(same) === JSON.stringify(previous))
          return json({ item: previous });
      } catch {
        /* normal validation below reports malformed data */
      }
    }
    throw new HttpError(
      "This item changed on another device. Reopen it before saving.",
      409,
    );
  }
  let item: ResearchItem;
  try {
    item = cleanResearchItem(input, id, new Date(Math.max(Date.now(),(Date.parse(previous?.updatedAt??"")||0)+1)).toISOString(), previous);
  } catch (e) {
    throw new HttpError(
      e instanceof Error ? e.message : "Invalid research item.",
    );
  }
  item.sourceFingerprint=await publishedFingerprint(item.body)??undefined;
  const written = await env.WRITING.put(key, JSON.stringify(item), {
    onlyIf: old
      ? { etagMatches: old.etag }
      : new Headers({ "If-None-Match": "*" }),
    httpMetadata: { contentType: "application/json" },
  });
  if (!written)
    throw new HttpError(
      "This item changed while saving. Reopen it and try again.",
      409,
    );
  return json({ item });
};
