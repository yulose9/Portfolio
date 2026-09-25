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

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("Expected a JSON body.", 400);
  }
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
