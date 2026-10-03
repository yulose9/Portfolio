import {
  fail,
  json,
  readJson,
  type AdminFunction,
} from "../../../cms/server/http";
import { assetMetadataKey } from "../../../cms/media-library";
import {
  parseMediaDetails,
  validateMediaDetails,
} from "../../../cms/media-details";
import {
  forgetCachedMedia,
  mediaFamily,
  mediaSources,
  usedIn,
} from "../../../cms/server/media-admin";

const ASSET = /^\/media\/\d{4}\/[a-z0-9.-]+$/;

export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const [page, sources] = await Promise.all([
    env.WRITING.list({
      prefix: "media/",
      limit: 60,
      cursor,
      include: ["httpMetadata", "customMetadata"],
    }),
    mediaSources(env),
  ]);
  const assets = await Promise.all(
    page.objects
      .filter((o) => !/-(?:\d+|poster)\.[a-z0-9]+$/.test(o.key))
      .map(async (o) => {
        const src = `/${o.key}`;
        const metadata = await env.WRITING.get(
          assetMetadataKey(o.key, o.customMetadata?.sha256),
        );
        const details = parseMediaDetails(metadata ? await metadata.json() : {});
        return {
          ...details,
          base: metadata?.etag ?? null,
          src,
          digest: o.customMetadata?.sha256 ?? null,
          version: o.customMetadata?.version ?? null,
          size: o.size,
          type: o.httpMetadata?.contentType ?? "application/octet-stream",
          uploadedAt: o.uploaded.toISOString(),
          usedIn: usedIn(sources, src),
        };
      }),
  );
  return json({ assets, cursor: page.truncated ? page.cursor : null });
};

/*
 * Details: title, default alt text, caption and the trash flag. `caption` is
 * optional in the request, so an older client that doesn't know about it
 * keeps whatever caption is stored rather than erasing it.
 */
export const onRequestPut: AdminFunction = async ({ env, request }) => {
  const value = await readJson<{
    src: string;
    title: string;
    alt: string;
    caption?: string;
    trashed: boolean;
    base: string | null;
  }>(request);
  if (typeof value.src !== "string" || !ASSET.test(value.src))
    return fail("Invalid asset.");
  if (
    typeof value.title !== "string" ||
    typeof value.alt !== "string" ||
    !(value.caption === undefined || typeof value.caption === "string") ||
    typeof value.trashed !== "boolean" ||
    !(value.base === null || typeof value.base === "string")
  )
    return fail("Invalid media details.");
  const errors = validateMediaDetails(value);
  if (Object.keys(errors).length)
    return json({ error: Object.values(errors)[0], errors }, 400);
  const object = await env.WRITING.head(value.src.slice(1));
  if (!object) return fail("Asset no longer exists.", 404);
  const metaKey = assetMetadataKey(
    value.src.slice(1),
    object.customMetadata?.sha256,
  );
  let caption = value.caption?.trim();
  if (caption === undefined) {
    const current = await env.WRITING.get(metaKey);
    caption = current ? parseMediaDetails(await current.json()).caption : "";
  }
  const stored = await env.WRITING.put(
    metaKey,
    JSON.stringify({
      title: value.title.trim(),
      alt: value.alt.trim(),
      // Stored only when there is one, so the file keeps its older shape.
      ...(caption ? { caption } : {}),
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

/*
 * Permanent deletion. Refused while any page still references the file, so
 * this can never break a page; trash is the reversible way to hide it. The
 * file goes with its smaller widths and poster, its details, and the dedup
 * index entry that points at it.
 */
export const onRequestDelete: AdminFunction = async ({ env, request }) => {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  if (!ASSET.test(src) || /-(?:\d+|poster)\.[a-z0-9]+$/.test(src))
    return fail("Invalid asset.");
  const key = src.slice(1);
  const object = await env.WRITING.head(key);
  if (!object) return fail("Asset no longer exists.", 404);
  const uses = usedIn(await mediaSources(env), src);
  if (uses.length)
    return fail(
      `This file is used in ${uses.length} ${uses.length === 1 ? "page" : "pages"}. Remove it there first, or move it to the trash instead.`,
      409,
    );
  const keys = await mediaFamily(env, key);
  const digest = object.customMetadata?.sha256;
  const shape = /-(\d+x\d+)\.[a-z0-9]+$/.exec(key)?.[1] ?? "single";
  const extra: string[] = [];
  if (digest) {
    extra.push(assetMetadataKey(key, digest));
    const index = `media-index/${digest}-${shape}.json`;
    const claimed = await env.WRITING.get(index);
    if (claimed && (await claimed.json<{ key?: string }>()).key === key)
      extra.push(index);
  }
  await env.WRITING.delete([...keys, ...extra]);
  await forgetCachedMedia(new URL(request.url).origin, keys);
  return json({ deleted: keys.map((k) => `/${k}`) });
};
