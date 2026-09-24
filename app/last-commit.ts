import { execSync } from "node:child_process";

const REPO = "yulose9/Portfolio";

export type Commit = {
  /** Short SHA, for linking to the commit. */
  sha: string;
  /** ISO 8601 commit date. */
  date: string;
  /** First line of the commit message, for the hover card. */
  subject?: string;
};

/**
 * The commit this build was produced from.
 *
 * Server-only: it runs during `next build`, never in the browser.
 *
 * Two sources, tried in order, because the first one has a real failure mode.
 * Reading local git assumes the build container has `git` on PATH and a `.git`
 * directory to read — true for a Cloudflare Pages clone, but not for a build
 * from a tarball, a Docker context that excluded `.git`, or a CI step that
 * copies the tree rather than cloning it. In any of those the stamp would have
 * silently disappeared, so the GitHub API backs it up.
 *
 * Returning null is the last resort, and the component renders nothing rather
 * than showing a wrong date.
 */
export async function buildTimeCommit(): Promise<Commit | null> {
  return fromLocalGit() ?? (await fromGitHub());
}

function fromLocalGit(): Commit | null {
  try {
    const raw = execSync("git log -1 --format=%h%n%cI%n%s", {
      encoding: "utf8",
      // Swallow git's stderr; a missing repo is an expected outcome here.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const [sha, date, subject] = raw.split("\n");
    return sha && date ? { sha, date, subject } : null;
  } catch {
    return null;
  }
}

async function fromGitHub(): Promise<Commit | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits?per_page=1`,
      {
        headers: { Accept: "application/vnd.github+json" },
        // Build-time only, so there is nothing to revalidate against.
        cache: "no-store",
      }
    );
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const head = Array.isArray(data) ? data[0] : null;
    const sha: unknown = head?.sha;
    const date: unknown = head?.commit?.committer?.date;
    const message: unknown = head?.commit?.message;

    return typeof sha === "string" && typeof date === "string"
      ? {
          sha: sha.slice(0, 7),
          date,
          subject: typeof message === "string" ? message.split("\n")[0] : undefined,
        }
      : null;
  } catch {
    // Offline or rate-limited at build time. The client-side refresh in
    // LastUpdated still has a chance to fill this in for real visitors.
    return null;
  }
}
