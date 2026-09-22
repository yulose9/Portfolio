import { execSync } from "node:child_process";

export type Commit = {
  /** Short SHA, for linking to the commit. */
  sha: string;
  /** ISO 8601 commit date. */
  date: string;
};

/**
 * The commit this build was produced from, read at build time.
 *
 * Server-only: it runs during `next build` (or during a dev render), never in
 * the browser. Its value is what lets the footer render a real date on first
 * paint instead of a placeholder that fills in after a fetch.
 *
 * Returns null rather than throwing when git is unavailable — a deploy from a
 * tarball or a shallow checkout without history should degrade to hiding the
 * stamp, not fail the build.
 */
export function buildTimeCommit(): Commit | null {
  try {
    const raw = execSync("git log -1 --format=%h%n%cI", {
      encoding: "utf8",
      // Swallow git's stderr; a missing repo is an expected outcome here.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const [sha, date] = raw.split("\n");
    return sha && date ? { sha, date } : null;
  } catch {
    return null;
  }
}
