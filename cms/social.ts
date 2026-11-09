/** Public share-card facts only. Never pass an entire draft into a renderer. */
export const SOCIAL_ORIGIN = "https://nazarene.dev";
export const SOCIAL_SIZE = { width: 1200, height: 630 } as const;
export type SocialKind = "site" | "writing" | "projects" | "tags";
export type SocialCard = {
  kind: SocialKind;
  slug: string;
  title: string;
  description: string;
  icon?: string | null;
  image?: string | null;
  visual: "editorial" | "artwork";
  authors?: string[];
  revision?: string;
};

/** A cache key, not a security digest. A design/content change gets a new URL. */
export function socialVersion(card: SocialCard): string {
  const text = JSON.stringify([3, card.kind, card.slug, card.title, card.description, card.icon, card.image, card.visual, card.authors, card.revision]);
  let a = 2166136261, b = 3339675911;
  for (const c of text) {
    a = Math.imul(a ^ c.charCodeAt(0), 16777619);
    b = Math.imul(b ^ c.charCodeAt(0), 2246822519);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

export const socialFile = (card: SocialCard) => `${encodeURIComponent(card.slug)}.${socialVersion(card)}.png`;
export const socialPath = (card: SocialCard) => `/og/${card.kind}/${socialFile(card)}`;
export const socialImage = (card: SocialCard) => ({
  url: `${SOCIAL_ORIGIN}${socialPath(card)}`, ...SOCIAL_SIZE,
  type: "image/png", alt: `Preview for ${card.title}`,
});

type ContentSource = {
  slug: string; title: string; dek: string; icon?: string | null; ogImage: string | null;
  cover: { src: string; alt?: string } | null; authors: { name: string }[]; updatedAt: string;
};
export function contentSocialCard(page: ContentSource, kind: "writing" | "projects"): SocialCard {
  return {
    kind, slug: page.slug, title: page.title, description: page.dek,
    icon: page.icon, image: page.ogImage && page.ogImage !== "cover" ? page.ogImage : page.cover?.src,
    visual: page.ogImage ? "artwork" : "editorial",
    authors: page.authors.map(a => a.name.trim()).filter(Boolean), revision: page.updatedAt,
  };
}

/** Only first-party public artwork may be read at build time. No remote URL proxy. */
export function publicArtworkPath(source: string | null | undefined): string | null {
  if (!source || /[\\\u0000-\u0020]/.test(source) || source.startsWith("//")) return null;
  try {
    const url = new URL(source, SOCIAL_ORIGIN);
    if (url.origin !== SOCIAL_ORIGIN || url.username || url.password || url.search || url.hash) return null;
    const decoded = decodeURIComponent(url.pathname);
    if (decoded !== url.pathname || decoded.includes("..") || !/^\/(?:(?:media\/|images\/|optimized\/|avatar-)[\w/.-]*\.(?:png|jpe?g|webp|gif|avif)|og\/avatar\.png)$/i.test(decoded)) return null;
    return decoded;
  } catch { return null; }
}
