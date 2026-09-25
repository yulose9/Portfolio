/**
 * SEO configuration and structured data, in one place so the tags, the
 * sitemap, the feed and the JSON-LD can't drift apart.
 *
 * One canonical origin: https://nazarene.dev (no www). The JSON-LD is a
 * single @graph whose nodes reference each other by @id — the Person is
 * https://nazarene.dev/#person everywhere, so the homepage, every article and
 * every search engine agree on who wrote what.
 */

import type { Metadata } from "next";

import { PROFILE, TABS } from "../site-content";

export const SITE_INFO = {
  name: "John Nazarene Dela Pisa",
  // The browser tab, and the headline of link previews and search results.
  title: "John Nazarene, AI Specialist",
  description:
    "AI Specialist and Computer Engineer in the Philippines, building products where AI meets infrastructure: agentic systems and the platforms they run on.",
  url: "https://nazarene.dev",
  author: "John Nazarene Dela Pisa",
  // The one-line identity used everywhere (schema, llms.txt, author box), so
  // engines see the same sentence wherever they meet it.
  identity:
    "John Nazarene Dela Pisa is an AI Specialist at FEAREX Technologies in Cavite, Philippines, building agentic systems and the infrastructure they run on. Before that he spent two years as a Solutions Architect across AWS and RHEL.",
  keywords: [
    "John Nazarene Dela Pisa",
    "AI Specialist",
    "agentic systems",
    "AI infrastructure",
    "LLM evaluation",
    "AWS",
    "Terraform",
    "RHEL",
    "Philippines",
  ],
};

export const ID = {
  person: `${SITE_INFO.url}/#person`,
  website: `${SITE_INFO.url}/#website`,
  profile: `${SITE_INFO.url}/#profile`,
};

export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/jannazarene",
  github: "https://github.com/yulose9",
  x: "https://x.com/xcszan",
  email: "jannazarene09@gmail.com",
};

/** The default share image, for pages without their own. */
export const OG_IMAGE = {
  url: `${SITE_INFO.url}/images/other/heyyo.png`,
  width: 1200,
  height: 630,
  alt: `${SITE_INFO.name}, AI Specialist at ${PROFILE.employer}`,
  type: "image/png",
};

export const OG_METADATA = {
  type: "website" as const,
  locale: "en_US",
  siteName: SITE_INFO.name,
  images: [OG_IMAGE],
};

export const TWITTER_METADATA = {
  card: "summary_large_image" as const,
  site: "@xcszan",
  creator: "@xcszan",
};

/**
 * The feed, for <link rel="alternate">. Pages that set their own canonical
 * must repeat this: Next replaces `alternates` wholesale rather than merging.
 */
export const FEED = { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_INFO.name} · Writing` }] };

/*
 * Site-wide defaults. No canonical here on purpose: a canonical set in the
 * root layout is inherited by every page that forgets its own (the 404
 * included), telling engines they're all the homepage. Each page sets its own.
 */
export const ENHANCED_METADATA: Metadata = {
  title: {
    default: SITE_INFO.title,
    template: `%s | ${SITE_INFO.name}`,
  },
  description: SITE_INFO.description,
  keywords: SITE_INFO.keywords,
  authors: [{ name: SITE_INFO.author, url: SITE_INFO.url }],
  creator: SITE_INFO.author,
  publisher: SITE_INFO.author,
  metadataBase: new URL(SITE_INFO.url),
  alternates: { types: FEED },
  other: {
    "twitter:domain": "nazarene.dev",
  },
  openGraph: {
    ...OG_METADATA,
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    url: SITE_INFO.url,
  },
  facebook: {
    appId: "729817763494664",
  },
  twitter: {
    ...TWITTER_METADATA,
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/* ── JSON-LD ─────────────────────────────────────────────────────────── */

/** Certificates from the Certificates tab, as schema.org credentials. */
function credentials() {
  const tab = TABS.find((t) => t.id === "certificates");
  return (tab?.items ?? [])
    .filter((c) => c.href)
    .map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.title,
      credentialCategory: "certification",
      ...(c.company ? { recognizedBy: { "@type": "Organization", name: c.company } } : {}),
      url: c.href,
    }));
}

export const PERSON = {
  "@type": "Person",
  "@id": ID.person,
  name: SITE_INFO.name,
  alternateName: "John Nazarene",
  url: SITE_INFO.url,
  image: `${SITE_INFO.url}/avatar-432.webp`,
  email: `mailto:${SOCIAL_LINKS.email}`,
  jobTitle: "AI Specialist",
  description: SITE_INFO.identity,
  address: { "@type": "PostalAddress", addressLocality: "Cavite", addressCountry: "PH" },
  worksFor: { "@type": "Organization", name: PROFILE.employer, url: PROFILE.employerUrl },
  alumniOf: { "@type": "EducationalOrganization", name: "Technological University of the Philippines - Manila" },
  knowsAbout: [
    "AI agents",
    "Agentic systems",
    "LLM evaluation",
    "AI infrastructure",
    "Amazon Web Services",
    "Red Hat Enterprise Linux",
    "Terraform",
    "Cloud architecture",
  ],
  hasCredential: credentials(),
  sameAs: [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.github, SOCIAL_LINKS.x],
};

export const WEBSITE = {
  "@type": "WebSite",
  "@id": ID.website,
  name: SITE_INFO.name,
  url: SITE_INFO.url,
  description: SITE_INFO.description,
  inLanguage: "en",
  publisher: { "@id": ID.person },
};

/** The homepage graph: who I am, the site, and the profile page itself. */
export function homeGraph(modified: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      PERSON,
      WEBSITE,
      {
        "@type": "ProfilePage",
        "@id": ID.profile,
        url: SITE_INFO.url,
        name: SITE_INFO.title,
        isPartOf: { "@id": ID.website },
        mainEntity: { "@id": ID.person },
        dateCreated: "2024-01-01T00:00:00+00:00",
        dateModified: modified,
        inLanguage: "en",
      },
    ],
  };
}

/** Inline JSON-LD safely: "</script>" inside a title can't end the tag early. */
export const jsonLd = (value: unknown) => ({ __html: JSON.stringify(value).replace(/</g, "\\u003c") });
