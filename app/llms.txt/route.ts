import { tagSlug } from "../../cms/format";
import { SITE_INFO, SOCIAL_LINKS } from "../constants/seo";
import { publishedProjects } from "../lib/projects";
import { clip, postDescription } from "../lib/seo";
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
  const projects = publishedProjects().filter((p) => !p.parentId);
  const day = (iso: string) => iso.slice(0, 10);
  // Every topic written about, most-used first: the tag pages are the hubs.
  const tagCount = new Map<string, { name: string; n: number }>();
  for (const p of posts) for (const t of p.tags) tagCount.set(tagSlug(t), { name: t, n: (tagCount.get(tagSlug(t))?.n ?? 0) + 1 });

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
    `All posts: [${site}/writing](${site}/writing). Each post is also available as Markdown at its URL + \`/index.md\`.`,
    "",
    ...(posts.length
      ? posts.map((p) =>
          p.page
            ? `- [${p.title}](${site}/writing/${p.slug}): ${clip(postDescription(p), 200)} (published ${day(p.publishedAt)}${day(p.updatedAt) !== day(p.publishedAt) ? `, updated ${day(p.updatedAt)}` : ""}${p.tags.length ? `; topics: ${p.tags.join(", ")}` : ""})`
            : `- ${p.title} (${day(p.publishedAt)}, note without a page)`
        )
      : ["- Nothing published yet."]),
    "",
    ...(tagCount.size
      ? [
          "## Topics",
          ...[...tagCount]
            .sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name))
            .map(([slug, { name, n }]) => `- [${name}](${site}/writing/tag/${slug}): ${n} ${n === 1 ? "post" : "posts"}`),
          "",
        ]
      : []),
    ...(projects.length
      ? [
          "## Projects",
          `All projects: [${site}/projects](${site}/projects)`,
          "",
          ...projects.map((p) => `- [${p.title}](${site}/projects/${p.slug})${p.dek ? `: ${clip(p.dek, 200)}` : ""}`),
          "",
        ]
      : []),
    "## Profiles",
    `- [GitHub](${SOCIAL_LINKS.github})`,
    `- [LinkedIn](${SOCIAL_LINKS.linkedin})`,
    `- [X](${SOCIAL_LINKS.x})`,
    `- Email: ${SOCIAL_LINKS.email}`,
    "",
    "## Optional",
    `- [Full text of every post](${site}/llms-full.txt)`,
    `- [RSS feed](${site}/feed.xml)`,
    `- [Sitemap](${site}/sitemap.xml)`,
    `- [Writing index as Markdown](${site}/writing/index.md)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
