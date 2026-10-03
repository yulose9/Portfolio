/*
 * Embeds: a post on X, Threads or Facebook, or a YouTube video, pasted as a
 * link on a line of its own. The Markdown stays a plain URL — portable,
 * readable on GitHub, harmless in a feed reader — and the site and the editor
 * both turn it into the real thing.
 */

export type FacebookFormat = "post" | "video" | "reel";

export type Embed =
  | { kind: "x"; id: string; url: string }
  /** `user` is missing for a /t/<code> short link, which doesn't carry it. */
  | { kind: "threads"; user?: string; code: string; url: string }
  /** `page` is the page or profile name when the link carries one. */
  | { kind: "facebook"; format: FacebookFormat; page?: string; url: string }
  | { kind: "youtube"; id: string; url: string };

export type ThreadsEmbed = Extract<Embed, { kind: "threads" }>;
export type FacebookEmbed = Extract<Embed, { kind: "facebook" }>;

const THREADS_USER = /^[\w.]{1,40}$/;
const THREADS_CODE = /^[\w-]{5,40}$/;
const FB_ID = /^[\w-]{1,80}$/;
const FB_PAGE = /^[\w.-]{1,80}$/;
/** First path segments that are Facebook's own routes, never a page's name. */
const FB_ROUTES = new Set([
  "share", "watch", "reel", "reels", "photo", "photo.php", "permalink.php", "story.php", "groups", "events",
  "profile.php", "plugins", "login", "marketplace", "gaming", "help", "videos", "posts", "photos", "hashtag",
]);

function parseFacebook(host: string, url: URL, parts: string[]): FacebookEmbed | null {
  const fb = "https://www.facebook.com";
  const id = (s: string | null | undefined) => (s && FB_ID.test(s) ? s : null);

  if (host === "fb.watch") {
    const code = id(parts[0]);
    return code ? { kind: "facebook", format: "video", url: `https://fb.watch/${code}/` } : null;
  }
  if (host !== "facebook.com" && host !== "fb.com") return null;
  const [first, second, third] = parts;

  // /share/p/<code>, /share/v/<code>, /share/r/<code>, or /share/<code>
  if (first === "share") {
    const kinds: Record<string, FacebookFormat> = { p: "post", v: "video", r: "reel" };
    const format = second ? kinds[second] : undefined;
    const code = id(format ? third : second);
    if (!code) return null;
    return { kind: "facebook", format: format ?? "post", url: `${fb}/share/${format ? `${second}/` : ""}${code}/` };
  }
  // /permalink.php?story_fbid=..&id=.. and /story.php, the same thing
  if (first === "permalink.php" || first === "story.php") {
    const story = id(url.searchParams.get("story_fbid"));
    const owner = id(url.searchParams.get("id"));
    if (!story || !owner) return null;
    return { kind: "facebook", format: "post", url: `${fb}/permalink.php?story_fbid=${story}&id=${owner}` };
  }
  // /photo?fbid=.. and /photo.php?fbid=..
  if (first === "photo" || first === "photo.php") {
    const fbid = id(url.searchParams.get("fbid"));
    return fbid ? { kind: "facebook", format: "post", url: `${fb}/photo/?fbid=${fbid}` } : null;
  }
  // /watch?v=<id> and /watch/?v=<id>
  if (first === "watch") {
    const v = id(url.searchParams.get("v"));
    return v ? { kind: "facebook", format: "video", url: `${fb}/watch/?v=${v}` } : null;
  }
  // /reel/<id>
  if (first === "reel" || first === "reels") {
    const reel = id(second);
    return reel ? { kind: "facebook", format: "reel", url: `${fb}/reel/${reel}` } : null;
  }
  // /<page>/posts/<id>, /<page>/videos/<id> (or /videos/<title>/<id>), /<page>/photos/<album>/<id>
  if (first && FB_PAGE.test(first) && !FB_ROUTES.has(first)) {
    const last = id(parts[parts.length - 1]);
    if (second === "posts" && parts.length === 3 && last) {
      return { kind: "facebook", format: "post", page: first, url: `${fb}/${first}/posts/${last}` };
    }
    if (second === "videos" && parts.length >= 3 && parts.length <= 4 && last) {
      return { kind: "facebook", format: "video", page: first, url: `${fb}/${first}/videos/${last}` };
    }
    if (second === "photos" && parts.length >= 3 && parts.length <= 4 && last) {
      return { kind: "facebook", format: "post", page: first, url: `${fb}/${parts.join("/")}` };
    }
  }
  return null;
}

export function parseEmbed(raw: string): Embed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|mobile|m|web)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "x.com" || host === "twitter.com") {
    // /<user>/status/<id>
    const i = parts.indexOf("status");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d{1,25}$/.test(id)) return { kind: "x", id, url: `https://x.com/${parts[0]}/status/${id}` };
  }
  if (host === "threads.net" || host === "threads.com") {
    // /@<user>/post/<code>, or the short /t/<code>
    if (parts[0] === "t" && parts[1] && THREADS_CODE.test(parts[1])) {
      return { kind: "threads", code: parts[1], url: `https://www.threads.com/t/${parts[1]}` };
    }
    const user = parts[0]?.startsWith("@") ? parts[0].slice(1) : undefined;
    const code = parts[1] === "post" ? parts[2] : undefined;
    if (user && code && THREADS_USER.test(user) && THREADS_CODE.test(code)) {
      return { kind: "threads", user, code, url: `https://www.threads.com/@${user}/post/${code}` };
    }
  }
  const facebook = parseFacebook(host, url, parts);
  if (facebook) return facebook;
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

/**
 * Threads' own embed page. `theme` "dark" or "auto" gives it a transparent
 * background and light text, the way Threads' embed.js asks for it.
 */
export const threadsFrame = (e: ThreadsEmbed, theme: "light" | "dark" | "auto" = "light") =>
  `${e.url}/embed${theme === "light" ? "" : `?theme=${theme}`}`;

/**
 * Facebook's Embedded Post or Embedded Video plugin. It has no dark mode and
 * doesn't report its height without the SDK, so the frame around it sets the
 * size: `width` is the plugin's layout width, 350–750 by Facebook's rules.
 */
export function facebookFrame(e: FacebookEmbed, width: number): string {
  const w = Math.round(Math.min(750, Math.max(220, width)));
  const params = new URLSearchParams({ href: e.url, width: String(w) });
  if (e.format === "post") {
    params.set("show_text", "true");
    return `https://www.facebook.com/plugins/post.php?${params}`;
  }
  params.set("show_text", "false");
  if (e.format === "reel") params.set("height", String(Math.round((w * 16) / 9)));
  return `https://www.facebook.com/plugins/video.php?${params}`;
}

/** Who posted it, as far as the link alone says. */
export function embedAuthor(e: ThreadsEmbed | FacebookEmbed): string | undefined {
  return e.kind === "threads" ? e.user : e.page;
}

const unescapeHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([\da-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();

/**
 * The author's handle and the post's text, from Threads' server-rendered
 * embed page (its oEmbed carries neither). Null when the markup isn't there.
 */
export function parseThreadsEmbedPage(html: string): { handle?: string; text?: string } | null {
  const handle = unescapeHtml(/class="AuthorIdentity"[\s\S]*?<span>([\s\S]*?)<\/span>/.exec(html)?.[1] ?? "");
  const text = unescapeHtml(/class="BodyTextContainer">([\s\S]*?)<\/span><\/span>/.exec(html)?.[1] ?? "");
  const meta = {
    ...(THREADS_USER.test(handle) ? { handle } : {}),
    ...(text ? { text: text.length > 600 ? `${text.slice(0, 599)}…` : text } : {}),
  };
  return Object.keys(meta).length ? meta : null;
}

export const youtubeFrame =(e: Extract<Embed, { kind: "youtube" }>) =>
  `https://www.youtube-nocookie.com/embed/${e.id}?rel=0`;
