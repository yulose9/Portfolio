import type { MetadataRoute } from "next";

import { publishedPosts } from "./lib/writing";

// `output: "export"` has no request-time rendering, so the route must declare
// itself static or `next build` refuses to collect it.
export const dynamic = "force-static";

// robots.txt advertises this sitemap, so it has to actually exist.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://nazarene.dev",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...publishedPosts().map((post) => ({
      url: `https://nazarene.dev/writing/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
