import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fluentUrl } from "../../../../cms/emoji";
import { tagSlug } from "../../../../cms/format";
import { fontLinks, fontVars } from "../../../../cms/fonts";
import ArticleBody from "../../../components/writing/ArticleBody";
import ArticleEnhance from "../../../components/writing/ArticleEnhance";
import ArticleMenu from "../../../components/writing/ArticleMenu";
import AuthorCard from "../../../components/writing/AuthorCard";
import Byline from "../../../components/writing/Byline";
import FluentText from "../../../components/writing/FluentText";
import ShareRow from "../../../components/writing/ShareRow";
import Tag from "../../../components/writing/Tag";
import Toc from "../../../components/writing/Toc";
import { FEED, ID, jsonLd, SITE_INFO, TWITTER_METADATA } from "../../../constants/seo";
import {
  backlinks,
  formatLongDate,
  markdownTree,
  outline,
  pagedPosts,
  postBySlug,
  related,
  wasUpdated,
  wordCount,
} from "../../../lib/writing";

/*
 * One article. Built once per post at build time; the words ship no script
 * (the enhancements — contents highlight, code copy, image zoom — are one
 * small island that only adds to markup that's already there).
 *
 * Anatomy, top to bottom: breadcrumbs, the page icon, a quiet mono eyebrow,
 * the headline, the standfirst, the byline; the cover breaking out wider
 * than the text; the body with its contents in the margin on wide screens;
 * then tags and sharing, who wrote it, what links here, and what to read next.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = pagedPosts();
  // A static export needs at least one path per dynamic route. With nothing
  // published yet, one placeholder renders the 404 below (and is noindexed).
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return { title: "Not found", robots: { index: false, follow: false } };
  const url = `${SITE_INFO.url}/writing/${post.slug}`;
  const description = post.dek || `${post.title}, by ${post.authors.map((a) => a.name).join(" and ")}.`;
  // The share image as chosen in the admin: an uploaded one, the cover, or
  // (null) the card drawn for this post by opengraph-image.tsx, which Next
  // adds itself when nothing is named here.
  const cover =
    post.ogImage && post.ogImage !== "cover"
      ? [{ url: new URL(post.ogImage, SITE_INFO.url).toString(), width: 1200, height: 630, alt: post.title }]
      : post.ogImage === "cover" && post.cover
        ? [{ url: new URL(post.cover.src, SITE_INFO.url).toString(), alt: post.cover.alt }]
        : undefined;
  return {
    title: post.title,
    description,
    authors: post.authors.map((a) => ({ name: a.name, ...(a.name === SITE_INFO.name ? { url: SITE_INFO.url } : {}) })),
    keywords: post.tags,
    alternates: { canonical: url, types: { ...FEED, "text/markdown": [{ url: `${url}/index.md`, title: "Markdown" }] } },
    // No default image spread in: the post's own share card (opengraph-image.tsx)
    // only appears when openGraph doesn't name one.
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: SITE_INFO.name,
      url,
      title: post.title,
      description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.authors.map((a) => a.name),
      tags: post.tags,
      ...(cover ? { images: cover } : {}),
    },
    twitter: { ...TWITTER_METADATA, title: post.title, description, ...(cover ? { images: cover } : {}) },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const tree = await markdownTree(post.body);
  const toc = outline(tree);
  const linksHere = backlinks(post);
  const next = related(post);
  const url = `${SITE_INFO.url}/writing/${post.slug}`;
  const image =
    post.ogImage && post.ogImage !== "cover"
      ? new URL(post.ogImage, SITE_INFO.url).toString()
      : post.cover
        ? new URL(post.cover.src, SITE_INFO.url).toString()
        : `${url}/opengraph-image`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.dek || undefined,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: "en",
        wordCount: wordCount(post.body),
        timeRequired: `PT${post.minutes}M`,
        image: [image],
        keywords: post.tags.join(", ") || undefined,
        articleSection: post.tags[0],
        isPartOf: { "@id": ID.website },
        publisher: { "@id": ID.person },
        author: post.authors.filter((a) => a.name.trim()).map((a) =>
          a.name === SITE_INFO.name
            ? { "@id": ID.person }
            : { "@type": "Person", name: a.name, ...(a.avatar ? { image: new URL(a.avatar, SITE_INFO.url).toString() } : {}) }
        ),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <div className="flex w-full justify-center bg-white">
      {/* A post's own typefaces, if it has any; React hoists these into <head>. */}
      {fontLinks(post.fonts).map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <div className="reading-progress" aria-hidden="true" />
      <main
        data-cursor-frame
        className="page-shell page-enter article-shell article-page w-full max-w-[672px] py-16 sm:py-24"
        style={fontVars(post.fonts) as React.CSSProperties}
      >
        <nav className="article-nav" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/writing">Writing</Link>
            </li>
            <li aria-current="page">
              <FluentText>{post.title}</FluentText>
            </li>
          </ol>
        </nav>

        <ArticleMenu title={post.title} url={url} markdownUrl={`/writing/${post.slug}/index.md`}>
        <article className="article" data-has-toc={toc.length >= 3 || undefined}>
          <header className="article-header">
            {post.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="article-icon" src={fluentUrl(post.icon)} alt="" width={72} height={72} />
            ) : null}
            <p className="article-eyebrow">
              <time dateTime={post.publishedAt}>{formatLongDate(post.publishedAt)}</time>
            </p>
            {post.tags.length ? (
              <div className="article-header-tags">
                {post.tags.map((t) => (
                  <Tag key={t} name={t} href={`/writing/tag/${tagSlug(t)}`} />
                ))}
              </div>
            ) : null}
            <h1 data-cursor="text" className="article-title">
              <FluentText>{post.title}</FluentText>
            </h1>
            {post.dek ? (
              <p data-cursor="text" className="article-dek">
                <FluentText>{post.dek}</FluentText>
              </p>
            ) : null}
            <Byline
              authors={post.authors}
              minutes={post.minutes}
              updated={wasUpdated(post) ? post.updatedAt : null}
              updatedLabel={wasUpdated(post) ? formatLongDate(post.updatedAt) : null}
            />
          </header>

          {post.cover ? (
            <figure className="article-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover.src}
                alt={post.cover.alt}
                width={post.cover.width}
                height={post.cover.height}
                fetchPriority="high"
                decoding="async"
                data-zoom=""
              />
              {post.cover.caption ? <figcaption>{post.cover.caption}</figcaption> : null}
            </figure>
          ) : null}

          <div className="article-main">
            {toc.length >= 3 ? <Toc items={toc} /> : null}
            <div data-cursor="text" className="article-body">
              <ArticleBody tree={tree} />
            </div>
          </div>

          <footer className="article-footer">
            {post.tags.length ? (
              <ul className="article-tags" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Tag name={tag} href={`/writing/tag/${tagSlug(tag)}`} />
                  </li>
                ))}
              </ul>
            ) : null}
            <ShareRow url={url} title={post.title} />
          </footer>

          <AuthorCard authors={post.authors} />
        </article>
        </ArticleMenu>

        {linksHere.length ? (
          <section className="article-more" aria-labelledby="links-here">
            <h2 id="links-here" className="article-more-title">
              Mentioned in
            </h2>
            <ul>
              {linksHere.map((p) => (
                <li key={p.id}>
                  <Link href={`/writing/${p.slug}`} className="article-more-row">
                    <span className="article-more-name">
                      <FluentText>{p.title}</FluentText>
                    </span>
                    <time dateTime={p.publishedAt}>{formatLongDate(p.publishedAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {next.length ? (
          <section className="article-more" aria-labelledby="more-writing">
            <h2 id="more-writing" className="article-more-title">
              More writing
            </h2>
            <ul>
              {next.map((p) => (
                <li key={p.id}>
                  <Link href={`/writing/${p.slug}`} className="article-more-row">
                    <span className="article-more-name">
                      <FluentText>{p.title}</FluentText>
                    </span>
                    <time dateTime={p.publishedAt}>{formatLongDate(p.publishedAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
        <ArticleEnhance />
      </main>
    </div>
  );
}
