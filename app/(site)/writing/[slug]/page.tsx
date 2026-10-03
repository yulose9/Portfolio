import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { coverImageStyle, coverStyle } from "../../../../cms/cover";
import { imageInfo } from "../../../../cms/media";
import { prioritizeLeadImage } from "../../../../cms/render";
import { fluentUrl } from "../../../../cms/emoji";
import { tagSlug } from "../../../../cms/format";
import { fontLinks, inlineFontLinks, fontVars } from "../../../../cms/fonts";
import { showsSubtitle } from "../../../../cms/subtitle";
import ArticleBody from "../../../components/writing/ArticleBody";
import ArticleEnhance from "../../../components/writing/ArticleEnhance";
import ArticleMenu from "../../../components/writing/ArticleMenu";
import AuthorCard from "../../../components/writing/AuthorCard";
import Byline from "../../../components/writing/Byline";
import FluentText from "../../../components/writing/FluentText";
import ShareRow from "../../../components/writing/ShareRow";
import { SoundToggle } from "../../../components/ui/sound";
import { ThemeToggle } from "../../../components/ui/theme";
import Tag from "../../../components/writing/Tag";
import Toc from "../../../components/writing/Toc";
import { FEED, ID, jsonLd, PERSON, SITE_INFO, TWITTER_METADATA } from "../../../constants/seo";
import { postDescription, postImages, shareImage } from "../../../lib/seo";
import {
  backlinks,
  formatLongDate,
  markdownTree,
  outline,
  pagedPosts,
  postBySlug,
  related,
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
  const description = postDescription(post);
  // The share image as chosen in the admin (an upload, or a raster cover),
  // else the card drawn for this post at /og/writing/<slug>.png.
  const cover = [shareImage(post)];
  return {
    title: post.title,
    description,
    authors: post.authors.map((a) => ({ name: a.name, ...(a.name === SITE_INFO.name ? { url: SITE_INFO.url } : {}) })),
    keywords: post.tags,
    alternates: { canonical: url, types: { ...FEED, "text/markdown": [{ url: `${url}/index.md`, title: "Markdown" }] } },
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
      images: cover,
    },
    twitter: { ...TWITTER_METADATA, title: post.title, description, images: cover },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  // Every other post, as the hover card a link to it shows (kit Glimpse).
  const previews = Object.fromEntries(
    pagedPosts()
      .filter((p) => p.slug !== post.slug)
      .map((p) => [`/writing/${p.slug}`, { title: p.title, description: p.dek || undefined, image: p.cover?.src, site: "nazarene.dev" }]),
  );

  const tree = await markdownTree(post.body);
  // No cover: an image near the top of the body is the likely LCP, so it
  // loads eagerly rather than lazily.
  if (!post.cover) prioritizeLeadImage(tree);
  // A cover's uploaded widths, so a phone downloads the 640px or 1280px file.
  const coverSizes = post.cover ? imageInfo(post.cover.src) : null;
  const toc = outline(tree);
  const parent = post.parentId ? pagedPosts().find(p => p.id === post.parentId) : undefined;
  const linksHere = backlinks(post);
  const next = related(post);
  const url = `${SITE_INFO.url}/writing/${post.slug}`;
  const description = postDescription(post);
  const authors = post.authors.filter((a) => a.name.trim());

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description,
        ...(post.dek ? { abstract: post.dek } : {}),
        url,
        mainEntityOfPage: { "@id": url },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: "en",
        wordCount: wordCount(post.body),
        timeRequired: `PT${post.minutes}M`,
        image: postImages(post),
        thumbnailUrl: shareImage(post).url,
        keywords: post.tags.length ? post.tags : undefined,
        articleSection: post.tags[0],
        about: post.tags.map((t) => ({ "@type": "Thing", name: t, url: `${SITE_INFO.url}/writing/tag/${tagSlug(t)}` })),
        isPartOf: [{ "@id": ID.website }, { "@id": `${SITE_INFO.url}/writing#blog` }],
        publisher: { "@id": ID.person },
        author: authors.map((a) =>
          a.name === SITE_INFO.name
            ? { "@id": ID.person }
            : { "@type": "Person", name: a.name, ...(a.avatar ? { image: new URL(a.avatar, SITE_INFO.url).toString() } : {}) }
        ),
        ...(next.length ? { relatedLink: next.map((p) => `${SITE_INFO.url}/writing/${p.slug}`) } : {}),
      },
      // The page itself, so mainEntityOfPage and the breadcrumbs have a node to point at.
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: post.title,
        description,
        inLanguage: "en",
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        isPartOf: { "@id": ID.website },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        primaryImageOfPage: { "@type": "ImageObject", url: shareImage(post).url },
      },
      // The author in full, here as well as on the home page: each page's graph
      // has to stand on its own for validators and for engines that read one URL.
      PERSON,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_INFO.url },
          { "@type": "ListItem", position: 2, name: "Writing", item: `${SITE_INFO.url}/writing` },
          ...(parent ? [{ "@type": "ListItem", position: 3, name: parent.title, item: `${SITE_INFO.url}/writing/${parent.slug}` }] : []),
          { "@type": "ListItem", position: parent ? 4 : 3, name: post.title, item: url },
        ],
      },
    ],
  };

  // A banner cover spans the page above the column, the icon over its edge.
  const banner = post.cover && coverStyle(post.cover) === "banner" ? post.cover : null;
  const breadcrumbs = (
    <nav className="article-nav" aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/writing">Writing</Link>
        </li>
        {parent ? <li><Link href={`/writing/${parent.slug}`}>{parent.title}</Link></li> : null}
        <li aria-current="page">
          <FluentText>{post.title}</FluentText>
        </li>
      </ol>
    </nav>
  );

  return (
    <div className="flex w-full flex-col items-center bg-[color:var(--paper)]">
      {/* A post's own typefaces, if it has any; React hoists these into <head>. */}
      {[...new Set([...fontLinks(post.fonts),...inlineFontLinks(post.body)])].map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <div className="reading-progress" aria-hidden="true" />
      {banner ? (
        <figure className="article-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.src} srcSet={coverSizes?.srcSet} sizes={coverSizes ? "100vw" : undefined} alt={banner.alt} width={banner.width} height={banner.height} style={coverImageStyle(banner)} fetchPriority="high" decoding="async" />
        </figure>
      ) : null}
      <main id="main" tabIndex={-1}
        data-cursor-frame
        className="page-shell page-enter article-shell article-page w-full max-w-[672px] py-16 sm:py-24"
        style={fontVars(post.fonts) as React.CSSProperties}
        data-cover={banner ? "banner" : undefined}
      >
        {banner ? (
          <div className="article-banner-row">
            {post.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="article-banner-icon" src={fluentUrl(post.icon)} alt="" width={78} height={78} />
            ) : null}
            {breadcrumbs}
          </div>
        ) : (
          breadcrumbs
        )}

        <ArticleMenu title={post.title} url={url} markdownUrl={`/writing/${post.slug}/index.md`}>
        <article className="article" data-has-toc={toc.length >= 3 || undefined}>
          <header className="article-header">
            {post.icon && !banner ? (
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
            {post.dek && showsSubtitle(post.fonts) ? (
              <p data-cursor="text" className="article-dek">
                <FluentText>{post.dek}</FluentText>
              </p>
            ) : null}
            <Byline
              authors={post.authors}
              minutes={post.minutes}
              updated={post.updatedAt}
            />
          </header>

          {post.cover && !banner ? (
            <figure className="article-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover.src}
                srcSet={coverSizes?.srcSet}
                sizes={coverSizes?.sizes}
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
              <ArticleBody tree={tree} previews={previews} />
            </div>
          </div>

          <footer className="article-footer">
            <ShareRow url={url} title={post.title} />
            <SoundToggle className="ml-auto size-9 rounded-full" />
            <ThemeToggle className="size-9 rounded-full" />
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
