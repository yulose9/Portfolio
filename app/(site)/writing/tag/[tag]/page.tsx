import { readTagPage } from "../../../../lib/tag-pages";
import UpdatedAt from "../../../../components/UpdatedAt";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { tagSlug } from "../../../../../cms/format";
import FluentText from "../../../../components/writing/FluentText";
import Tag from "../../../../components/writing/Tag";
import { FEED, ID, jsonLd, OG_IMAGE, OG_METADATA, PERSON, SITE_INFO, TWITTER_METADATA } from "../../../../constants/seo";
import { clip } from "../../../../lib/seo";
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

const postsTagged = (slug: string) => publishedPosts().filter((p) => p.tags.some((t) => tagSlug(t) === slug));

/**
 * The tag's description: the one written for it in the admin, else one built
 * from what's filed there, so each tag page has its own snippet, not a stub.
 */
function tagDescription(slug: string, name: string, custom?: string): string {
  if (custom) return clip(custom, 160);
  const posts = postsTagged(slug);
  const count = `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;
  const titles = posts.slice(0, 3).map((p) => `“${p.title}”`).join(", ");
  return clip(`${count} on ${name} by ${SITE_INFO.name}, AI specialist${titles ? `: ${titles}` : ""}.`, 160);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).tag;
  const name = allTags().get(slug);
  if (!name) return { title: "Not found", robots: { index: false } };
  const custom=readTagPage(slug);
  const title=custom.title||name;
  const description = tagDescription(slug, name, custom.description);
  return {
    title: `${title} · Writing`,
    description,
    alternates: { canonical: `/writing/tag/${slug}`, types: FEED },
    openGraph: { ...OG_METADATA, title: `${title} · Writing by ${SITE_INFO.name}`, description, url: `${SITE_INFO.url}/writing/tag/${slug}` },
    twitter: { ...TWITTER_METADATA, title: `${title} · Writing by ${SITE_INFO.name}`, description, images: [OG_IMAGE] },
  };
}

const monthDay = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function TagPage({ params }: Props) {
  const slug = (await params).tag;
  const tags = allTags();
  const name = tags.get(slug);
  if (!name) notFound();
  const custom=readTagPage(slug);
  const posts = postsTagged(slug);
  const url = `${SITE_INFO.url}/writing/tag/${slug}`;
  const paged = posts.filter((p) => p.page);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        name: `${custom.title || name} · Writing`,
        description: tagDescription(slug, name, custom.description),
        url,
        inLanguage: "en",
        isPartOf: { "@id": ID.website },
        about: { "@type": "Thing", name },
        author: { "@id": ID.person },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        ...(paged[0] ? { dateModified: paged.reduce((a, p) => (p.updatedAt > a ? p.updatedAt : a), paged[0].updatedAt) } : {}),
        hasPart: paged.map((p) => ({ "@id": `${SITE_INFO.url}/writing/${p.slug}#article` })),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: paged.length,
          itemListElement: paged.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_INFO.url}/writing/${p.slug}`, name: p.title })),
        },
      },
      PERSON,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
          { "@type": "ListItem", position: 3, name, item: `${SITE_INFO.url}/writing/tag/${slug}` },
        ],
      },
    ],
  };

  return (
    <div className="flex w-full justify-center bg-[color:var(--paper)]">
      <main id="main" tabIndex={-1} data-cursor-frame className="page-shell page-enter article-shell article-page writing-index w-full max-w-[672px] py-16 sm:py-24">
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
          <h1 className="article-title">{custom.title||name}</h1>
          {custom.description?<p className="article-dek">{custom.description}</p>:null}
          {custom.updatedAt?<UpdatedAt at={custom.updatedAt}/>:null}
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
