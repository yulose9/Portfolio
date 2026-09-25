/**
 * Just enough of the GitHub API to publish: read a file, list a folder, and
 * commit several changes as one commit.
 *
 * One commit per publish matters for renames. A renamed post is a delete and a
 * create; done as two contents-API calls it is two commits and two Pages
 * builds, the first of which ships a site with the post missing. The Git Data
 * API (tree → commit → move the branch) makes it one.
 */

export type GitHubEnv = {
  GITHUB_TOKEN: string;
  /** "owner/repo" */
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  /** Only for local testing against a stand-in; defaults to GitHub itself. */
  GITHUB_API?: string;
};

export type Change = { path: string; content: string } | { path: string; delete: true };


async function gh<T>(env: GitHubEnv, path: string, init: RequestInit = {}): Promise<T> {
  const api = env.GITHUB_API ?? "https://api.github.com";
  const res = await fetch(`${api}/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "nazarene-dev-admin",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GitHubError(res.status, `GitHub ${init.method ?? "GET"} ${path} → ${res.status} ${detail.slice(0, 300)}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** UTF-8 safe: atob alone mangles anything outside Latin-1 (em dashes, curly quotes). */
function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** The file's text on the branch, or null if it isn't there. */
export async function readFile(env: GitHubEnv, path: string): Promise<string | null> {
  try {
    const file = await gh<{ content: string }>(
      env,
      `/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`
    );
    return decodeBase64(file.content);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}

/** File names in a folder; an absent folder is an empty one. */
export async function listDir(env: GitHubEnv, path: string): Promise<{ name: string; path: string }[]> {
  try {
    const entries = await gh<{ name: string; path: string; type: string }[]>(
      env,
      `/contents/${encodeURI(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`
    );
    return entries.filter((e) => e.type === "file");
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

/**
 * Commit `changes` on top of the branch head and move the branch to it.
 *
 * If something else lands on the branch in between (a push from the laptop),
 * moving the ref is refused as a non-fast-forward; the whole thing is redone
 * on the new head, which is safe because each change names a whole file.
 */
export async function commit(env: GitHubEnv, message: string, changes: Change[]): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(env, `/git/ref/heads/${env.GITHUB_BRANCH}`);
    const head = ref.object.sha;
    const headCommit = await gh<{ tree: { sha: string } }>(env, `/git/commits/${head}`);

    const tree = await gh<{ sha: string }>(env, "/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: changes.map((c) =>
          "delete" in c
            ? { path: c.path, mode: "100644", type: "blob", sha: null }
            : { path: c.path, mode: "100644", type: "blob", content: c.content }
        ),
      }),
    });

    const created = await gh<{ sha: string }>(env, "/git/commits", {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
    });

    try {
      await gh(env, `/git/refs/heads/${env.GITHUB_BRANCH}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: created.sha, force: false }),
      });
      return created.sha;
    } catch (error) {
      if (attempt < 2 && error instanceof GitHubError && error.status === 422) continue;
      throw error;
    }
  }
}
