import type { Draft } from "../../../cms/format";

/*
 * The admin's only door to the server. Every call is same-origin, so the
 * Cloudflare Access cookie rides along and Access adds the signed token the
 * API checks.
 */

export type { Draft };

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  dek: string;
  icon: string | null;
  tags: string[];
  cover: string | null;
  status: Draft["status"];
  page: boolean;
  publishAt: string | null;
  publishedAt: string | null;
  liveSlug: string | null;
  dirty: boolean;
  minutes: number;
  createdAt: string;
  updatedAt: string;
};

export type Revision = { at: string; label: string; words: number };

export type SearchHit = { field: "title" | "dek" | "body"; snippet: string; start: number; length: number; occurrence: number };
export type SearchResult = {
  id: string;
  title: string;
  icon: string | null;
  status: Draft["status"];
  dirty: boolean;
  updatedAt: string;
  total: number;
  hits: SearchHit[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      credentials: "same-origin",
      ...init,
      headers: { ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("You're offline, or the server can't be reached.", 0);
  }
  // Access answers an expired session with its own login page, not JSON.
  const type = res.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json")) {
    throw new ApiError(
      res.redirected || res.status === 302 || res.ok ? "Your sign-in expired. Reload to sign in again." : `The server answered ${res.status}.`,
      res.ok ? 401 : res.status
    );
  }
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(body.error ?? `Request failed (${res.status})`), res.status, body);
  return body as T;
}

const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });
const post = (body: unknown = {}): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  me: () => call<{ email: string; github: boolean; storage: boolean }>("/me"),
  list: () => call<{ posts: PostSummary[] }>("/posts"),
  create: (title = "") => call<{ post: Draft }>("/posts", post({ title })),
  get: (id: string) => call<{ post: Draft }>(`/posts/${id}`),
  save: (
    id: string,
    edit: Partial<Pick<Draft, "title" | "slug" | "dek" | "tags" | "cover" | "body" | "icon" | "authors" | "fonts" | "page">> & { base?: string; snapshot?: boolean }
  ) =>
    call<{ post: Draft; snapshotted: boolean }>(`/posts/${id}`, put(edit)),
  duplicate: (id: string) => call<{ post: Draft }>(`/posts/${id}/duplicate`, post()),
  search: (q: string, signal?: AbortSignal) => call<{ q: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`, { signal }),
  remove: (id: string) => call<{ ok: true }>(`/posts/${id}`, { method: "DELETE" }),
  publish: (id: string, at?: string) => call<{ post: Draft }>(`/posts/${id}/publish`, post(at ? { at } : {})),
  unpublish: (id: string) => call<{ post: Draft }>(`/posts/${id}/unpublish`, post()),
  revisions: (id: string) => call<{ revisions: Revision[] }>(`/posts/${id}/revisions`),
  revision: (id: string, at: string) => call<{ revision: Draft }>(`/posts/${id}/revisions/${encodeURIComponent(at)}`),
  restore: (id: string, at: string) => call<{ post: Draft }>(`/posts/${id}/revisions/${encodeURIComponent(at)}`, post()),
  upload: async (blob: Blob, width?: number, height?: number) => {
    const q = new URLSearchParams();
    if (width) q.set("w", String(width));
    if (height) q.set("h", String(height));
    return call<{ src: string; width?: number; height?: number }>(`/uploads?${q}`, {
      method: "POST",
      body: blob,
      headers: { "Content-Type": blob.type },
    });
  },
};

/* ── Images ────────────────────────────────────────────────────────────── */

const MAX_EDGE = 2400;

/**
 * Resize and re-encode before upload: phone photos arrive at 12 MP and 5 MB,
 * and nobody reading needs that. WebP at 2400px on the long edge covers a
 * retina figure at the widest breakout. GIFs pass through untouched, since a
 * canvas would keep only the first frame.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.type === "image/svg+xml") throw new ApiError("SVGs can't be uploaded; export it as PNG or WebP.", 415);
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.type === "image/gif") {
    bitmap.close();
    return { blob: file, width, height };
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ApiError("This browser can't process images.", 0);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  // Safari before 17 can't encode WebP and hands back PNG or null.
  if (!blob || blob.type !== "image/webp") {
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!jpeg) throw new ApiError("Couldn't process that image.", 0);
    return { blob: jpeg, width: w, height: h };
  }
  return { blob, width: w, height: h };
}

/** "IMG_2041 final-final.jpg" → "IMG 2041 final final": a starting point for alt text, not alt text. */
export const altFromName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
