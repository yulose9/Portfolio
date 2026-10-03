import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import VendorScripts from "../analytics/VendorScripts";
import AnalyticsPrivacy from "../components/AnalyticsPrivacy";
import { ENHANCED_METADATA } from "../constants/seo";
import DeferredAnalytics from "../providers/DeferredAnalytics";
import { SoundEffects } from "../components/ui/sound";
import { ThemeSync } from "../components/ui/theme";
import { TitleTooltips } from "../components/ui/title-tooltips";
import { THEME_PAPER, THEME_SCRIPT } from "../lib/theme";
import LazyToaster from "../components/LazyToaster";
import PeerCursors from "../components/PeerCursors";
import SmoothCursor from "../components/SmoothCursor";
import WebMcpTools from "../components/WebMcpTools";
import SmoothScroll from "../providers/SmoothScroll";
import "../globals.css";
import "../kit-inputs.css";
import "../kit.css";
import "../kit-components.css";
import "../article.css";
// article-blocks.css and article-blocks-2.css (the body's blocks: tables,
// callouts, charts, polls, video, embeds) load from writing/layout.tsx and
// projects/layout.tsx, so the home page doesn't block on 58 KB it never uses.
import "../article-extras.css";
import "../writing-extras.css";
import "../projects.css";

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
  // One per OS scheme; app/lib/theme.ts corrects both once a choice is known.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_PAPER.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_PAPER.dark },
  ],
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
    // suppressHydrationWarning: the pre-paint script sets data-theme and the
    // colour scheme on <html> before React hydrates.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <TitleTooltips />
        <SoundEffects>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          {children}
          <WebMcpTools />

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
          <LazyToaster />
        </SoundEffects>

        <VendorScripts />
        <DeferredAnalytics />
        <AnalyticsPrivacy />
      </body>
    </html>
  );
}
