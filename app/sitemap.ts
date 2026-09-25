import type { MetadataRoute } from "next";

import { SITE_INFO } from "./constants/seo";
import { buildTimeCommit } from "./last-commit";
import { pagedPosts } from "./lib/writing";

// `output: "export"` has no request-time rendering, so the route must declare
// itself static or `next build` refuses to collect it.
export const dynamic = "force-static";

/*
 * Real dates only. A lastModified of "now" on every build tells engines the
 * page changes daily when it doesn't, and they learn to ignore the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const commit = await buildTimeCommit();
  const posts = pagedPosts();
  const siteDate = commit ? new Date(commit.date) : undefined;
  const newest = posts[0] ? new Date(posts.reduce((a, p) => (p.updatedAt > a ? p.updatedAt : a), posts[0].updatedAt)) : siteDate;
  return [
    { url: SITE_INFO.url, lastModified: siteDate, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_INFO.url}/writing`, lastModified: newest, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${SITE_INFO.url}/writing/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
