import {
  fail,
  json,
  readJson,
  type AdminFunction,
} from "../../../cms/server/http";
import { listDrafts } from "../../../cms/server/store";
import { livePosts } from "../../../cms/server/publish";
import { assetMetadataKey } from "../../../cms/media-library";
export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const [page, drafts, live] = await Promise.all([
    env.WRITING.list({
      prefix: "media/",
      limit: 60,
      cursor,
      include: ["httpMetadata", "customMetadata"],
    }),
    listDrafts(env),
    livePosts(env),
  ]);
  const sources = [...drafts, ...live];
  const assets = await Promise.all(
    page.objects
      .filter((o) => !/-(?:\d+|poster)\.[a-z0-9]+$/.test(o.key))
      .map(async (o) => {
        const src = `/${o.key}`;
        const metadata = await env.WRITING.get(
          assetMetadataKey(o.key, o.customMetadata?.sha256),
        );
        const details = metadata
          ? await metadata.json<{
              title?: string;
              alt?: string;
              trashed?: boolean;
            }>()
          : {};
        const usedIn = [
          ...new Map(
            sources
              .filter(
                (d) =>
                  d.body.includes(src) ||
                  d.cover?.src === src ||
                  d.ogImage === src ||
                  d.authors.some((a) => a.avatar === src),
              )
              .map((d) => [d.id, { id: d.id, title: d.title }]),
          ).values(),
        ];
        return {
          ...details,
          base: metadata?.etag ?? null,
          src,
          digest: o.customMetadata?.sha256 ?? null,
          size: o.size,
          type: o.httpMetadata?.contentType ?? "application/octet-stream",
          uploadedAt: o.uploaded.toISOString(),
          usedIn,
        };
      }),
  );
  return json({ assets, cursor: page.truncated ? page.cursor : null });
};

export const onRequestPut: AdminFunction = async ({ env, request }) => {
  const value = await readJson<{
    src: string;
    title: string;
    alt: string;
    trashed: boolean;
    base: string | null;
  }>(request);
  if (
    typeof value.src !== "string" ||
    !/^\/media\/\d{4}\/[a-z0-9.-]+$/.test(value.src)
  )
    return fail("Invalid asset.");
  if (
    typeof value.title !== "string" ||
    value.title.length > 200 ||
    typeof value.alt !== "string" ||
    value.alt.length > 1000 ||
    typeof value.trashed !== "boolean" ||
    !(value.base === null || typeof value.base === "string")
  )
    return fail("Invalid media details.");
  const object = await env.WRITING.head(value.src.slice(1));
  if (!object) return fail("Asset no longer exists.", 404);
  const stored = await env.WRITING.put(
    assetMetadataKey(value.src.slice(1), object.customMetadata?.sha256),
    JSON.stringify({
      title: value.title.trim(),
      alt: value.alt.trim(),
      trashed: value.trashed,
    }),
    {
      onlyIf:
        value.base === null
          ? { etagDoesNotMatch: "*" }
          : { etagMatches: value.base },
    },
  );
  if (!stored)
    return fail(
      "This asset changed in another tab. Refresh and try again.",
      409,
    );
  return json({ base: stored.etag });
};
