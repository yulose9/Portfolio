import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import VendorScripts from "./analytics/VendorScripts";
import {
  ENHANCED_METADATA,
  PERSON_SCHEMA,
  PROFILE_PAGE_SCHEMA,
  WEBSITE_SCHEMA,
} from "./constants/seo";
import DeferredAnalytics from "./providers/DeferredAnalytics";
import UiSounds from "./components/UiSounds";
import PeerCursors from "./components/PeerCursors";
import SmoothCursor from "./components/SmoothCursor";
import SmoothScroll from "./providers/SmoothScroll";
import "./globals.css";

/*
 * Inter, self-hosted by next/font at build time — no runtime request to
 * Google, no layout shift, and no new dependency.
 *
 * It replaces the SF Pro system stack for a practical reason: SF Pro only
 * ever appeared on Apple devices. Everywhere else the stack fell through to
 * Segoe UI or Helvetica, which carry different proportions and metrics from
 * the ones the design was drawn against. Inter renders the same everywhere,
 * and it is what the Figma frame specifies.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Paint under the notch and the home indicator. This is what lets Safari and
  // Chrome collapse their chrome; .page-shell insets the content back out via
  // env(safe-area-inset-*) so nothing lands underneath them.
  viewportFit: "cover",
  // Matching the page background removes the seam between chrome and content.
  themeColor: "#ffffff",
  // No maximumScale / userScalable lock — user zoom stays available (WCAG 1.4.4).
};

/*
 * The full metadata set — Open Graph, Twitter cards, canonical, robots and
 * icons — lives in app/constants/seo.ts so the schemas below and the tags here
 * cannot drift apart.
 */
export const metadata: Metadata = {
  ...ENHANCED_METADATA,
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/*
          JSON-LD. Search engines read these for the knowledge panel; they are
          inert markup, so they sit in the head with no loading strategy.
        */}
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(PROFILE_PAGE_SCHEMA),
          }}
        />
      </head>
      <body>
        {children}

        {/*
          Analytics load after the content, and every vendor script is
          lazyOnload, so none of this competes with first paint.

          PostHog comes in separately and later still: DeferredAnalytics waits
          1.5s and does nothing at all unless NEXT_PUBLIC_POSTHOG_KEY is set.
        */}
        {/* Both desktop-pointer only, and both no-ops under reduced motion. */}
        <SmoothScroll />
        <SmoothCursor />
        <PeerCursors />
        <UiSounds />

        <VendorScripts />
        <DeferredAnalytics />
      </body>
    </html>
  );
}
