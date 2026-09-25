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

/** Every live post, parsed. Unparseable files are skipped, not fatal. */
export async function livePosts(env: GitHubEnv): Promise<Post[]> {
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
  if (!draft.body.trim()) throw new PublishError("There's nothing in the body yet.");
  if (draft.cover && !draft.cover.alt.trim()) throw new PublishError("The cover image needs alt text.");
}

/** Publish now. Returns the updated draft. */
export async function publish(env: CmsEnv, draft: Draft, label = "Published"): Promise<Draft> {
  validate(draft);
  const posts = await livePosts(env);
  const owner = slugOwner(posts, draft.slug, draft.id);
  if (owner) throw new PublishError(`“${owner.title}” already uses /writing/${draft.slug}.`, 409);

  const now = new Date().toISOString();
  const renamed = draft.liveSlug !== null && draft.liveSlug !== draft.slug;
  const redirectFrom = renamed
    ? [...new Set([...draft.redirectFrom, draft.liveSlug as string])].filter((s) => s !== draft.slug)
    : draft.redirectFrom.filter((s) => s !== draft.slug);

  const post = draftToPost({ ...draft, redirectFrom }, now);
  const changes: Change[] = [{ path: postPath(post.slug), content: serializePost(post) }];
  if (renamed) changes.push({ path: postPath(draft.liveSlug as string), delete: true });

  const verb = draft.liveSlug === null ? "publish" : renamed ? "move" : "update";
  const summary =
    verb === "move" ? `writing: move “${post.title}” to /writing/${post.slug}` : `writing: ${verb} “${post.title}”`;
  await commit(env, summary, changes);

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
  await putDraft(env, next);
  await setScheduled(env, draft.id, null);
  await snapshot(env, next, true, label);
  return next;
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
}
