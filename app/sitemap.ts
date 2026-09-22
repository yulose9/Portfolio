import type { MetadataRoute } from "next";

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
  ];
}
