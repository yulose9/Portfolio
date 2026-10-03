import { ApiError } from "./api";
import { reportExpired, reportSession } from "./session";
import type { MediaDetailErrors } from "../../../cms/media-details";

/*
 * The media library's own calls: details (with caption), replacing a file in
 * place, and permanent deletion. Same conventions as api.ts: same-origin,
 * the X-Admin-Request header, JSON back, and Access's login page read as an
 * expired session.
 */

async function request<T>(path: string, init: RequestInit = {}, timeout = 45_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      credentials: "same-origin",
      ...init,
      signal: AbortSignal.timeout(timeout),
      headers: { "X-Admin-Request": "1", ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("You're offline, or the server can't be reached.", 0);
  }
  reportSession(Number(res.headers.get("X-Admin-Session-Expires")));
  if (!(res.headers.get("Content-Type") ?? "").includes("application/json")) {
    if (res.redirected || res.status === 401 || res.status === 403 || res.ok) reportExpired();
    throw new ApiError(
      res.redirected || res.status === 302 || res.ok ? "Your sign-in expired. Reload to sign in again." : `The server returned error ${res.status}. Try again.`,
      res.ok ? 401 : res.status,
    );
  }
  const body = (await res.json()) as Record<string, unknown>;
  if (res.status === 401) reportExpired();
  if (!res.ok) throw new ApiError(String(body.error ?? `The server returned error ${res.status}. Try again.`), res.status, body);
  return body as T;
}

/** The field errors a 400 from the details endpoint carries, if any. */
export const detailErrors = (error: unknown): MediaDetailErrors | null =>
  error instanceof ApiError && error.body.errors && typeof error.body.errors === "object" ? (error.body.errors as MediaDetailErrors) : null;

/** What replacing the main file returns: its new version and the details now in force. */
export type ReplaceResult = {
  src: string;
  version?: string;
  digest?: string;
  size?: number;
  type?: string;
  base?: string | null;
  title?: string;
  alt?: string;
  caption?: string;
  trashed?: boolean;
};

export const mediaApi = {
  saveDetails: (asset: { src: string; title: string; alt: string; caption: string; trashed: boolean; base: string | null }) =>
    request<{ base: string }>("/media", { method: "PUT", body: JSON.stringify(asset) }),
  /** One file of a replacement; `part` is a smaller width or the poster, omitted for the main file. */
  replace: (src: string, blob: Blob, part?: string) =>
    request<ReplaceResult>(
      `/media/replace?${new URLSearchParams({ src, ...(part ? { part } : {}) })}`,
      { method: "POST", body: blob, headers: { "Content-Type": blob.type } },
      120_000,
    ),
  destroy: (src: string) => request<{ deleted: string[] }>(`/media?${new URLSearchParams({ src })}`, { method: "DELETE" }),
};
