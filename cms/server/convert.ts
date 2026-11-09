import { CONTENT_DIR, parsePost, type Draft } from "../format";
import { cleanEditorDocument } from "../editor-document";
import { publishedFingerprint } from "../published-fingerprint";
import { listDir, readFile } from "./github";
import { applyParent, readHierarchy } from "./hierarchy";
import { HttpError, ID, type AdminEnv } from "./http";
import { projectEnvironment } from "./project-environment";

export type ConversionWorkspace = "writing" | "projects";
export type ConversionInput = { version: 1; sourceWorkspace: ConversionWorkspace; id: string; base: string };
export type ConversionResult = {
  post: Draft;
  targetWorkspace: ConversionWorkspace;
  source: ConversionInput;
  revisionCount: number;
  replayed: boolean;
  notices: string[];
};

export class ConversionError extends HttpError {
  constructor(readonly code: string, message: string, status = 409) { super(message, status); }
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_OBJECT_BYTES = 2 * 1024 * 1024;
const MAX_PLAN_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 500;
const MAX_REVISIONS = 120;
const notices = [
  "The source, its live URL, schedule, and incoming links remain unchanged.",
  "The copy is an unpublished top-level draft with no URL or schedule. Folder and collection placement stay with the source.",
  "Uploaded media URLs are shared, not duplicated. Saved revisions are copied; the editor undo stack is not. Normal revision retention still applies.",
];
const currentKey = (id: string) => `drafts/${id}/current.json`;
const revisionPrefix = (id: string) => `drafts/${id}/rev/`;
const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
const fingerprint = async (value: unknown) => (await publishedFingerprint(JSON.stringify(value)))!;
const conflict = () => new ConversionError("destination_conflict", "The reserved destination already contains different data. Nothing was overwritten. Keep the existing page and save a new source version before trying again.");
const changed = () => new ConversionError("source_changed", "The source, history, or workspace changed during conversion. Reload and save the source, then convert its latest saved version. The original is unchanged.");

export function parseConversionInput(value: unknown): ConversionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConversionError("invalid_input", "Expected a conversion request.", 400);
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["version", "sourceWorkspace", "id", "base"].includes(key)) ||
    v.version !== 1 || !["writing", "projects"].includes(String(v.sourceWorkspace)) ||
    typeof v.id !== "string" || !ID.test(v.id) || typeof v.base !== "string" ||
    !ISO.test(v.base) || !Number.isFinite(Date.parse(v.base)) || new Date(v.base).toISOString() !== v.base) {
    throw new ConversionError("invalid_input", "Use version 1, a writing/projects sourceWorkspace, a valid id, and the saved updatedAt as base.", 400);
  }
  return { version: 1, sourceWorkspace: v.sourceWorkspace as ConversionWorkspace, id: v.id, base: v.base };
}

type Stored<T> = { value: T; etag: string; metadata: Record<string, string> };
async function readObject<T>(bucket: R2Bucket, key: string, limit = MAX_OBJECT_BYTES): Promise<Stored<T> | null> {
  const object = await bucket.get(key);
  if (!object) return null;
  if (object.size > limit) throw new ConversionError("size_limit", "This conversion exceeds the safe size limit. Use an export/import workflow for this document.", 413);
  const text = await object.text();
  if (byteLength(text) > limit) throw new ConversionError("size_limit", "This conversion exceeds the safe size limit. Use an export/import workflow for this document.", 413);
  try { return { value: JSON.parse(text) as T, etag: object.etag, metadata: object.customMetadata ?? {} }; }
  catch { throw new ConversionError("invalid_storage", "A stored document cannot be read safely. Repair it from a backup before converting."); }
}

async function listObjects(bucket: R2Bucket, prefix: string, limit: number, delimiter?: string) {
  const objects: { key: string; etag: string }[] = [], prefixes: string[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const page = await bucket.list({ prefix, delimiter, cursor, limit: 1000 });
    objects.push(...page.objects.map(o => ({ key: o.key, etag: o.etag })));
    prefixes.push(...page.delimitedPrefixes);
    if (objects.length + prefixes.length > limit) throw new ConversionError("size_limit", "This workspace or history exceeds the conversion scan limit. Use an export/import workflow.", 413);
    cursor = page.truncated ? page.cursor : undefined;
    if (page.truncated && (!cursor || seen.has(cursor))) throw new ConversionError("incomplete_scan", "Storage returned an incomplete listing. Retry conversion.", 503);
    if (cursor) seen.add(cursor);
  } while (cursor);
  objects.sort((a, b) => a.key.localeCompare(b.key));
  return { objects, prefixes: prefixes.sort() };
}

/** Bypass livePosts' cache and its skip-on-parse-error behavior for safety checks. */
async function publicPages(env: AdminEnv) {
  const files = (await listDir(env, CONTENT_DIR)).filter(f => f.name.endsWith(".md")).sort((a, b) => a.path.localeCompare(b.path));
  if (files.length > MAX_PAGES) throw new ConversionError("size_limit", "Too many published pages to verify safely. Use an export/import workflow.", 413);
  const pages = [];
  for (const file of files) {
    const text = await readFile(env, file.path);
    try {
      if (text === null || byteLength(text) > MAX_OBJECT_BYTES) throw new Error();
      pages.push({ post: parsePost(text), fingerprint: await fingerprint(text) });
    } catch { throw new ConversionError("invalid_public_source", "A published file could not be verified. Repair or finish publishing that file before conversion."); }
  }
  return pages;
}

/** Inspect both stored parentId and hierarchy overrides, including Git-only children. */
async function sourceState(env: AdminEnv, input: ConversionInput) {
  const hierarchy = await readHierarchy(env);
  const listing = await listObjects(env.WRITING, "drafts/", MAX_PAGES, "/");
  const drafts: Stored<Draft>[] = [];
  for (const prefix of listing.prefixes) {
    const id = /^drafts\/([a-z0-9]{6,32})\/$/.exec(prefix)?.[1];
    if (!id) throw new ConversionError("invalid_storage", "A draft has an unsupported identity. Repair it before conversion.");
    const item = await readObject<Draft>(env.WRITING, currentKey(id));
    if (item) {
      validateDraft(item.value, id);
      drafts.push(item);
    }
  }
  const source = drafts.find(d => d.value.id === input.id);
  if (!source) throw new ConversionError("source_missing", "Open and save this page in its source workspace before converting. A Git-only page is never adopted by conversion.", 404);
  if (source.value.updatedAt !== input.base) throw changed();
  if (source.value.trashedAt) throw new ConversionError("source_trashed", "Restore the source from Trash before converting.");
  const live = await publicPages(env);
  const pages = [...drafts.map(d => d.value), ...live.map(p => p.post).filter(p => !drafts.some(d => d.value.id === p.id))];
  if (pages.some(p => p.id !== input.id && applyParent(p, hierarchy.value).parentId === input.id) ||
    Object.entries(hierarchy.value.parents).some(([id, parent]) => id !== input.id && parent === input.id)) {
    throw new ConversionError("subtree_unsupported", "This page has child pages (possibly in Trash). Subtree conversion needs atomic tree support and is blocked. Convert individual leaf pages instead; the original tree stays intact.");
  }
  if (applyParent(source.value, hierarchy.value).parentId === input.id) throw new ConversionError("invalid_hierarchy", "This page is its own parent. Repair its location before converting.");
  const research = await listObjects(env.WRITING, "research/", MAX_PAGES);
  for (const item of research.objects) {
    const record = await readObject<{ pageId?: string; rules?: { include?: string[] } }>(env.WRITING, item.key);
    if (!record || record.etag !== item.etag) throw changed();
    if (record.value.pageId === input.id || record.value.rules?.include?.includes(input.id)) {
      throw new ConversionError("linked_research", "This page has linked research, review notes, excerpts, or explicit collection membership. Copy those records with a coordinated migration before conversion; they cannot be silently left behind.");
    }
  }
  const history = await listObjects(env.WRITING, revisionPrefix(input.id), MAX_REVISIONS);
  return { source, history, guard: await fingerprint({
    hierarchy: hierarchy.etag ?? null,
    drafts: drafts.map(d => [d.value.id, d.etag]),
    live: live.map(p => [p.post.id, p.fingerprint]), research: research.objects, history: history.objects,
  }) };
}

function validateDraft(value: Draft, id: string) {
  if (!value || typeof value !== "object" || value.id !== id || typeof value.title !== "string" ||
    typeof value.body !== "string" || value.body.length > 400000 || !Array.isArray(value.tags) ||
    !["draft", "scheduled", "published"].includes(value.status) || typeof value.updatedAt !== "string") {
    throw new ConversionError("invalid_document", "A saved document or revision is malformed. Repair it from history before converting.");
  }
  try { cleanEditorDocument(value.editorDocument, value.body); }
  catch { throw new ConversionError("invalid_editor_document", "A saved editor document or revision has an unsupported schema or mismatched Markdown. Repair that saved version before converting."); }
}

/** Remap only self references. Other private references must never resolve to an unrelated target ID. */
function remapDocument(source: Draft, id: string, context: string): Draft {
  const blocked = () => new ConversionError("unsafe_reference", `${context} contains a page reference outside this copy. Replace it with an explicit public URL in a separate draft, or use a migration that includes the referenced pages and history.`);
  const walk = (value: unknown, depth = 0): unknown => {
    if (depth > 60) throw new ConversionError("invalid_document", "Document metadata is nested too deeply to convert safely.");
    if (typeof value === "string") {
      if (/data-poll\s*=|\[Pending media:|blob:/i.test(value)) throw new ConversionError("unsafe_media", `${context} contains a poll or pending local media. Finish uploads, or use a separate draft without polls; poll votes cannot be safely copied.`);
      if (/%23page|#page%3d/i.test(value)) throw blocked();
      return value.replace(/#page=([^\s"'<>()[\]\\&]+)/g, (_match, target: string) => {
        if (target !== source.id) throw blocked();
        return `#page=${id}`;
      });
    }
    if (Array.isArray(value)) return value.map(v => walk(v, depth + 1));
    if (!value || typeof value !== "object") return value;
    const object = value as Record<string, unknown>;
    if (object.type === "poll") throw new ConversionError("unsafe_media", `${context} contains a poll. Use a separate draft without polls; copied polls would share live vote state.`);
    if (object.kind === "page" && object.id !== source.id) throw blocked();
    return Object.fromEntries(Object.entries(object).map(([key, v]) => [key,
      object.kind === "page" && key === "id" ? id : walk(v, depth + 1),
    ]));
  };
  return walk(source) as Draft;
}

type Plan = {
  version: 1;
  input: ConversionInput;
  token: string;
  targetId: string;
  at: string;
  guard: string;
  source: Draft;
  revisions: { at: string; value: Draft; metadata: Record<string, string> }[];
};

function draftCopy(plan: Plan, source: Draft, target: ConversionWorkspace, historical = false): Draft {
  const copy = remapDocument(source, plan.targetId, historical ? "A saved revision" : "The source");
  // Keep project metadata even in Writing. Existing saves spread the stored draft,
  // so a Project -> Writing -> Project roundtrip retains all project fields.
  if (target === "projects") copy.kind = "project";
  else delete copy.kind;
  delete copy.publicationReceipt;
  return { ...copy, id: plan.targetId, creationRequestId: plan.token, parentId: null,
    slug: "", status: "draft", publishAt: null, publishedAt: null, liveSlug: null,
    redirectFrom: [], publishedFingerprint: null, trashedAt: null, dirty: true,
    createdAt: historical ? source.createdAt : plan.at, updatedAt: historical ? source.updatedAt : plan.at };
}

async function writeOnce(bucket: R2Bucket, key: string, value: unknown, metadata: Record<string, string>) {
  const text = JSON.stringify(value);
  const written = await bucket.put(key, text, { onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "application/json" }, customMetadata: metadata });
  if (written) return;
  const existing = await readObject<unknown>(bucket, key, MAX_PLAN_BYTES);
  if (!existing || JSON.stringify(existing.value) !== text || existing.metadata.conversion !== metadata.conversion) throw conflict();
}

/**
 * Source-preserving COPY. R2 has no multi-object transaction and shared readers
 * do not understand staging, so v1 refuses subtrees. Revisions are staged first;
 * current.json is the only visibility point. No source write, publish, or delete.
 * The immutable plan archives the exact original data, including lifecycle fields.
 * Same source workspace/id/base always yields the same operation and destination.
 */
export async function convertDocument(env: AdminEnv, value: unknown): Promise<ConversionResult> {
  const input = parseConversionInput(value);
  if (env.contentKind) throw new ConversionError("invalid_namespace", "Call the root /api/admin/convert endpoint with the unscoped environment.", 400);
  const targetWorkspace = input.sourceWorkspace === "projects" ? "writing" : "projects";
  const sourceEnv = input.sourceWorkspace === "projects" ? projectEnvironment(env) : env;
  const targetEnv = targetWorkspace === "projects" ? projectEnvironment(env) : env;
  const bucket = targetEnv.WRITING;
  const digest = await fingerprint(["document-conversion-v1", input.sourceWorkspace, input.id, input.base]);
  const token = `conversion-v1:${digest}`;
  const planKey = `conversions/v1/${digest}/plan.json`, doneKey = `conversions/v1/${digest}/complete.json`;
  const targetId = digest.slice(0, 12);
  let stored = await readObject<Plan>(bucket, planKey, MAX_PLAN_BYTES);

  const result = async (plan: Plan, replayed: boolean): Promise<ConversionResult | null> => {
    const existing = await readObject<Draft>(bucket, currentKey(targetId));
    if (!existing) {
      if (await bucket.head(doneKey)) throw new ConversionError("destination_removed", "This saved version was already converted, but the copy was deleted. Restore it from Trash or save a new source version to create another copy.");
      return null;
    }
    if (existing.value.creationRequestId !== token || existing.value.id !== targetId) throw conflict();
    await writeOnce(bucket, doneKey, { version: 1, targetId, token }, { conversion: token });
    const warnings = [...notices];
    try {
      const at = new Date().toISOString();
      await bucket.put("meta/pulse", JSON.stringify({ at, id: targetId }), { customMetadata: { at, id: targetId } });
    } catch { warnings.push("The copy was saved, but workspace refresh failed. Refresh the destination list manually."); }
    return { post: existing.value, source: input, targetWorkspace, revisionCount: plan.revisions.length, replayed, notices: warnings };
  };

  try {
    if (stored) {
      if (stored.value.version !== 1 || stored.value.token !== token || stored.value.targetId !== targetId || JSON.stringify(stored.value.input) !== JSON.stringify(input)) throw conflict();
      const completed = await result(stored.value, true);
      if (completed) return completed;
    }
    const state = await sourceState(sourceEnv, input);
    if (stored && state.guard !== stored.value.guard) throw changed();
    if (!stored) {
      const revisions: Plan["revisions"] = [];
      let size = byteLength(JSON.stringify(state.source.value));
      for (const item of state.history.objects) {
        const at = item.key.slice(revisionPrefix(input.id).length, -5);
        if (!item.key.endsWith(".json") || !ISO.test(at) || !Number.isFinite(Date.parse(at))) throw new ConversionError("invalid_history", "A revision has an unsupported timestamp. Repair the history before converting.");
        const revision = await readObject<Draft>(sourceEnv.WRITING, item.key);
        if (!revision || revision.etag !== item.etag) throw changed();
        validateDraft(revision.value, input.id);
        size += byteLength(JSON.stringify(revision.value));
        if (size > MAX_PLAN_BYTES - 100000) throw new ConversionError("size_limit", "This history exceeds the 12 MiB conversion limit. Use an export/import workflow.", 413);
        revisions.push({ at, value: revision.value, metadata: revision.metadata });
      }
      const plan: Plan = { version: 1, input, token, targetId, at: new Date().toISOString(), guard: state.guard, source: state.source.value, revisions };
      draftCopy(plan, plan.source, targetWorkspace);
      for (const rev of revisions) draftCopy(plan, rev.value, targetWorkspace, true);
      // Reserve no destination data until every source revision has passed validation.
      // Another request may already be staging this same deterministic copy.
      // Reserve/read the immutable plan first; destination checks below verify
      // ownership without mistaking a concurrent retry's revisions for a clash.
      const saved = await bucket.put(planKey, JSON.stringify(plan), { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" } });
      stored = saved ? { value: plan, etag: saved.etag, metadata: {} } : await readObject<Plan>(bucket, planKey, MAX_PLAN_BYTES);
      if (!stored || stored.value.token !== token || stored.value.guard !== state.guard) throw changed();
    }
    const plan = stored.value;
    // Another retry may have finished while this request performed its scan.
    const completed = await result(plan, true);
    if (completed) return completed;
    const destinationHierarchy = await readHierarchy(targetEnv);
    if (Object.hasOwn(destinationHierarchy.value.parents, targetId) || Object.values(destinationHierarchy.value.parents).includes(targetId) ||
      Object.entries(destinationHierarchy.value.orders ?? {}).some(([parent, ids]) => parent === targetId || ids.includes(targetId)) ||
      await bucket.head(`scheduled/${targetId}`) || await bucket.head(`indexes/private/${targetId}.json`) ||
      (await publicPages(targetEnv)).some(p => p.post.id === targetId)) throw conflict();
    const allowed = new Set(plan.revisions.map(r => `${revisionPrefix(targetId)}${r.at}.json`));
    for (const object of (await listObjects(bucket, `drafts/${targetId}/`, MAX_REVISIONS + 2)).objects) {
      if (object.key === currentKey(targetId)) continue; // Final create-only write resolves this race.
      if (!allowed.has(object.key)) throw conflict();
    }
    for (const rev of plan.revisions) {
      await writeOnce(bucket, `${revisionPrefix(targetId)}${rev.at}.json`, draftCopy(plan, rev.value, targetWorkspace, true), { ...rev.metadata, conversion: token });
    }
    // Detect source saves (including same-timestamp overwrites), history pruning,
    // hierarchy/research changes and Git-only descendants before exposing the copy.
    if ((await sourceState(sourceEnv, input)).guard !== plan.guard) throw changed();
    const copy = draftCopy(plan, plan.source, targetWorkspace);
    const created = await bucket.put(currentKey(targetId), JSON.stringify(copy), {
      onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" },
      customMetadata: { conversion: token, title: copy.title.slice(0, 200), status: "draft", updatedAt: copy.updatedAt },
    });
    const answer = await result(plan, !created);
    if (!answer) throw new ConversionError("copy_incomplete", "The copy could not be confirmed. Retry the same saved version; no original was changed.", 503);
    return answer;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Includes unknown write outcomes. Never roll back: a concurrent retry or user
    // may already own/edit the copy. Create-only retries recover the exact plan.
    throw new ConversionError("copy_incomplete", "Conversion could not be confirmed. Retry the same saved source version to resume or find its copy. Nothing in the source was changed.", 503);
  }
}
