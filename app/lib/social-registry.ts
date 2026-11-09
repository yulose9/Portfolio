import { contentSocialCard, socialFile, type SocialCard } from "../../cms/social";
import { tagSlug } from "../../cms/format";
import { pagedPosts, publishedPosts } from "./writing";
import { publishedProjects } from "./projects";
import { readTagPage } from "./tag-pages";
import { SITE_SOCIAL_CARDS } from "./site-social";
import { clip } from "./seo";

export function tagSocialCard(slug: string, name: string): SocialCard {
  const custom = readTagPage(slug);
  const posts = publishedPosts().filter(p => p.tags.some(tag => tagSlug(tag) === slug));
  return {
    kind: "tags", slug, title: custom.title || name,
    description: clip(custom.description || `${posts.length} ${posts.length === 1 ? "entry" : "entries"} on ${name}. ${posts.slice(0, 3).map(p => p.title).join(". ")}`, 160),
    visual: "editorial", revision: posts.map(p => `${p.id}:${p.updatedAt}`).sort().join("|"),
  };
}

/** This registry reads published content only. Draft storage is never involved. */
export function publicSocialCards(): SocialCard[] {
  const tags = new Map<string, string>();
  for (const page of publishedPosts()) for (const tag of page.tags) if (!tags.has(tagSlug(tag))) tags.set(tagSlug(tag), tag);
  return [
    ...Object.values(SITE_SOCIAL_CARDS),
    ...pagedPosts().map(page => contentSocialCard(page, "writing")),
    ...publishedProjects().map(page => contentSocialCard(page, "projects")),
    ...[...tags].map(([slug, name]) => tagSocialCard(slug, name)),
  ];
}

export function findSocialCard(kind: string, file: string): SocialCard | undefined {
  return publicSocialCards().find(card => card.kind === kind && (socialFile(card) === file || `${card.slug}.png` === file));
}
