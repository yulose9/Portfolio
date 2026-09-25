import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShareRow from "../../../components/writing/ShareRow";
import { SITE_INFO } from "../../../constants/seo";
import { formatLongDate, postBySlug, publishedPosts, renderMarkdown, wasUpdated } from "../../../lib/writing";
import { PROFILE } from "../../../site-content";

/*
 * One article. Built once per post at build time; the page ships no script for
 * its content (the share row is the only island).
 *
 * The anatomy follows the reference set: a quiet mono eyebrow, a headline that
 * is a real step up from the home page's 16px, a standfirst a size above the
 * body (Apple's dek), then a cover that breaks out wider than the text while
 * its caption stays on the text's measure.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = publishedPosts();
  // A static export needs at least one path per dynamic route. With nothing
  // published yet, one placeholder path renders the 404 below instead.
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return { title: "Not found", robots: { index: false } };
  const url = `${SITE_INFO.url}/writing/${post.slug}`;
  const image = post.cover ? new URL(post.cover.src, SITE_INFO.url).toString() : undefined;
  return {
    title: `${post.title} · ${PROFILE.name.split(" ").slice(0, 2).join(" ")}`,
    description: post.dek || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.dek || undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: image ? [{ url: image, alt: post.cover?.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: post.title, description: post.dek || undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();

  const html = await renderMarkdown(post.body);
  const others = publishedPosts().filter((p) => p.id !== post.id).slice(0, 3);
  const url = `${SITE_INFO.url}/writing/${post.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.dek || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url,
    image: post.cover ? new URL(post.cover.src, SITE_INFO.url).toString() : undefined,
    author: { "@type": "Person", name: PROFILE.name, url: SITE_INFO.url },
    keywords: post.tags.join(", ") || undefined,
  };

  return (
    <div className="flex w-full justify-center bg-white">
      <main data-cursor-frame className="page-shell page-enter article-shell article-page w-full max-w-[672px] py-16 sm:py-24">
        <nav className="article-nav">
          <Link href="/#writing" className="article-back">
            <span aria-hidden="true">←</span> Writing
          </Link>
        </nav>

        <article className="article">
          <header className="article-header">
            <p className="article-eyebrow">
              {post.tags[0] ? <span className="article-tag">{post.tags[0]}</span> : null}
              <time dateTime={post.publishedAt}>{formatLongDate(post.publishedAt)}</time>
            </p>
            <h1 data-cursor="text" className="article-title">
              {post.title}
            </h1>
            {post.dek ? (
              <p data-cursor="text" className="article-dek">
                {post.dek}
              </p>
            ) : null}
            <div className="article-byline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/avatar-96.webp" alt="" width={28} height={28} className="article-avatar" />
              <span className="article-author">{PROFILE.name}</span>
              <span aria-hidden="true">·</span>
              <span>{post.minutes} min read</span>
              {wasUpdated(post) ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={post.updatedAt}>{formatLongDate(post.updatedAt)}</time>
                  </span>
                </>
              ) : null}
            </div>
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
              />
              {post.cover.caption ? <figcaption>{post.cover.caption}</figcaption> : null}
            </figure>
          ) : null}

          <div data-cursor="text" className="article-body" dangerouslySetInnerHTML={{ __html: html }} />

          <footer className="article-footer">
            {post.tags.length ? (
              <ul className="article-tags" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
            <ShareRow url={url} title={post.title} />
          </footer>
        </article>

        {others.length ? (
          <section className="article-more" aria-labelledby="more-writing">
            <h2 id="more-writing" className="article-more-title">
              More writing
            </h2>
            <ul>
              {others.map((p) => (
                <li key={p.id}>
                  <Link href={`/writing/${p.slug}`} className="article-more-row">
                    <span className="article-more-name">{p.title}</span>
                    <time dateTime={p.publishedAt}>{formatLongDate(p.publishedAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </main>
    </div>
  );
}
