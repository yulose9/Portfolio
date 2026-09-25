import { SITE_INFO } from "../../../constants/seo";
import { publishedPosts } from "../../../lib/writing";

/*
 * /writing/index.md — the Writing hub as Markdown: every published post,
 * newest first, each linked to its page and to its own Markdown. Agents that
 * ask /writing for text/markdown get this (functions/writing/index.ts).
 */
export const dynamic = "force-static";

export function GET() {
  const site = SITE_INFO.url;
  const posts = publishedPosts();
  const lines = [
    `# Writing, by ${SITE_INFO.name}`,
    "",
    "> Some technical, some personal: notes on building AI systems and the infrastructure under them, and on whatever else I'm working out.",
    "",
    ...(posts.length
      ? posts.map((p) => {
          const date = p.publishedAt.slice(0, 10);
          const tags = p.tags.length ? ` Tags: ${p.tags.join(", ")}.` : "";
          return p.page
            ? `- [${p.title}](${site}/writing/${p.slug}) (${date}, [Markdown](${site}/writing/${p.slug}/index.md))${p.dek ? `: ${p.dek}` : ""}${tags}`
            : `- ${p.title} (${date}, a note without its own page)${tags}`;
        })
      : ["Nothing published yet."]),
    "",
    `Feed: ${site}/feed.xml`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
