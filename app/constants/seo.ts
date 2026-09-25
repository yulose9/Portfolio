/**
 * SEO Configuration & Structured Data
 * Centralized SEO meta tags and Schema.org markup
 */

import { Metadata } from "next";

// Basic site information
export const SITE_INFO = {
  name: "John Nazarene Dela Pisa",
  // The browser tab, and the headline of link previews and search results.
  title: "John Nazarene, AI Specialist",
  description:
    "AI Specialist and Computer Engineer in the Philippines, building products where AI meets infrastructure: agentic systems and the platforms they run on.", // 151 chars (optimal: 110-160)
  url: "https://www.nazarene.dev",
  author: "John Nazarene Dela Pisa",
  keywords: [
    "Full Stack Developer",
    "Cloud Engineer",
    "AWS Solutions Architect",
    "React Developer",
    "Next.js",
    "TypeScript",
    "Portfolio",
    "Web Development",
    "Cloud Computing",
    "Software Engineer",
  ],
};

// Social media links
export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/jannazarene", // Update with actual
  github: "https://github.com/yulose9", // Update with actual
  email: "mailto:jannazarene09@gmail.com", // Update with actual
  twitter: "https://twitter.com/xcszan", // Update with actual (if available)
};

// Open Graph metadata
// OG Image Best Practices:
// - Facebook, LinkedIn, Discord: 1200x630px (1.91:1 ratio)
// - Twitter: 1200x600px or 1200x675px
// - WhatsApp, Telegram, iMessage, Messenger: Use 1200x630px (works universally)
// These images are called "Open Graph Images" or "Social Share Images" or "Link Preview Images"
export const OG_METADATA = {
  type: "website" as const,
  locale: "en_US",
  siteName: SITE_INFO.name,
  images: [
    {
      url: `${SITE_INFO.url}/images/other/heyyo.png`, // Must be absolute URL for social platforms
      width: 1200,
      height: 630,
      alt: `${SITE_INFO.name} - Full Stack Developer Portfolio`,
      type: "image/png",
    },
  ],
};

// Twitter Card metadata
export const TWITTER_METADATA = {
  card: "summary_large_image" as const,
  site: "@xcszan", // Update with actual handle
  creator: "@xcszan", // Update with actual handle
};

// Enhanced metadata for Next.js
export const ENHANCED_METADATA: Metadata = {
  title: {
    default: SITE_INFO.title,
    template: `%s | ${SITE_INFO.name}`,
  },
  description: SITE_INFO.description,
  keywords: SITE_INFO.keywords,
  authors: [{ name: SITE_INFO.author }],
  creator: SITE_INFO.author,
  publisher: SITE_INFO.author,
  metadataBase: new URL(SITE_INFO.url),
  alternates: {
    canonical: "/",
  },
  other: {
    "twitter:domain": "nazarene.dev",
    "article:published_time": "2024-01-01T00:00:00.000Z",
    "article:modified_time": new Date().toISOString(),
    "pinterest-rich-pin": "true",
  },
  // No `icons` here: Next.js emits the tags from the files themselves —
  // app/favicon.ico (16/32/48 in one file) and app/apple-icon.png (180px).
  // A hand-written list duplicated them and pointed at a file that is gone.
  openGraph: {
    ...OG_METADATA,
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    url: SITE_INFO.url,
  },
  facebook: {
    appId: "729817763494664", // Get this from https://developers.facebook.com/
  },
  twitter: {
    ...TWITTER_METADATA,
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    images: OG_METADATA.images,
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

// Schema.org Person structured data
export const PERSON_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_INFO.name,
  url: SITE_INFO.url,
  jobTitle: "AI Specialist",
  description: SITE_INFO.description,
  sameAs: [
    SOCIAL_LINKS.linkedin,
    SOCIAL_LINKS.github,
    // Add other social profiles
  ],
  worksFor: {
    "@type": "Organization",
    name: "FEAREX Technologies",
  },
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "Technological University of the Philippines - Manila", // Update with actual
  },
  knowsAbout: [
    "Web Development",
    "Cloud Computing",
    "AWS",
    "React",
    "Next.js",
    "TypeScript",
    "Software Architecture",
  ],
};

// Schema.org Website structured data
export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_INFO.name,
  url: SITE_INFO.url,
  description: SITE_INFO.description,
  author: {
    "@type": "Person",
    name: SITE_INFO.author,
  },
  inLanguage: "en-US",
};

// Schema.org ProfilePage structured data
export const PROFILE_PAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: PERSON_SCHEMA,
  dateCreated: "2024-01-01T00:00:00+00:00",
  dateModified: new Date().toISOString(),
  inLanguage: "en-US",
};

// Helper function to generate project CreativeWork schema
export function generateProjectSchema(project: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    author: {
      "@type": "Person",
      name: SITE_INFO.author,
    },
    ...(project.url && { url: project.url }),
    ...(project.image && { image: project.image }),
    ...(project.datePublished && { datePublished: project.datePublished }),
  };
}

// Helper function to generate blog post Article schema
export function generateBlogSchema(blog: {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    author: {
      "@type": "Person",
      name: SITE_INFO.author,
    },
    ...(blog.description && { description: blog.description }),
    ...(blog.url && { url: blog.url }),
    ...(blog.image && { image: blog.image }),
    ...(blog.datePublished && { datePublished: blog.datePublished }),
    ...(blog.dateModified && { dateModified: blog.dateModified }),
    publisher: {
      "@type": "Person",
      name: SITE_INFO.author,
    },
  };
}
