/**
 * Publishing: the one place a draft becomes a file in git.
 *
 * Slugs, the rules:
 *  - While a post has never been live, its slug is free to change; nothing
 *    links to it yet.
 *  - Once live, changing the slug moves the file and records the old slug in
 *    `redirectFrom`. The build turns each one into a 301 (next.config.js writes
 *    out/_redirects), so old links keep working forever.
 *  - A slug is never reused while another post, live or redirecting, holds it.
 *
 * Scheduling is only for a post's first appearance. A live post's edits go
 * out when published, because a public repo would show a scheduled edit early
 * anyway — the thing the drafts-in-R2 design exists to avoid.
 */

import { draftToPost, isValidSlug, parsePost, postPath, serializePost, CONTENT_DIR, type Draft, type Post } from "../format";
import { commit, listDir, readFile, type Change, type GitHubEnv } from "./github";
import { putDraft, setScheduled, snapshot, type StoreEnv } from "./store";

export type CmsEnv = GitHubEnv & StoreEnv;

export class PublishError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

/*
 * What's live, from GitHub, cached for a minute at the edge. The list screen
 * refreshes itself while open, and without this every refresh would cost a
 * GitHub call per post. Publishing clears it, so a publish shows at once.
 */
const liveKey = (env: GitHubEnv) => new Request(`https://cms.internal/live/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}`);
const edgeCache = () => (typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null);

export async function livePosts(env: GitHubEnv): Promise<Post[]> {
  const cache = edgeCache();
  const hit = await cache?.match(liveKey(env)).catch(() => undefined);
  if (hit) return (await hit.json()) as Post[];
  const posts = await readLivePosts(env);
  await cache
    ?.put(liveKey(env), new Response(JSON.stringify(posts), { headers: { "Cache-Control": "max-age=60", "Content-Type": "application/json" } }))
    .catch(() => undefined);
  return posts;
}

async function forgetLive(env: GitHubEnv) {
  await edgeCache()?.delete(liveKey(env)).catch(() => undefined);
}

/** Every live post, parsed. Unparseable files are skipped, not fatal. */
async function readLivePosts(env: GitHubEnv): Promise<Post[]> {
  const files = (await listDir(env, CONTENT_DIR)).filter((f) => f.name.endsWith(".md"));
  const posts = await Promise.all(
    files.map(async (f) => {
      const text = await readFile(env, f.path);
      try {
        return text ? parsePost(text) : null;
      } catch {
        return null;
      }
    })
  );
  return posts.filter((p): p is Post => p !== null);
}

/** Who else holds this slug, as a live path or a redirect. */
function slugOwner(posts: Post[], slug: string, self: string): Post | undefined {
  return posts.find((p) => p.id !== self && (p.slug === slug || p.redirectFrom.includes(slug)));
}

function validate(draft: Draft) {
  if (!draft.title.trim()) throw new PublishError("Give it a title first.");
  if (!isValidSlug(draft.slug))
    throw new PublishError("The URL can only use lowercase letters, numbers and single hyphens.");
  // A listed-only note can be just a title; a post with a page needs words on it.
  if (draft.page !== false && !draft.body.trim())
    throw new PublishError("There's nothing in the body yet. Write something, or turn off “Has its own page” to list just the title.");
  if (draft.cover && !draft.cover.alt.trim()) throw new PublishError("The cover image needs alt text.");
}

type Prepared = { draft: Draft; next: Draft; changes: Change[]; summary: string };

/** Everything a publish will do, without doing it: checks, the file, a rename. */
function preparePublish(posts: Post[], draft: Draft, now: string, taken: Set<string>): Prepared {
  validate(draft);
  const owner = slugOwner(posts, draft.slug, draft.id);
  if (owner) throw new PublishError(`“${owner.title}” already uses /writing/${draft.slug}.`, 409);
  if (taken.has(draft.slug)) throw new PublishError(`Two of these posts want /writing/${draft.slug}.`, 409);
  taken.add(draft.slug);

  const renamed = draft.liveSlug !== null && draft.liveSlug !== draft.slug;
  const redirectFrom = renamed
    ? [...new Set([...draft.redirectFrom, draft.liveSlug as string])].filter((s) => s !== draft.slug)
    : draft.redirectFrom.filter((s) => s !== draft.slug);

  const post = draftToPost({ ...draft, redirectFrom }, now);
  const changes: Change[] = [{ path: postPath(post.slug), content: serializePost(post) }];
  if (renamed) changes.push({ path: postPath(draft.liveSlug as string), delete: true });

  const verb = draft.liveSlug === null ? "publish" : renamed ? "move" : "update";
  const summary = verb === "move" ? `writing: move “${post.title}” to /writing/${post.slug}` : `writing: ${verb} “${post.title}”`;
  const next: Draft = {
    ...draft,
    status: "published",
    publishAt: null,
    publishedAt: post.publishedAt,
    liveSlug: post.slug,
    redirectFrom,
    dirty: false,
    updatedAt: now,
  };
  return { draft, next, changes, summary };
}

async function settle(env: CmsEnv, prepared: Prepared[], label: string) {
  for (const p of prepared) {
    await putDraft(env, p.next);
    await setScheduled(env, p.draft.id, null);
    await snapshot(env, p.next, true, label);
  }
}

/** Publish now. Returns the updated draft. */
export async function publish(env: CmsEnv, draft: Draft, label = "Published"): Promise<Draft> {
  const now = new Date().toISOString();
  const prepared = preparePublish(await livePosts(env), draft, now, new Set());
  await commit(env, prepared.summary, prepared.changes);
  await forgetLive(env);
  await settle(env, [prepared], label);
  return prepared.next;
}

/**
 * Publish several at once, as ONE commit, so the site rebuilds once rather
 * than once per post. Posts that can't go out (no title, a taken URL) are
 * reported and left as they were; the rest still publish.
 */
export async function publishMany(env: CmsEnv, drafts: Draft[]): Promise<{ done: Draft[]; failed: { id: string; error: string }[] }> {
  const now = new Date().toISOString();
  const posts = await livePosts(env);
  const taken = new Set<string>();
  const prepared: Prepared[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const d of drafts) {
    try {
      prepared.push(preparePublish(posts, d, now, taken));
    } catch (error) {
      failed.push({ id: d.id, error: error instanceof Error ? error.message : "Couldn't publish" });
    }
  }
  if (prepared.length) {
    const message = prepared.length === 1 ? prepared[0].summary : `writing: publish ${prepared.length} posts\n\n${prepared.map((p) => `- ${p.summary.replace(/^writing: /, "")}`).join("\n")}`;
    await commit(env, message, prepared.flatMap((p) => p.changes));
    await forgetLive(env);
    await settle(env, prepared, "Published");
  }
  return { done: prepared.map((p) => p.next), failed };
}

/** Take several down in one commit; each becomes a draft again. */
export async function unpublishMany(env: CmsEnv, drafts: Draft[]): Promise<Draft[]> {
  const live = drafts.filter((d) => d.liveSlug);
  if (live.length) {
    const existing = new Set((await livePosts(env)).map((p) => p.slug));
    const changes: Change[] = live.filter((d) => existing.has(d.liveSlug!)).map((d) => ({ path: postPath(d.liveSlug!), delete: true }));
    if (changes.length) {
      await commit(env, changes.length === 1 ? `writing: unpublish “${live[0].title.trim()}”` : `writing: unpublish ${changes.length} posts`, changes);
      await forgetLive(env);
    }
  }
  const now = new Date().toISOString();
  const out: Draft[] = [];
  for (const d of drafts) {
    const next: Draft = { ...d, status: "draft", publishAt: null, liveSlug: null, dirty: true, updatedAt: now };
    await putDraft(env, next);
    await setScheduled(env, d.id, null);
    out.push(next);
  }
  return out;
}

export async function schedule(env: CmsEnv, draft: Draft, publishAt: string): Promise<Draft> {
  validate(draft);
  if (draft.liveSlug !== null) throw new PublishError("This post is already live; publish the edit instead.");
  const at = Date.parse(publishAt);
  if (!Number.isFinite(at)) throw new PublishError("That date isn't valid.");
  if (at <= Date.now() + 60_000) throw new PublishError("Pick a time at least a minute from now.");
  const posts = await livePosts(env);
  const owner = slugOwner(posts, draft.slug, draft.id);
  if (owner) throw new PublishError(`“${owner.title}” already uses /writing/${draft.slug}.`, 409);

  const next: Draft = { ...draft, status: "scheduled", publishAt: new Date(at).toISOString(), updatedAt: new Date().toISOString() };
  await putDraft(env, next);
  await setScheduled(env, draft.id, next.publishAt);
  await snapshot(env, next, true, "Scheduled");
  return next;
}

/** Back to a draft. The file leaves git; its old URLs stop resolving. */
export async function unpublish(env: CmsEnv, draft: Draft): Promise<Draft> {
  if (draft.liveSlug) {
    await commit(env, `writing: unpublish “${draft.title.trim()}”`, [{ path: postPath(draft.liveSlug), delete: true }]);
    await forgetLive(env);
  }
  const next: Draft = {
    ...draft,
    status: "draft",
    publishAt: null,
    liveSlug: null,
    dirty: true,
    updatedAt: new Date().toISOString(),
  };
  await putDraft(env, next);
  await setScheduled(env, draft.id, null);
  await snapshot(env, next, true, draft.liveSlug ? "Unpublished" : "Unscheduled");
  return next;
}

/** Remove the live file if there is one; the caller deletes the R2 side. */
export async function removeLive(env: GitHubEnv, draft: Draft | null, post: Post | null): Promise<void> {
  const slug = draft?.liveSlug ?? post?.slug ?? null;
  if (!slug) return;
  const title = draft?.title ?? post?.title ?? slug;
  // Only if it's really there: deleting a missing path fails the whole commit.
  if ((await readFile(env, postPath(slug))) === null) return;
  await commit(env, `writing: delete “${title.trim()}”`, [{ path: postPath(slug), delete: true }]);
  await forgetLive(env);
}
