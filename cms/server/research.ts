import { postToDraft } from "../format";
import { indexDocument, type DocumentIndex } from "../research";
import { livePosts, type CmsEnv } from "./publish";
import { getDraft } from "./store";

/** Per-document indexes are disposable: compare source versions and repair lazily. */
export async function researchIndex(env: CmsEnv): Promise<DocumentIndex[]> {
  const keys: { id: string; updatedAt?: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({
      prefix: "drafts/",
      cursor,
      include: ["customMetadata"],
    });
    for (const o of page.objects) {
      const m = /^drafts\/([a-z0-9]{12})\/current.json$/.exec(o.key);
      if (m) keys.push({ id: m[1], updatedAt: o.customMetadata?.updatedAt });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const rows: DocumentIndex[] = [];
  // Bound object reads instead of starting one request for every post at once.
  for (let start = 0; start < keys.length; start += 12)
    await Promise.all(
      keys.slice(start, start + 12).map(async (key) => {
        const cached = await env.WRITING.get(`indexes/private/${key.id}.json`);
        const value = cached
          ? await cached.json<DocumentIndex & { deleted?: boolean }>()
          : null;
        if (value && value.updatedAt === key.updatedAt) {
          if (!value.deleted) rows.push(value);
          return;
        }
        const d = await getDraft(env, key.id);
        if (!d) return;
        const index = { ...indexDocument(d), deleted: Boolean(d.trashedAt) };
        await env.WRITING.put(
          `indexes/private/${d.id}.json`,
          JSON.stringify(index),
        );
        if (!index.deleted) rows.push(index);
      }),
    );
  const known = new Set(keys.map((k) => k.id));
  for (const p of await livePosts(env))
    if (!known.has(p.id)) rows.push(indexDocument(postToDraft(p)));
  return rows;
}
