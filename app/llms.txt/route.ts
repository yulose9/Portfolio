import { SITE_INFO, SOCIAL_LINKS } from "../constants/seo";
import { publishedPosts } from "../lib/writing";
import { TABS } from "../site-content";

/*
 * /llms.txt — the site, summarised for language models (llmstxt.org): who
 * this is, what's here, and where to read more, in plain Markdown. Built with
 * the site, so it lists exactly what's published.
 */
export const dynamic = "force-static";

export function GET() {
  const site = SITE_INFO.url;
  const work = TABS.find((t) => t.id === "work")?.items ?? [];
  const certs = TABS.find((t) => t.id === "certificates")?.items ?? [];
  const resume = TABS.find((t) => t.id === "about")?.links?.find((l) => l.label === "Resume")?.href;
  const posts = publishedPosts();

  const lines = [
    `# ${SITE_INFO.name}`,
    "",
    `> ${SITE_INFO.identity}`,
    "",
    "## About",
    `- [Home](${site}/): role, experience, projects, certifications and contact`,
    ...(resume ? [`- [Résumé (PDF)](${resume})`] : []),
    "",
    "## Experience",
    ...work.map((w) => `- ${w.title}${w.company ? `, ${w.company}` : ""}${w.year ? ` (${w.year})` : ""}`),
    "",
    "## Certifications",
    ...certs.map((c) => `- ${c.href ? `[${c.title}](${c.href})` : c.title}${c.company ? `, ${c.company}` : ""}${c.year ? ` (${c.year})` : ""}`),
    "",
    "## Writing",
    ...(posts.length
      ? posts.map((p) =>
          p.page
            ? `- [${p.title}](${site}/writing/${p.slug})${p.dek ? `: ${p.dek}` : ""}`
            : `- ${p.title} (${p.publishedAt.slice(0, 10)}, note without a page)`
        )
      : ["- Nothing published yet."]),
    "",
    "## Profiles",
    `- [GitHub](${SOCIAL_LINKS.github})`,
    `- [LinkedIn](${SOCIAL_LINKS.linkedin})`,
    `- [X](${SOCIAL_LINKS.x})`,
    `- Email: ${SOCIAL_LINKS.email}`,
    "",
    "## Optional",
    `- [Full text of every post](${site}/llms-full.txt)`,
    `- [RSS feed](${site}/feed.xml)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
