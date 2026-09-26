import { normalizeAuthors, type Cover, type Draft, type FontChoice, type Fonts } from "../../../../../cms/format";
import { HttpError, json, param, readJson, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { removeLive } from "../../../../../cms/server/publish";
import { deleteDraft, putDraft, setScheduled, snapshot } from "../../../../../cms/server/store";

export const onRequestGet: AdminFunction<"id"> = async ({ env, params }) =>
  json({ post: await loadDraft(env, param(params.id)) });

/** The fields the editor may change. Status and what's live belong to the server. */
const EDITABLE = ["title", "slug", "dek", "icon", "authors", "fonts", "page", "ogImage", "pinned", "tags", "cover", "body", "publishedAt"] as const;
type Edit = Partial<Pick<Draft, (typeof EDITABLE)[number]>> & {
  /** The updatedAt the editor last saw. A mismatch means another tab saved in between. */
  base?: string;
  /** ⌘S: always keep a revision. */
  snapshot?: boolean;
};

export const onRequestPut: AdminFunction<"id"> = async ({ env, params, request }) => {
  const draft = await loadDraft(env, param(params.id));
  const edit = await readJson<Edit>(request);
  if (edit.base && edit.base !== draft.updatedAt) {
    return json({ error: "This post was saved in another tab since you opened it.", post: draft }, 409);
  }

  const next: Draft = { ...draft };
  if (edit.title !== undefined) next.title = String(edit.title).slice(0, 300);
  if (edit.slug !== undefined) next.slug = String(edit.slug).slice(0, 80);
  if (edit.dek !== undefined) next.dek = String(edit.dek).slice(0, 600);
  if (edit.tags !== undefined)
    next.tags = (Array.isArray(edit.tags) ? edit.tags : []).map((t) => String(t).trim().slice(0, 80)).filter(Boolean).slice(0, 8);
  if (edit.cover !== undefined) next.cover = cleanCover(edit.cover);
  if (edit.body !== undefined) next.body = String(edit.body);
  if (edit.icon !== undefined) next.icon = typeof edit.icon === "string" && edit.icon.trim() ? [...edit.icon.trim()].slice(0, 8).join("") : null;
  if (edit.authors !== undefined) next.authors = normalizeAuthors(edit.authors);
  if (edit.fonts !== undefined) next.fonts = cleanFonts(edit.fonts);
  if (edit.page !== undefined) next.page = edit.page !== false;
  if (edit.ogImage !== undefined) next.ogImage = typeof edit.ogImage === "string" && /^(cover|\/media\/[\w./-]+)$/.test(edit.ogImage) ? edit.ogImage : null;
  if (edit.pinned !== undefined) next.pinned = Boolean(edit.pinned);
  // The date a post shows: backdate an essay, or fix a typo in the year.
  if (edit.publishedAt !== undefined) {
    if (edit.publishedAt === null) next.publishedAt = null;
    else if (typeof edit.publishedAt === "string" && !Number.isNaN(Date.parse(edit.publishedAt))) next.publishedAt = new Date(edit.publishedAt).toISOString();
    else throw new HttpError("That date isn’t valid.");
  }
  if (next.body.length > 400_000) throw new HttpError("That's longer than a post can be (400k characters).", 413);

  const changed = EDITABLE.some((k) => JSON.stringify(next[k]) !== JSON.stringify(draft[k]));
  if (changed) {
    next.updatedAt = new Date().toISOString();
    next.dirty = true;
    await putDraft(env, next);
  }
  const snapshotted = await snapshot(env, next, Boolean(edit.snapshot));
  return json({ post: next, snapshotted });
};

function cleanCover(value: unknown): Cover | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError("Invalid cover.");
  const v = value as Record<string, unknown>;
  if (typeof v.src !== "string" || v.src.length > 2048 || typeof v.alt !== "string" || v.alt.length > 1000) throw new HttpError("Invalid cover image or alt text.");
  const src = v.src.trim();
  let url: URL;
  try { url = new URL(src, "https://nazarene.dev"); }
  catch { throw new HttpError("Invalid cover URL."); }
  if (!src || /[\u0000-\u0020\\]/.test(src) || url.protocol !== "https:" || url.username || url.password) throw new HttpError("Use an HTTPS or local image URL.");
  const result: Cover = { src, alt: v.alt };
  if (v.caption !== undefined) {
    if (typeof v.caption !== "string" || v.caption.length > 2000) throw new HttpError("Invalid cover caption.");
    result.caption = v.caption;
  }
  for (const key of ["width", "height"] as const) {
    if (v[key] !== undefined) {
      if (typeof v[key] !== "number" || !Number.isInteger(v[key]) || v[key] < 1 || v[key] > 30000) throw new HttpError("Invalid image dimensions.");
      result[key] = v[key];
    }
  }
  return result;
}

function cleanFont(f: unknown): FontChoice | null {
  if (!f || typeof f !== "object") return null;
  const { family, source } = f as FontChoice;
  if (typeof family !== "string" || !/^[\w \-]{1,60}$/.test(family.trim())) return null;
  return { family: family.trim(), source: source === "fontshare" ? "fontshare" : "google" };
}

function cleanFonts(value: unknown): Fonts | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Fonts;
  const fonts = { heading: cleanFont(v.heading), body: cleanFont(v.body) };
  return fonts.heading || fonts.body ? fonts : null;
}

/*
 * DELETE moves a post to the trash (taking it off the site if it was live);
 * DELETE ?forever=1 deletes it and its whole history. Reading the list never
 * deletes trash; permanent deletion requires this explicit authenticated write.
 */
export const onRequestDelete: AdminFunction<"id"> = async ({ env, params, request }) => {
  const id = param(params.id);
  const forever = new URL(request.url).searchParams.get("forever") === "1";
  const draft = await loadDraft(env, id).catch((error) => {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  });
  await removeLive(env, draft, null);
  if (forever || !draft) {
    await deleteDraft(env, id);
    return json({ ok: true, deleted: true });
  }
  const now = new Date().toISOString();
  const trashed: Draft = { ...draft, status: "draft", liveSlug: null, publishAt: null, trashedAt: now, dirty: true, updatedAt: now };
  await putDraft(env, trashed);
  await setScheduled(env, id, null);
  return json({ ok: true, post: trashed });
};
