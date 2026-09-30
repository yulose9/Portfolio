import type { Draft } from "../../../cms/format";
import { reportSession, reportExpired } from "./session";
import { preparedMediaPart } from "./media-journal";

/*
 * The admin's only door to the server. Every call is same-origin, so the
 * Cloudflare Access cookie rides along and Access adds the signed token the
 * API checks.
 */

export type { Draft };

export type PostSummary = {
  navigationOrder?: number;
  editorial?: Draft["editorial"];
  parentId?: string | null;
  id: string;
  title: string;
  slug: string;
  dek: string;
  icon: string | null;
  tags: string[];
  cover: string | null;
  status: Draft["status"];
  page: boolean;
  pinned: boolean;
  trashedAt: string | null;
  publishAt: string | null;
  publishedAt: string | null;
  liveSlug: string | null;
  dirty: boolean;
  minutes: number;
  createdAt: string;
  updatedAt: string;
};

export type BulkAction = "publish" | "unpublish" | "schedule" | "trash" | "restore" | "destroy" | "pin" | "unpin";

export type Revision = { at: string; label: string; words: number };

export type SearchHit = { field: "title" | "dek" | "body"; snippet: string; start: number; length: number; occurrence: number; blockId?:string };
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
      signal: init.signal ? AbortSignal.any([init.signal,AbortSignal.timeout(path.startsWith("/uploads") ? 120_000 : 15_000)]) : AbortSignal.timeout(path.startsWith("/uploads") ? 120_000 : 15_000),
      headers: { "X-Admin-Request": "1", ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    if(init.signal?.aborted)throw new DOMException("Request cancelled","AbortError");
    throw new ApiError("You're offline, or the server can't be reached.", 0);
  }
  // Access answers an expired session with its own login page, not JSON.
  reportSession(Number(res.headers.get("X-Admin-Session-Expires")));
  const type = res.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json")) {
    if (res.redirected || res.status === 401 || res.status === 403 || res.ok) reportExpired();
    throw new ApiError(
      res.redirected || res.status === 302 || res.ok ? "Your sign-in expired. Reload to sign in again." : `The server returned error ${res.status}. Try again.`,
      res.ok ? 401 : res.status
    );
  }
  const body = (await res.json()) as Record<string, unknown>;
  if (res.status === 401) reportExpired();
  if (!res.ok) throw new ApiError(String(body.error ?? `The server returned error ${res.status}. Try again.`), res.status, body);
  return body as T;
}

const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });
const post = (body: unknown = {}): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  folders:()=>call<{value:import("../../../cms/folders").Folders;base:string|null}>("/folders"),
  changeFolder:(action:import("../../../cms/folders").FolderAction,base:string|null)=>call<{value:import("../../../cms/folders").Folders;base:string|null}>("/folders",put({action,base})),
  saveMedia: (asset: {src:string;title:string;alt:string;trashed:boolean;base:string|null}) => call<{base:string}>("/media",put(asset)),
  reorderPages: (parentId: string | null, previousIds: string[], ids: string[]) => call<{ids:string[]}>("/page-order", put({parentId,previousIds,ids})),
  media:(cursor?:string)=>call<{assets:import("./MediaLibrary").Asset[];cursor:string|null}>(`/media${cursor?`?cursor=${encodeURIComponent(cursor)}`:""}`),
  movePage:(id:string,parentId:string|null,previousParentId:string|null)=>call<{parentId:string|null}>(`/posts/${id}/parent`,put({parentId,previousParentId})),
  publishedSource:(id:string)=>call<{source:string|null;post:import("../../../cms/format").Post|null;fingerprint:string|null;base:string}>(`/posts/${id}/published-source`),
  reconcileSource:(id:string,input:{base:string;fingerprint:string|null;choice:"keep"|"import"})=>call<{post:Draft}>(`/posts/${id}/published-source`,post(input)),
  research: () => call<{items:import("../../../cms/research").ResearchItem[]}>("/research"),
  saveResearch: (item: Partial<import("../../../cms/research").ResearchItem> & {id:string;kind:import("../../../cms/research").ResearchItem["kind"];title:string;body:string}) => call<{item:import("../../../cms/research").ResearchItem}>(`/research/${encodeURIComponent(item.id)}`,put({...item,base:item.updatedAt})),
  references: (id:string) => call<{incoming:{id:string;title:string;icon:string|null;blockId?:string;snippet:string}[];outgoing:{id:string;title:string;snippet:string;missing:boolean}[]}>(`/posts/${id}/references`),
  tagPage:(slug:string)=>call<{page:import("../../../cms/tag-pages").TagPage}>(`/tags/${encodeURIComponent(slug)}`),
  saveTagPage:(slug:string,page:import("../../../cms/tag-pages").TagPage)=>call<{page:import("../../../cms/tag-pages").TagPage}>(`/tags/${encodeURIComponent(slug)}`,put({...page,base:page.updatedAt})),
  me: () => call<{ email: string; github: boolean; storage: boolean }>("/me"),
  list: () => call<{ posts: PostSummary[] }>("/posts"),
  create: (init: { title?: string; body?: string; tags?: string[]; page?: boolean; parentId?: string; requestId?:string } = {}) => call<{ post: Draft }>("/posts", post({requestId:crypto.randomUUID(),...init})),
  get: (id: string) => call<{ post: Draft }>(`/posts/${id}`),
  save: (
    id: string,
    edit: Partial<Pick<Draft, "title" | "slug" | "dek" | "tags" | "cover" | "body" | "icon" | "authors" | "fonts" | "page" | "ogImage" | "pinned" | "publishedAt" | "editorDocument" | "editorial">> & { base?: string; snapshot?: boolean }
  ) =>
    call<{ post: Draft; snapshotted: boolean }>(`/posts/${id}`, put(edit)),
  duplicate: (id: string) => call<{ post: Draft }>(`/posts/${id}/duplicate`, post()),
  search: (q: string, signal?: AbortSignal, filters: import("../../../cms/search").SearchOptions = {}) => call<{ q: string; results: SearchResult[] }>(`/search?${new URLSearchParams({q,...filters})}`, { signal }),
  /** To the trash; `forever` deletes it and its history. */
  remove: (id: string, forever = false) => call<{ ok: true; post?: Draft }>(`/posts/${id}${forever ? "?forever=1" : ""}`, { method: "DELETE" }),
  untrash: (id: string) => call<{ post: Draft }>(`/posts/${id}/restore`, post()),
  publish: (id: string, at?: string) => call<{ post: Draft }>(`/posts/${id}/publish`, post(at ? { at } : {})),
  unpublish: (id: string) => call<{ post: Draft }>(`/posts/${id}/unpublish`, post()),
  bulk: (action: BulkAction, ids: string[], at?: string) =>
    call<{ posts: Draft[]; deleted?: string[]; failed: { id: string; error: string }[] }>("/bulk", post({ action, ids, at })),
  revisions: (id: string) => call<{ revisions: Revision[] }>(`/posts/${id}/revisions`),
  revision: (id: string, at: string) => call<{ revision: Draft }>(`/posts/${id}/revisions/${encodeURIComponent(at)}`),
  restore: (id: string, at: string) => call<{ post: Draft }>(`/posts/${id}/revisions/${encodeURIComponent(at)}`, post()),
  /** Upload an already-prepared file under a name from cms/media.ts. */
  uploadNamed: async (blob: Blob, name: string, signal?:AbortSignal,year?:number) => {
    const bytes=signal&&year?await preparedMediaPart(name,year,blob):blob;
    signal?.throwIfAborted();
    return call<{ src: string }>(`/uploads?name=${encodeURIComponent(name)}${year?`&year=${year}`:""}`, { method: "POST", body: bytes,signal, headers: { "Content-Type": bytes.type } });
  },
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
