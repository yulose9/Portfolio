import { SITE_INFO } from "../constants/seo";
import { formatLongDate, pagedPosts } from "../lib/writing";

/*
 * /llms-full.txt — every post with a page, in full, as the Markdown it was
 * written in. For assistants that would rather read one file than crawl.
 */
export const dynamic = "force-static";

export function GET() {
  const posts = pagedPosts();
  const parts = [
    `# ${SITE_INFO.name} · Writing`,
    "",
    `> ${SITE_INFO.identity}`,
    "",
    ...(posts.length
      ? posts.flatMap((p) => [
          "---",
          "",
          `# ${p.title}`,
          "",
          `URL: ${SITE_INFO.url}/writing/${p.slug}`,
          `Published: ${formatLongDate(p.publishedAt)}${p.updatedAt !== p.publishedAt ? ` · Updated: ${formatLongDate(p.updatedAt)}` : ""}`,
          `By: ${p.authors.map((a) => a.name).join(", ")}`,
          ...(p.dek ? ["", `> ${p.dek}`] : []),
          "",
          p.body.trim(),
          "",
        ])
      : ["Nothing published yet.", ""]),
  ];
  return new Response(parts.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
