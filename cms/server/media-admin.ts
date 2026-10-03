import { listDrafts } from "./store";
import { livePosts } from "./publish";
import type { AdminEnv } from "./http";

/*
 * Where media is used, and what belongs to one asset. Shared by the media
 * list (to show "Used in") and by permanent deletion (which refuses while
 * anything still points at the file).
 */

export type MediaUse = { id: string; title: string; kind: "writing" | "project" | "website" };

type Source = {
  id: string;
  title: string;
  body: string;
  cover?: { src?: string } | null;
  ogImage?: string | null;
  authors?: { avatar?: string | null }[];
};

export type MediaSources = { kind: MediaUse["kind"]; pages: Source[] }[];

/** Every page that can reference media: writing drafts and live posts, project drafts, and the website's content. */
export async function mediaSources(env: AdminEnv): Promise<MediaSources> {
  // Project drafts join this list once the projects workspace ships.
  const [drafts, live, website] = await Promise.all([
    listDrafts(env),
    livePosts(env),
    env.WRITING.get("website/draft.json")
      .then((o) => (o ? o.text() : null))
      .catch(() => null),
  ]);
  return [
    { kind: "writing", pages: [...drafts, ...live] },
    { kind: "website", pages: website ? [{ id: "website", title: "Website", body: website }] : [] },
  ];
}

/** The pages that reference `src` (plain, or with a query such as ?v=). */
export function usedIn(sources: MediaSources, src: string): MediaUse[] {
  const uses = new Map<string, MediaUse>();
  for (const { kind, pages } of sources) {
    for (const d of pages) {
      if (
        d.body.includes(src) ||
        d.cover?.src === src ||
        d.ogImage === src ||
        (d.authors ?? []).some((a) => a.avatar === src)
      )
        uses.set(`${kind}:${d.id}`, { id: d.id, title: d.title, kind });
    }
  }
  return [...uses.values()];
}

/** The R2 keys that make up the asset at `key`: the file, its smaller widths and its poster. */
export async function mediaFamily(env: AdminEnv, key: string): Promise<string[]> {
  const m = /^(media\/\d{4}\/([a-z0-9]{10,24}))-[^/]+$/.exec(key);
  if (!m) return [key];
  const keys = [key];
  const sibling = new RegExp(`^${m[1]}-(?:\\d{2,5}|poster)\\.[a-z0-9]+$`);
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: `${m[1]}-`, cursor });
    for (const o of page.objects) if (o.key !== key && sibling.test(o.key)) keys.push(o.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

/** Drop this colo's cached copies of a public media URL (other colos keep theirs until they expire). */
export async function forgetCachedMedia(origin: string, keys: string[]): Promise<void> {
  try {
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    if (!cache) return;
    await Promise.all(keys.map((k) => cache.delete(new Request(new URL(`/${k}`, origin))).catch(() => false)));
  } catch {
    /* The cache is a convenience; the file is already replaced. */
  }
}
