import type { Editor } from "@tiptap/core";

import { needsAltText, type AltContext } from "../../../cms/alt-text";
import { ApiError } from "./api";
import { reportExpired, reportSession } from "./session";

/*
 * Suggested alt text, from /api/admin/alt-text (Workers AI). Same conventions
 * as api.ts: same-origin, the X-Admin-Request header, JSON both ways, and
 * Access's login page read as an expired session.
 *
 * A generated alt is a draft. It is remembered here by image src, and a field
 * whose value still equals it shows "Generated, review it" until edited.
 */

export const ALT_UNAVAILABLE = "Alt text generation needs Workers AI, which isn't connected here (local dev).";

/** The open page's title, set by the editor, for context on its pictures. */
export const altPage = { title: "" };

let availability: Promise<boolean> | null = null;

/** Whether the server has the AI binding; asked once per page load. */
export function altTextAvailable(): Promise<boolean> {
  availability ??= call<{ available: boolean }>({ method: "GET" })
    .then((r) => Boolean(r.available))
    .catch((error) => {
      availability = null;
      // An expired session isn't an answer; the next ask tries again.
      if (error instanceof ApiError && error.status === 401) return true;
      return false;
    });
  return availability;
}

async function call<T>(init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/admin/alt-text", {
      credentials: "same-origin",
      ...init,
      signal: AbortSignal.timeout(60_000),
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
  if (res.status === 503) availability = Promise.resolve(false);
  if (!res.ok) throw new ApiError(String(body.error ?? `The server returned error ${res.status}. Try again.`), res.status, { ...body, retryAfter: Number(res.headers.get("Retry-After")) || 0 });
  return body as T;
}

/** Only uploaded raster images can be described; swatches and outside links can't. */
export const canDescribe = (src: string | null | undefined) => Boolean(src && /^\/media\/\d{4}\/[a-z0-9]{10,24}-[0-9x]+\.(webp|jpg|png|gif)(?:[?#]|$)/.test(src));

const suggested = new Map<string, string>();
const pathOf = (src: string) => src.split(/[?#]/)[0];

/** True while `alt` is still exactly what was generated for this image. */
export function isSuggestedAlt(src: string | null | undefined, alt: string | null | undefined): boolean {
  return Boolean(src && alt && suggested.get(pathOf(src)) === alt);
}

/**
 * Alt text for an uploaded image (a /media/ src). Waits out one 429 when the
 * server says how long. The result is remembered as a suggestion.
 */
export async function generateAltText(src: string, context: AltContext = {}): Promise<string> {
  const body = JSON.stringify({ src: pathOf(src), context: { title: altPage.title, ...context } });
  let r: { alt: string };
  try {
    r = await call<{ alt: string }>({ method: "POST", body });
  } catch (error) {
    const wait = error instanceof ApiError && error.status === 429 ? Number(error.body.retryAfter) : 0;
    if (!wait || wait > 60) throw error;
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    r = await call<{ alt: string }>({ method: "POST", body });
  }
  suggested.set(pathOf(src), r.alt);
  return r.alt;
}

/** The nearest heading above `pos`, and the image's own caption. */
export function editorAltContext(editor: Editor, pos: number): AltContext {
  let heading = "";
  editor.state.doc.nodesBetween(0, Math.min(pos, editor.state.doc.content.size), (node) => {
    if (node.type.name === "heading") heading = node.textContent;
    return node.isBlock && node.type.name !== "heading";
  });
  const node = editor.state.doc.nodeAt(pos);
  return { heading, caption: typeof node?.attrs.title === "string" ? node.attrs.title : "" };
}

/**
 * After an upload lands in the body: if the image's alt is empty or still the
 * file name, ask for a suggestion in the background and fill it in, unless
 * someone has typed in the field meanwhile. Failures stay quiet: the field
 * still says it is missing, and the button is there to try again.
 */
export async function suggestAltForUpload(editor: Editor, src: string, placeholder: string, fileName?: string): Promise<void> {
  if (!canDescribe(src) || !(await altTextAvailable())) return;
  const find = () => {
    let found: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (found !== null) return false;
      if (node.type.name === "image" && node.attrs.src === src && needsAltText(node.attrs.alt, placeholder)) found = pos;
    });
    return found;
  };
  const start = find();
  if (start === null) return;
  let alt: string;
  try {
    alt = await generateAltText(src, { ...editorAltContext(editor, start), fileName });
  } catch {
    return;
  }
  if (editor.isDestroyed) return;
  const pos = find();
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (pos === null || !node) return;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt }).setMeta("addToHistory", false));
}
