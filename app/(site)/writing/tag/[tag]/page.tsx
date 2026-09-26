import UpdatedAt from "../../../../components/UpdatedAt";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { tagSlug } from "../../../../../cms/format";
import FluentText from "../../../../components/writing/FluentText";
import Tag from "../../../../components/writing/Tag";
import { FEED, ID, jsonLd, OG_METADATA, SITE_INFO } from "../../../../constants/seo";
import { formatLongDate, publishedPosts } from "../../../../lib/writing";

/*
 * /writing/tag/<tag> — everything filed under one tag. A hub per topic: each
 * article's tags link here, and it's one more page that answers "what has he
 * written about agents?" for readers and search alike.
 */

export const dynamicParams = false;

function allTags(): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of publishedPosts()) for (const t of p.tags) if (!m.has(tagSlug(t))) m.set(tagSlug(t), t);
  return m;
}

export function generateStaticParams() {
  const slugs = [...allTags().keys()];
  return slugs.length ? slugs.map((tag) => ({ tag })) : [{ tag: "_" }];
}

type Props = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).tag;
  const name = allTags().get(slug);
  if (!name) return { title: "Not found", robots: { index: false } };
  const description = `Writing by ${SITE_INFO.name} on ${name}.`;
  return {
    title: `${name} · Writing`,
    description,
    alternates: { canonical: `/writing/tag/${slug}`, types: FEED },
    openGraph: { ...OG_METADATA, title: `${name} · Writing by ${SITE_INFO.name}`, description, url: `${SITE_INFO.url}/writing/tag/${slug}` },
  };
}

const monthDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function TagPage({ params }: Props) {
  const slug = (await params).tag;
  const tags = allTags();
  const name = tags.get(slug);
  if (!name) notFound();
  const posts = publishedPosts().filter((p) => p.tags.some((t) => tagSlug(t) === slug));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${name} · Writing`,
        url: `${SITE_INFO.url}/writing/tag/${slug}`,
        isPartOf: { "@id": ID.website },
        about: name,
        hasPart: posts.filter((p) => p.page).map((p) => ({ "@id": `${SITE_INFO.url}/writing/${p.slug}#article` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
          { "@type": "ListItem", position: 3, name, item: `${SITE_INFO.url}/writing/tag/${slug}` },
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
            <li>
              <Link href="/writing">Writing</Link>
            </li>
            <li aria-current="page">{name}</li>
          </ol>
        </nav>
        <header className="article-header">
          <p className="article-eyebrow">Tag</p>
          <h1 className="article-title">{name}</h1>
          <p className="writing-index-meta">
            {posts.length} {posts.length === 1 ? "entry" : "entries"}
          </p>
        </header>
        <div className="writing-years">
          <ul className="writing-year">
            {posts.map((p) => (
              <li key={p.id}>
                {p.page ? (
                  <Link href={`/writing/${p.slug}`} className="article-more-row">
                    <span className="article-more-name">
                      <FluentText>{p.title}</FluentText>
                            <span className="writing-row-updated"><UpdatedAt at={p.updatedAt} nested /></span>
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
                            <span className="writing-row-updated"><UpdatedAt at={p.updatedAt} nested /></span>
                    </span>
                    <time dateTime={p.publishedAt}>{monthDay.format(new Date(p.publishedAt))}</time>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        {tags.size > 1 ? (
          <section className="article-more" aria-label="Other tags">
            <h2 className="article-more-title">Other tags</h2>
            <div className="tag-cloud">
              {[...tags]
                .filter(([s]) => s !== slug)
                .map(([s, n]) => (
                  <Tag key={s} name={n} href={`/writing/tag/${s}`} />
                ))}
            </div>
          </section>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
      </main>
    </div>
  );
}
