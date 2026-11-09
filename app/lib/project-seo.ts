import type { Metadata } from "next";
import type { Post } from "../../cms/format";
import { safeInlineUrl } from "../../cms/inline";
import { contentSocialCard, socialImage } from "../../cms/social";
import { FEED, ID, SITE_INFO } from "../constants/seo";
import { plainText, postDescription } from "./seo";

/** No draft fields, author emails, generated avatar seeds, or inferred results. */
type ProjectSource = Pick<Post, "id" | "parentId" | "slug" | "title" | "dek" | "body" | "authors" | "tags" | "cover" | "ogImage" | "publishedAt" | "updatedAt"> & { icon?: string | null };

export const projectUrl = (slug: string) => `${SITE_INFO.url}/projects/${encodeURIComponent(slug)}`;

function absoluteImage(src: string): string | undefined {
  const safe = safeInlineUrl(src, true);
  if (!safe) return undefined;
  const url = new URL(safe, SITE_INFO.url);
  return url.username || url.password ? undefined : url.toString();
}

/** Every published project has a real, build-generated PNG, even without a cover. */
export function projectShareImage(page: ProjectSource) {
  return socialImage(contentSocialCard(page, "projects"));
}

function sourceDate(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
    || !Number.isFinite(Date.parse(value))) return undefined;
  // Date.parse normalizes impossible dates such as February 30.
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().startsWith(value.slice(0, 10)) ? value : undefined;
}

/** Call with publishedProjects(): missing/private ancestors never become links. */
export function projectAncestors(page: ProjectSource, publicPages: readonly ProjectSource[]): ProjectSource[] {
  const ancestors: ProjectSource[] = [];
  const seen = new Set([page.id]);
  let parent = page.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const found = publicPages.find(candidate => candidate.id === parent);
    if (!found) break;
    ancestors.unshift(found);
    parent = found.parentId;
  }
  return ancestors;
}

/** The same source facts drive head tags, schema, sharing, and visible breadcrumbs. */
export function projectSeo(page: ProjectSource, publicPages: readonly ProjectSource[] = []) {
  const url = projectUrl(page.slug);
  // These are removed by the public renderer too; hidden HTML is not a snippet.
  const body = page.body.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const description = postDescription({ title: page.title, dek: plainText(page.dek), body });
  const isArticle = Boolean(plainText(body));
  const authors = page.authors.filter(author => author.name.trim()).map(author => ({
    name: author.name.trim(),
    ...(author.name.trim() === SITE_INFO.name ? { url: SITE_INFO.url } : {}),
  }));
  const tags = [...new Set(page.tags.map(tag => tag.trim()).filter(Boolean))];
  const published = sourceDate(page.publishedAt);
  const updated = sourceDate(page.updatedAt);
  const modified = updated && (!published || Date.parse(updated) >= Date.parse(published)) ? updated : undefined;
  const dates = {
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
  };
  const share = projectShareImage(page);
  const images = share ? [share] : [];
  const ancestors = projectAncestors(page, publicPages);
  const publisher = { "@type": "Person", "@id": ID.person, name: SITE_INFO.name, url: SITE_INFO.url };

  const metadata: Metadata = {
    title: page.title,
    description,
    authors,
    // Explicit empty arrays prevent unrelated layout keywords/images being inherited.
    keywords: tags,
    alternates: { canonical: url, types: { ...FEED, "text/markdown": [{ url: `${url}/index.md`, title: "Markdown" }] } },
    openGraph: {
      title: page.title, description, url, siteName: SITE_INFO.name, locale: "en_US", images,
      ...(isArticle ? {
        type: "article",
        ...(published ? { publishedTime: published } : {}),
        ...(modified ? { modifiedTime: modified } : {}),
        authors: authors.map(author => author.name),
        tags,
      } : { type: "website" }),
    },
    // The site's social account is not necessarily a guest author's account.
    twitter: { card: share ? "summary_large_image" : "summary", title: page.title, description, images },
  };

  const coverUrl = page.cover ? absoluteImage(page.cover.src) : undefined;
  const schemaImages = [...new Set([coverUrl, share?.url].filter((src): src is string => Boolean(src)))];
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        // This describes the published narrative, not an invented Product/SoftwareApplication.
        "@type": isArticle ? "Article" : "CreativeWork",
        "@id": `${url}#work`,
        name: page.title,
        ...(isArticle ? { headline: page.title } : {}),
        description, url, inLanguage: "en",
        mainEntityOfPage: { "@id": url },
        isPartOf: { "@id": ID.website },
        ...dates,
        ...(authors.length ? { author: authors.map(author => ({
          "@type": "Person", ...author,
          ...(author.url === SITE_INFO.url ? { "@id": ID.person } : {}),
        })) } : {}),
        publisher: { "@id": ID.person },
        ...(tags.length ? { keywords: tags } : {}),
        ...(schemaImages.length ? { image: schemaImages } : {}),
      },
      {
        "@type": "WebPage", "@id": url, url, name: page.title, description, inLanguage: "en",
        ...dates,
        mainEntity: { "@id": `${url}#work` },
        isPartOf: { "@id": ID.website },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        // Only a visible cover is the page's primary image; share art can differ.
        ...(coverUrl ? { primaryImageOfPage: { "@type": "ImageObject", url: coverUrl } } : {}),
      },
      {
        "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`,
        itemListElement: [
          { name: "Projects", item: `${SITE_INFO.url}/projects` },
          ...ancestors.map(ancestor => ({ name: ancestor.title, item: projectUrl(ancestor.slug) })),
          { name: page.title, item: url },
        ].map((item, index) => ({ "@type": "ListItem", position: index + 1, ...item })),
      },
      publisher,
      { "@type": "WebSite", "@id": ID.website, url: SITE_INFO.url, name: SITE_INFO.name, publisher: { "@id": ID.person } },
    ],
  };
  return { metadata, graph, url, ancestors };
}
