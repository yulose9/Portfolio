import {
  fail,
  json,
  readBytes,
  type AdminFunction,
} from "../../../../cms/server/http";
import { matchesMediaType } from "../../../../cms/server/upload";
import { assetMetadataKey } from "../../../../cms/media-library";
import {
  isMediaPart,
  MEDIA_TYPES,
  parseMediaDetails,
  replacementProblem,
} from "../../../../cms/media-details";
import { forgetCachedMedia, mediaFamily } from "../../../../cms/server/media-admin";

/*
 * Replace a media file in place: the new bytes go to the SAME key, so every
 * page that already points at the URL shows the new file without an edit.
 *
 *   POST /api/admin/media/replace?src=/media/2026/<id>-2048x1365.webp
 *        &part=<id>-640.webp      a smaller width or the poster (optional)
 *
 * The admin sends the smaller widths and the poster first and the main file
 * last. Only the main file's request bumps the asset's `version` (stored in
 * the object's custom metadata), moves its details to the new content's
 * identity, and re-points the dedup index. The admin shows the file as
 * `src?v=<version>`; published pages keep the plain URL.
 */
export const onRequestPost: AdminFunction = async ({ env, request }) => {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  if (!/^\/media\/\d{4}\/[a-z0-9.-]+$/.test(src) || /-(?:\d+|poster)\.[a-z0-9]+$/.test(src))
    return fail("Invalid asset.");
  const key = src.slice(1);
  const file = key.split("/").pop()!;
  const part = url.searchParams.get("part") ?? file;
  if (!isMediaPart(src, part)) return fail("That file doesn't belong to this asset.");
  const partKey = key.slice(0, key.length - file.length) + part;
  const main = partKey === key;

  const type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (!MEDIA_TYPES[type]) return fail("That file type can't be stored.", 415);

  const current = await env.WRITING.head(key);
  if (!current) return fail("Asset no longer exists.", 404);
  const currentType = current.httpMetadata?.contentType ?? "";
  if (main) {
    const problem = replacementProblem(currentType, type);
    if (problem) return fail(problem, 415);
  } else if (!type.startsWith("image/") || currentType.startsWith("audio/")) {
    return fail("Smaller widths and posters must be images.", 415);
  }

  const bytes = await readBytes(request, type.startsWith("image/") ? 12 * 1024 * 1024 : 32 * 1024 * 1024);
  if (bytes.byteLength === 0) return fail("The upload was empty.");
  if (!matchesMediaType(bytes, type)) return fail("The file contents don't match its media type.", 415);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  const version = Date.now().toString(36);
  const httpMetadata = { contentType: type, cacheControl: "public, max-age=31536000, immutable" };
  if (!main) {
    await env.WRITING.put(partKey, bytes, { httpMetadata, customMetadata: { sha256: digest, version } });
    return json({ src: `/${partKey}` });
  }

  // The main file: only if nobody replaced it since we looked.
  const stored = await env.WRITING.put(key, bytes, {
    onlyIf: { etagMatches: current.etag },
    httpMetadata,
    customMetadata: { sha256: digest, version },
  });
  if (!stored) return fail("This file changed in another tab. Refresh and try again.", 409);

  const previous = current.customMetadata?.sha256;
  const shape = /-(\d+x\d+)\.[a-z0-9]+$/.exec(file)?.[1] ?? "single";
  if (previous && previous !== digest) {
    // Details follow the asset to its new content's identity. If that
    // identity already has details (the same file exists elsewhere), they win.
    const oldMeta = await env.WRITING.get(assetMetadataKey(key, previous));
    if (oldMeta) {
      const details = await oldMeta.text();
      await env.WRITING.put(assetMetadataKey(key, digest), details, { onlyIf: { etagDoesNotMatch: "*" } });
    }
    // The old content no longer lives here: a fresh upload of it must not be
    // deduplicated onto this key. The new content may claim it instead.
    if (currentType.startsWith("image/")) {
      const oldIndex = `media-index/${previous}-${shape}.json`;
      const claimed = await env.WRITING.get(oldIndex);
      if (claimed && (await claimed.json<{ key?: string }>()).key === key) await env.WRITING.delete(oldIndex);
      if (type.startsWith("image/"))
        await env.WRITING.put(`media-index/${digest}-${shape}.json`, JSON.stringify({ key }), {
          onlyIf: { etagDoesNotMatch: "*" },
        });
    }
  }
  await forgetCachedMedia(url.origin, await mediaFamily(env, key));
  // The details now in force, and their etag for the next save.
  const meta = await env.WRITING.get(assetMetadataKey(key, digest));
  return json({
    src,
    version,
    digest,
    size: bytes.byteLength,
    type,
    base: meta?.etag ?? null,
    ...parseMediaDetails(meta ? await meta.json() : {}),
  });
};
