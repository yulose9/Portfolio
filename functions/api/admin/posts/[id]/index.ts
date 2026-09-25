import { normalizeAuthors, type Draft, type FontChoice, type Fonts } from "../../../../../cms/format";
import { HttpError, json, param, readJson, type AdminFunction } from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { removeLive } from "../../../../../cms/server/publish";
import { deleteDraft, putDraft, snapshot } from "../../../../../cms/server/store";

export const onRequestGet: AdminFunction<"id"> = async ({ env, params }) =>
  json({ post: await loadDraft(env, param(params.id)) });

/** The fields the editor may change. Status and what's live belong to the server. */
const EDITABLE = ["title", "slug", "dek", "icon", "authors", "fonts", "tags", "cover", "body"] as const;
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
    next.tags = (Array.isArray(edit.tags) ? edit.tags : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
  if (edit.cover !== undefined) next.cover = edit.cover && typeof edit.cover.src === "string" ? edit.cover : null;
  if (edit.body !== undefined) next.body = String(edit.body);
  if (edit.icon !== undefined) next.icon = typeof edit.icon === "string" && edit.icon.trim() ? [...edit.icon.trim()].slice(0, 8).join("") : null;
  if (edit.authors !== undefined) next.authors = normalizeAuthors(edit.authors);
  if (edit.fonts !== undefined) next.fonts = cleanFonts(edit.fonts);
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

export const onRequestDelete: AdminFunction<"id"> = async ({ env, params }) => {
  const id = param(params.id);
  const draft = await loadDraft(env, id).catch((error) => {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  });
  await removeLive(env, draft, null);
  await deleteDraft(env, id);
  return json({ ok: true });
};
