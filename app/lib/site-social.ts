import type { Metadata } from "next";
import { HOME_SOCIAL_CARD, SITE_INFO } from "../constants/seo";
import { socialImage, type SocialCard } from "../../cms/social";

export const SITE_SOCIAL_CARDS: Record<string, SocialCard> = {
  home: HOME_SOCIAL_CARD,
  projects: { kind: "site", slug: "projects", title: "Projects", description: "Things I’ve built, the decisions behind them, and what I learned along the way.", visual: "editorial" },
  writing: { kind: "site", slug: "writing", title: "Writing", description: `Writing by ${SITE_INFO.name}: technical notes on building AI systems and the infrastructure under them, and personal ones on whatever else I'm working out.`, visual: "editorial" },
  privacy: { kind: "site", slug: "privacy", title: "Privacy Policy", description: "Privacy policy for nazarene.dev: data minimization, cookieless analytics, reader privacy, and zero data selling.", visual: "editorial" },
  cookies: { kind: "site", slug: "cookies", title: "Cookie Policy", description: "Cookie policy for nazarene.dev: why we run cookieless analytics, full inventory of functional state, and consent determinations.", visual: "editorial" },
  terms: { kind: "site", slug: "terms", title: "Terms and Conditions", description: "Terms of service and use for nazarene.dev: intellectual property, permissible use, code licensing, and disclaimers.", visual: "editorial" },
};

export function pageSocialMetadata(card: SocialCard, pathname: string): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [socialImage(card)];
  return {
    openGraph: { type: "website", locale: "en_US", siteName: SITE_INFO.name, title: card.title, description: card.description, url: new URL(pathname, SITE_INFO.url).href, images },
    twitter: { card: "summary_large_image", title: card.title, description: card.description, images },
  };
}
