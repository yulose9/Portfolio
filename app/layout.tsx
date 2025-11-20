import { SmoothScrolling } from "@/app/providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ImagePreloader } from "./components/shared";
import { ENHANCED_METADATA, PERSON_SCHEMA, PROFILE_PAGE_SCHEMA, WEBSITE_SCHEMA } from "./constants/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Enhanced SEO metadata
export const metadata: Metadata = {
  ...ENHANCED_METADATA,
  // PWA Configuration
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EBE0" },
    { media: "(prefers-color-scheme: dark)", color: "#657A62" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "John Nazarene",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data - JSON-LD */}
        <Script
          id="schema-person"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_SCHEMA) }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
        <Script
          id="schema-profile"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PROFILE_PAGE_SCHEMA) }}
        />

        {/* Theme color for browser chrome */}
        <meta
          name="theme-color"
          content="#F5EBE0"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#657A62"
          media="(prefers-color-scheme: dark)"
        />

        {/* Apple iOS Safari specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Android Chrome specific */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {/* Skip to Main Content - Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <ImagePreloader />
        <SmoothScrolling>{children}</SmoothScrolling>
      </body>
    </html>
  );
}
