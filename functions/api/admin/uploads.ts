import { newId } from "../../../cms/format";
import { MEDIA_NAME } from "../../../cms/media";
import { fail, json, readBytes, type AdminFunction } from "../../../cms/server/http";
import { matchesMediaType } from "../../../cms/server/upload";

/*
 * Media upload. The editor has already compressed, resized and stripped the
 * file in the browser (app/admin/ui/media.ts), so what arrives here is the
 * file to serve; this checks it and files it under media/<year>/.
 *
 * ?name=<id>-<shape>.<ext> names the file (cms/media.ts), so an image's size
 * and variants travel in its URL. No SVG: an SVG served from this origin can
 * carry script.
 */
const TYPES: Record<string, string[]> = {
  "image/webp": ["webp"],
  "image/jpeg": ["jpg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "audio/mp4": ["m4a"],
  "audio/webm": ["webm"],
  "audio/mpeg": ["mp3"],
  "audio/ogg": ["ogg"],
};
// Leave room for the runtime and the bounded reader's final contiguous buffer.
const MAX_BYTES = 32 * 1024 * 1024;

export const onRequestPost: AdminFunction = async ({ env, request }) => {
  const type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  const exts = TYPES[type];
  if (!exts) return fail("That file type can't be uploaded.", 415);

  const bytes = await readBytes(request, type.startsWith("image/") ? 12 * 1024 * 1024 : MAX_BYTES);
  if (bytes.byteLength === 0) return fail("The upload was empty.");
  if (!matchesMediaType(bytes, type)) return fail("The file contents don't match its media type.", 415);

  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  let file: string;
  if (name) {
    const dot = name.lastIndexOf(".");
    const stem = name.slice(0, dot);
    const ext = name.slice(dot + 1);
    if (dot < 1 || !MEDIA_NAME.test(stem) || !exts.includes(ext)) return fail("Unexpected file name. Upload through the editor.");
    file = name;
  } else {
    file = `${newId()}.${exts[0]}`;
  }
  const key = `media/${new Date().getUTCFullYear()}/${file}`;

  const stored = await env.WRITING.put(key, bytes, {
    // Never replace an immutable public URL, even with a forged upload name.
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
  });
  if (!stored) return fail("That media name already exists. Upload it with a new name.", 409);
  return json({ src: `/${key}` }, 201);
};
