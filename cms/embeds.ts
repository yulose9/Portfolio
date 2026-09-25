/*
 * Embeds: a post on X or Threads, or a YouTube video, pasted as a link on a
 * line of its own. The Markdown stays a plain URL — portable, readable on
 * GitHub, harmless in a feed reader — and the site and the editor both turn it
 * into the real thing.
 */

export type Embed =
  | { kind: "x"; id: string; url: string }
  | { kind: "threads"; user: string; code: string; url: string }
  | { kind: "youtube"; id: string; url: string };

export function parseEmbed(raw: string): Embed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|mobile|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "x.com" || host === "twitter.com") {
    // /<user>/status/<id>
    const i = parts.indexOf("status");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d{1,25}$/.test(id)) return { kind: "x", id, url: `https://x.com/${parts[0]}/status/${id}` };
  }
  if (host === "threads.net" || host === "threads.com") {
    // /@<user>/post/<code>
    const user = parts[0]?.startsWith("@") ? parts[0].slice(1) : undefined;
    const code = parts[1] === "post" ? parts[2] : undefined;
    if (user && code && /^[\w.]{1,40}$/.test(user) && /^[\w-]{5,40}$/.test(code)) {
      return { kind: "threads", user, code, url: `https://www.threads.com/@${user}/post/${code}` };
    }
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? parts[0]
        : parts[0] === "watch"
          ? url.searchParams.get("v")
          : parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live"
            ? parts[1]
            : null;
    if (id && /^[\w-]{11}$/.test(id)) return { kind: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` };
  }
  return null;
}

export const threadsFrame = (e: Extract<Embed, { kind: "threads" }>) =>
  `https://www.threads.com/@${e.user}/post/${e.code}/embed`;

export const youtubeFrame = (e: Extract<Embed, { kind: "youtube" }>) =>
  `https://www.youtube-nocookie.com/embed/${e.id}?rel=0`;
