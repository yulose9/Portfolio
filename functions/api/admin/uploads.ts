import { newId } from "../../../cms/format";
import { fail, json, type AdminFunction } from "../../../cms/server/http";

/*
 * Image upload. The editor resizes and re-encodes in the browser first (to
 * WebP, 2400px on the long edge), so what arrives here is already the file to
 * serve; this only checks it and files it under media/.
 *
 * No SVG: an SVG served from this origin can carry script.
 */
const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_BYTES = 12 * 1024 * 1024;

export const onRequestPost: AdminFunction = async ({ env, request }) => {
  const type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return fail("Only WebP, JPEG, PNG, GIF or AVIF images.", 415);

  const size = Number(request.headers.get("Content-Length") ?? 0);
  if (size > MAX_BYTES) return fail("That image is over 12 MB.", 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return fail("The upload was empty.");
  if (bytes.byteLength > MAX_BYTES) return fail("That image is over 12 MB.", 413);

  const url = new URL(request.url);
  const width = Number(url.searchParams.get("w")) || undefined;
  const height = Number(url.searchParams.get("h")) || undefined;
  const key = `media/${new Date().getUTCFullYear()}/${newId()}.${ext}`;

  await env.WRITING.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { ...(width ? { width: String(width) } : {}), ...(height ? { height: String(height) } : {}) },
  });
  return json({ src: `/${key}`, width, height }, 201);
};
