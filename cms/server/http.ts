import type { CmsEnv } from "./publish";

export type AdminEnv = CmsEnv & {
  /** https://<team>.cloudflareaccess.com */
  ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's Audience (AUD) tag. */
  ACCESS_AUD?: string;
  /** Who may use the admin. Comma-separated; compared case-insensitively. */
  ADMIN_EMAIL?: string;
  /** "1" skips Access on localhost only, for `wrangler pages dev`. */
  ADMIN_DEV_BYPASS?: string;
};

export type AdminData = { email: string };

export type AdminFunction<P extends string = never> = PagesFunction<AdminEnv, P, AdminData>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/** Browser mutations need both an exact origin and a non-simple header. */
export function isAdminWrite(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");
  return request.headers.get("Origin") === new URL(request.url).origin &&
    request.headers.get("X-Admin-Request") === "1" && (!site || site === "same-origin");
}

export async function readJson<T>(request: Request): Promise<T> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError("Expected application/json.", 415);
  }
  const bytes = await readBytes(request, 2 * 1024 * 1024);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError("Expected a JSON body.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError("Expected a JSON object.");
  return value as T;
}

/** Count actual streamed bytes; Content-Length alone is not a size boundary. */
export async function readBytes(request: Request, limit: number): Promise<Uint8Array> {
  const length = request.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new HttpError("Request body is too large.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

/**
 * One route param, as a string, whatever shape Pages hands it over in. Pages
 * leaves params percent-encoded, and a revision's timestamp arrives as
 * 2026-09-25T14%3A52%3A04.506Z.
 */
export function param(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value.join("/") : (value ?? "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export const ID = /^[a-z0-9]{6,32}$/;
