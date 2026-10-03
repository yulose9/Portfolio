import { getTweet } from "react-tweet/api";

import { fail, json, type AdminFunction } from "../../../cms/server/http";
import { parseEmbed, parseThreadsEmbedPage, threadsFrame, type ThreadsEmbed } from "../../../cms/embeds";

/*
 * What the editor needs to preview an embed. For a post on X, the tweet's
 * data from X's public syndication endpoint (the same one react-tweet uses
 * when the site builds), so the card in the editor is the card readers get.
 * For a Threads post, the author and text (below). Facebook and YouTube
 * preview as their own iframes and need nothing here.
 *
 * X refuses the syndication endpoint from some networks, Cloudflare's among
 * them at times. When it does, X's oEmbed endpoint still answers with the
 * author and the text, which is enough for the editor to show a faithful
 * card instead of "not found". The site build fetches again on its own.
 */

type Card = { author: string; handle: string; text: string; url: string };

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .trim();

async function oembedCard(url: string): Promise<Card | null> {
  const res = await fetch(`https://publish.x.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(url)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { author_name?: string; author_url?: string; html?: string };
  // The post's text is the blockquote's first paragraph.
  const text = decode(/<p[^>]*>([\s\S]*?)<\/p>/.exec(data.html ?? "")?.[1] ?? "");
  const handle = (data.author_url ?? "").split("/").filter(Boolean).pop() ?? "";
  return text || data.author_name ? { author: data.author_name ?? handle, handle, text, url } : null;
}

/*
 * Threads. Its oEmbed endpoint (graph.threads.net/v1.0/oembed) answers
 * without a token now, but only with a "View on Threads" blockquote: no
 * author, no text. The post's own embed page is server-rendered and carries
 * both, so the editor reads them from there. Best effort: if Threads changes
 * its markup, the card falls back to the handle in the link.
 */
async function threadsMeta(embed: ThreadsEmbed) {
  const res = await fetch(threadsFrame(embed), {
    headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; embed preview)" },
  });
  return res.ok ? parseThreadsEmbedPage(await res.text()) : null;
}

export const onRequestGet: AdminFunction = async ({ request }) => {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const embed = parseEmbed(url);
  if (!embed) return fail("That link isn't something that can be embedded.");
  if (embed.kind === "threads") {
    const meta = await threadsMeta(embed).catch(() => null);
    return json(meta ? { embed, meta } : { embed });
  }
  // Facebook's oEmbed needs an app token; its card works from the link alone.
  if (embed.kind !== "x") return json({ embed });
  try {
    const tweet = await getTweet(embed.id);
    if (tweet) return json({ embed, tweet });
  } catch {
    // Fall through to oEmbed.
  }
  try {
    const card = await oembedCard(embed.url);
    if (card) return json({ embed, card });
  } catch {
    // Fall through.
  }
  return fail("X didn't share this post's details here. It may be private or deleted; if it's public, the site will still show it.", 502);
};
