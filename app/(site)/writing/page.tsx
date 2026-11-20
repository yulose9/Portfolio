import { SITE_SOCIAL_CARDS, pageSocialMetadata } from "../../lib/site-social";
import type { Metadata } from "next";
import Link from "next/link";

import WritingMenu from "../../components/writing/WritingMenu";
import WritingFront from "../../components/writing/WritingFront";
import "../../writing-index.css";
import { FEED, ID, jsonLd, PERSON, SITE_INFO } from "../../constants/seo";
import { publishedPosts } from "../../lib/writing";

/*
 * /writing — every post in one place: the hub the articles' breadcrumbs, the
 * feed and the sitemap point to. The page itself is WritingFront; this file
 * reads the posts and adds the metadata and structured data.
 */

const description = SITE_SOCIAL_CARDS.writing.description;

export const metadata: Metadata = {
  title: "Writing",
  description,
  alternates: { canonical: "/writing", types: { ...FEED, "text/markdown": [{ url: "/writing/index.md", title: "Markdown" }] } },
  ...pageSocialMetadata(SITE_SOCIAL_CARDS.writing, "/writing"),
};


export default function WritingIndex() {
  const posts = publishedPosts();

  const paged = posts.filter((p) => p.page);
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_INFO.url}/writing`,
        url: `${SITE_INFO.url}/writing`,
        name: `Writing · ${SITE_INFO.name}`,
        description,
        inLanguage: "en",
        isPartOf: { "@id": ID.website },
        about: { "@id": `${SITE_INFO.url}/writing#blog` },
        breadcrumb: { "@id": `${SITE_INFO.url}/writing#breadcrumb` },
        ...(paged[0] ? { dateModified: paged.reduce((a, p) => (p.updatedAt > a ? p.updatedAt : a), paged[0].updatedAt) } : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: paged.length,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          itemListElement: paged.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_INFO.url}/writing/${p.slug}`, name: p.title })),
        },
      },
      {
        "@type": "Blog",
        "@id": `${SITE_INFO.url}/writing#blog`,
        name: `${SITE_INFO.name} · Writing`,
        url: `${SITE_INFO.url}/writing`,
        description,
        inLanguage: "en",
        author: { "@id": ID.person },
        publisher: { "@id": ID.person },
        isPartOf: { "@id": ID.website },
        blogPost: paged
          .map((p) => ({
            "@type": "BlogPosting",
            "@id": `${SITE_INFO.url}/writing/${p.slug}#article`,
            headline: p.title,
            url: `${SITE_INFO.url}/writing/${p.slug}`,
            datePublished: p.publishedAt,
            dateModified: p.updatedAt,
            author: { "@id": ID.person },
          })),
      },
      PERSON,
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_INFO.url}/writing#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
        ],
      },
    ],
  };

  return (
    <WritingMenu>
    <div className="flex w-full justify-center bg-[color:var(--paper)]">
      <main id="main" tabIndex={-1} data-cursor-frame className="page-shell article-shell writing-index wi w-full pt-12 pb-16 sm:pt-16 sm:pb-24">
        <nav className="article-nav" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">Writing</li>
          </ol>
        </nav>

        <WritingFront posts={posts} />

        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
      </main>
    </div>
    </WritingMenu>
  );
}
