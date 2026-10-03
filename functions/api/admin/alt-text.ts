import { buildAltPrompt, cleanAltText, contextLine, type AltContext } from "../../../cms/alt-text";
import { fail, HttpError, json, readBytes, readJson, type AdminEnv, type AdminFunction } from "../../../cms/server/http";
import { matchesMediaType } from "../../../cms/server/upload";

/*
 * Alt text, suggested by a vision model (Workers AI). The admin sends an
 * image it has already uploaded ({ src: "/media/…" }, read here from R2 at
 * its 640px width when there is one) or the bytes of one, plus what the page
 * says around it, and gets back { alt }: a draft for a person to review.
 *
 * GET says whether the AI binding is present, so the admin can disable its
 * buttons in local dev instead of failing on click.
 *
 * Llama 4 Scout reads images natively and needs no licence step. To swap to
 * the cheaper @cf/meta/llama-3.2-11b-vision-instruct, run its one-time
 * `{"prompt":"agree"}` call first (see docs/writing-admin.md).
 */
const MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"]);
const SRC = /^\/media\/(\d{4})\/([a-z0-9]{10,24})-(\d{1,5}x\d{1,5}|\d{2,5})\.(webp|jpg|png|gif)$/;

// Per isolate, per signed-in user: enough for a bulk pass, a stop for a loop.
const WINDOW_MS = 60_000;
const PER_WINDOW = 30;
const recent = new Map<string, number[]>();

function allow(who: string, now = Date.now()): number {
  const hits = (recent.get(who) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) {
    recent.set(who, hits);
    return Math.ceil((WINDOW_MS - (now - hits[0])) / 1000);
  }
  hits.push(now);
  recent.set(who, hits);
  if (recent.size > 64) for (const key of recent.keys()) if (key !== who) { recent.delete(key); break; }
  return 0;
}

export const onRequestGet: AdminFunction = async ({ env }) => json({ available: Boolean(env.AI), model: MODEL });

export const onRequestPost: AdminFunction = async ({ env, request, data }) => {
  if (!env.AI) {
    return fail("Alt text generation needs the Workers AI binding. Add [ai] binding = \"AI\" to wrangler.toml, or run `wrangler pages dev --ai=AI`.", 503);
  }
  const wait = allow(data.email || "admin");
  if (wait) {
    const res = fail("Too many alt text requests. Wait a moment and try again.", 429);
    res.headers.set("Retry-After", String(wait));
    return res;
  }

  const type = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  let image: { bytes: Uint8Array; type: string };
  let context: AltContext;
  if (type === "application/json") {
    const body = await readJson<{ src?: unknown; context?: Record<string, unknown> }>(request);
    image = await fromLibrary(env, body.src);
    context = readContext(body.context ?? {});
  } else if (TYPES.has(type)) {
    const bytes = await readBytes(request, MAX_IMAGE_BYTES);
    if (!bytes.byteLength) return fail("The image was empty.");
    if (!matchesMediaType(bytes, type)) return fail("The file contents don't match its media type.", 415);
    image = { bytes, type };
    context = readContext(Object.fromEntries(new URL(request.url).searchParams));
  } else {
    return fail("Send { src } as JSON, or a WebP, JPEG, PNG or GIF image.", 415);
  }

  const { system, user } = buildAltPrompt(context);
  let answer: unknown;
  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: `data:${image.type};base64,${base64(image.bytes)}` } },
          ],
        },
      ],
      max_tokens: 96,
      temperature: 0.2,
    });
    answer = (result as { response?: unknown }).response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: "alt_text_model_error", model: MODEL, message: message.slice(0, 300) }));
    if (/agree|licen[cs]e|5016/i.test(message)) return fail("The vision model's licence hasn't been accepted on this Cloudflare account yet. See docs/writing-admin.md.", 503);
    if (/capacity|rate|3040|429|neurons|quota|limit/i.test(message)) return fail("Workers AI is busy or today's allowance is used up. Try again later.", 429);
    return fail("The vision model didn't answer. Try again in a moment.", 502);
  }

  const alt = cleanAltText(typeof answer === "string" ? answer : "");
  if (!alt) return fail("The model couldn't describe this image. Write the alt text by hand.", 422);
  return json({ alt, model: MODEL });
};

function readContext(raw: Record<string, unknown>): AltContext {
  return {
    title: contextLine(raw.title),
    heading: contextLine(raw.heading),
    caption: contextLine(raw.caption),
    fileName: contextLine(raw.fileName),
  };
}

/** An uploaded image from R2, at its 640px width when one was uploaded beside it. */
async function fromLibrary(env: AdminEnv, src: unknown): Promise<{ bytes: Uint8Array; type: string }> {
  const path = typeof src === "string" ? src.split(/[?#]/)[0] : "";
  const m = SRC.exec(path);
  if (!m) throw new HttpError("Choose an uploaded image (a /media/ address).", 400);
  const [, year, id, shape, ext] = m;
  const width = Number(shape.split("x")[0]);
  const keys = shape.includes("x") && width > 640 && ext === "webp" ? [`media/${year}/${id}-640.webp`] : [];
  keys.push(path.slice(1));
  for (const key of keys) {
    const object = await env.WRITING.get(key);
    if (!object) continue;
    const type = object.httpMetadata?.contentType ?? "";
    if (!TYPES.has(type)) {
      await object.body.cancel();
      throw new HttpError("Only WebP, JPEG, PNG and GIF images can be described.", 415);
    }
    if (object.size > MAX_IMAGE_BYTES) {
      await object.body.cancel();
      continue;
    }
    return { bytes: new Uint8Array(await object.arrayBuffer()), type };
  }
  throw new HttpError("That image wasn't found, or is too large to describe (over 4 MB).", 404);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
