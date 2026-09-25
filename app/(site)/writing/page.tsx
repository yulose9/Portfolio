import type { Metadata } from "next";
import Link from "next/link";

import FluentText from "../../components/writing/FluentText";
import { FEED, ID, jsonLd, OG_METADATA, SITE_INFO } from "../../constants/seo";
import { formatLongDate, publishedPosts } from "../../lib/writing";

/*
 * /writing — every post in one place: the hub the articles' breadcrumbs, the
 * feed and the sitemap point to. Newest first, grouped by year, the same rows
 * as the home page's Writing tab. A listed-only note is its title and date,
 * not a link.
 */

const description = `Writing by ${SITE_INFO.name} on agentic systems, AI infrastructure and the engineering that keeps them dependable.`;

export const metadata: Metadata = {
  title: "Writing",
  description,
  alternates: { canonical: "/writing", types: FEED },
  openGraph: { ...OG_METADATA, title: `Writing · ${SITE_INFO.name}`, description, url: `${SITE_INFO.url}/writing` },
};

const monthDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", day: "2-digit", month: "2-digit" });
const yearOf = (iso: string) => new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date(iso));

export default function WritingIndex() {
  const posts = publishedPosts();
  const years = new Map<string, typeof posts>();
  for (const p of posts) years.set(yearOf(p.publishedAt), [...(years.get(yearOf(p.publishedAt)) ?? []), p]);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
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
        blogPost: posts
          .filter((p) => p.page)
          .map((p) => ({
            "@type": "BlogPosting",
            "@id": `${SITE_INFO.url}/writing/${p.slug}#article`,
            headline: p.title,
            url: `${SITE_INFO.url}/writing/${p.slug}`,
            datePublished: p.publishedAt,
            dateModified: p.updatedAt,
          })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
        ],
      },
    ],
  };

  return (
    <div className="flex w-full justify-center bg-white">
      <main data-cursor-frame className="page-shell page-enter article-shell article-page writing-index w-full max-w-[672px] py-16 sm:py-24">
        <nav className="article-nav" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">Writing</li>
          </ol>
        </nav>

        <header className="article-header">
          <h1 className="article-title">Writing</h1>
          <p className="article-dek">Notes on agentic systems, AI infrastructure and the unglamorous engineering that keeps them dependable.</p>
          <p className="writing-index-meta">
            <a href="/feed.xml">RSS</a>
            <span aria-hidden="true">·</span>
            <span>
              {posts.length} {posts.length === 1 ? "entry" : "entries"}
            </span>
          </p>
        </header>

        {posts.length ? (
          <div className="writing-years">
            {[...years].map(([year, list]) => (
              <section key={year} className="writing-year" aria-labelledby={`y${year}`}>
                <h2 id={`y${year}`} className="writing-year-title">
                  {year}
                </h2>
                <ul>
                  {list.map((p) => (
                    <li key={p.id}>
                      {p.page ? (
                        <Link href={`/writing/${p.slug}`} className="article-more-row">
                          <span className="article-more-name">
                            <FluentText>{p.title}</FluentText>
                            {p.dek ? <span className="writing-row-dek">{p.dek}</span> : null}
                          </span>
                          <time dateTime={p.publishedAt} title={formatLongDate(p.publishedAt)}>
                            {monthDay.format(new Date(p.publishedAt))}
                          </time>
                        </Link>
                      ) : (
                        <span className="article-more-row writing-row-note">
                          <span className="article-more-name">
                            <FluentText>{p.title}</FluentText>
                          </span>
                          <time dateTime={p.publishedAt} title={formatLongDate(p.publishedAt)}>
                            {monthDay.format(new Date(p.publishedAt))}
                          </time>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="article-dek">Nothing published yet.</p>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
      </main>
    </div>
  );
}
