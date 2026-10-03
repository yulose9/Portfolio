import type { MetadataRoute } from "next";

import { tagSlug } from "../cms/format";
import { SITE_INFO } from "./constants/seo";
import { buildTimeCommit } from "./last-commit";
import { postImages } from "./lib/seo";
import { pagedPosts, publishedPosts } from "./lib/writing";
import { publishedProjects } from "./lib/projects";

// `output: "export"` has no request-time rendering, so the route must declare
// itself static or `next build` refuses to collect it.
export const dynamic = "force-static";

/** The latest of a set of ISO dates, as a Date; undefined for none. */
const newest = (dates: string[]) => (dates.length ? new Date(dates.reduce((a, d) => (d > a ? d : a))) : undefined);

/*
 * Real dates only. A lastModified of "now" on every build tells engines the
 * page changes daily when it doesn't, and they learn to ignore the field.
 *
 * Built from content/writing on every deploy (and a publish is a deploy), so
 * a new post, its tags and its images are listed with nothing to do by hand.
 * Drafts never reach content/, future-dated posts and listed-only notes are
 * filtered out by pagedPosts(), and /admin is never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const commit = await buildTimeCommit();
  const posts = pagedPosts();
  const projects = publishedProjects();
  const siteDate = commit ? new Date(commit.date) : undefined;

  // One page per tag, dated by the newest change to anything filed under it.
  const tags = new Map<string, string[]>();
  for (const p of publishedPosts()) for (const t of p.tags) tags.set(tagSlug(t), [...(tags.get(tagSlug(t)) ?? []), p.updatedAt]);

  return [
    { url: SITE_INFO.url, lastModified: siteDate, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_INFO.url}/writing`, lastModified: newest(posts.map((p) => p.updatedAt)) ?? siteDate, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => {
      const images = postImages(post);
      return {
        url: `${SITE_INFO.url}/writing/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        ...(images.length ? { images } : {}),
      };
    }),
    ...[...tags].map(([slug, dates]) => ({
      url: `${SITE_INFO.url}/writing/tag/${slug}`,
      lastModified: newest(dates),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_INFO.url}/projects`, lastModified: newest(projects.map((p) => p.updatedAt)) ?? siteDate, changeFrequency: "monthly", priority: 0.8 },
    ...projects.map(project => ({ url: `${SITE_INFO.url}/projects/${project.slug}`, lastModified: new Date(project.updatedAt), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
