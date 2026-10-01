import { postToDraft } from "../format";
import { indexDocument, type DocumentIndex } from "../research";
import { livePosts, type CmsEnv } from "./publish";
import { getDraft } from "./store";
import { applyParent, readHierarchy } from "./hierarchy";
import { proseBlocks } from "./prose-index";

/** Per-document indexes are disposable: compare source versions and repair lazily. */
export async function researchIndex(env: CmsEnv): Promise<DocumentIndex[]> {
  const hierarchy=(await readHierarchy(env)).value;
  const keys: { id: string; updatedAt?: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({
      prefix: "drafts/",
      cursor,
      delimiter: "/",
    });
    for (const prefix of page.delimitedPrefixes) {
      const m = /^drafts\/([a-z0-9]{12})\/$/.exec(prefix);
      if (m) keys.push({ id: m[1] });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const rows: DocumentIndex[] = [];
  // Bound object reads instead of starting one request for every post at once.
  for (let start = 0; start < keys.length; start += 12)
    await Promise.all(
      keys.slice(start, start + 12).map(async (key) => {
        const current = await env.WRITING.head(`drafts/${key.id}/current.json`);
        if (!current) return;
        key.updatedAt = current.customMetadata?.updatedAt;
        const cached = await env.WRITING.get(`indexes/private/${key.id}.json`);
        const value = cached
          ? await cached.json<DocumentIndex & { deleted?: boolean }>()
          : null;
        if (value?.version === 3 && Array.isArray(value.mentionBlocks) && typeof value.searchText==="string" && key.updatedAt && value.updatedAt === key.updatedAt) {
          if (!value.deleted) rows.push(value);
          return;
        }
        const d = await getDraft(env, key.id,hierarchy);
        if (!d) return;
        const index = { ...indexDocument(d), mentionBlocks: proseBlocks(d), deleted: Boolean(d.trashedAt) };
        await env.WRITING.put(
          `indexes/private/${d.id}.json`,
          JSON.stringify(index),
        );
        if (!index.deleted) rows.push(index);
      }),
    );
  const known = new Set(keys.map((k) => k.id));
  for (const p of await livePosts(env))
    if (!known.has(p.id)) {
      const draft = postToDraft(p);
      rows.push({ ...indexDocument(draft), mentionBlocks: proseBlocks(draft) });
    }
  return rows.map(row=>applyParent(row,hierarchy));
}
