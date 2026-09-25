import { SITE_INFO } from "../constants/seo";
import { pagedPosts, renderMarkdown } from "../lib/writing";
import { PROFILE } from "../site-content";

/** RSS for the writing: /feed.xml, full text, built with the site. */
export const dynamic = "force-static";

const SITE = SITE_INFO.url;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = pagedPosts().slice(0, 30);
  const items = await Promise.all(
    posts.map(async (post) => {
      const url = `${SITE}/writing/${post.slug}`;
      // Relative image paths mean nothing inside a feed reader.
      const html = (await renderMarkdown(post.body)).replace(/(src|href)="\//g, `$1="${SITE}/`);
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${post.id}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${escape(post.authors.map((a) => a.name).join(", "))}</dc:creator>
      ${post.dek ? `<description>${escape(post.dek)}</description>` : ""}
      ${post.tags.map((t) => `<category>${escape(t)}</category>`).join("")}
      <content:encoded><![CDATA[${html.replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>
    </item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escape(PROFILE.name)} · Writing</title>
    <link>${SITE}/writing</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Writing by ${escape(PROFILE.name)}.</description>
    <language>en</language>
    <lastBuildDate>${new Date(posts[0]?.updatedAt ?? Date.now()).toUTCString()}</lastBuildDate>
    <image>
      <url>${SITE}/icon-512.png</url>
      <title>${escape(PROFILE.name)} · Writing</title>
      <link>${SITE}/writing</link>
    </image>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
