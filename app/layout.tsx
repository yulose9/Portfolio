import { SmoothScrolling } from "@/app/providers";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ImagePreloader } from "./components/shared";
import {
  ENHANCED_METADATA,
  PERSON_SCHEMA,
  PROFILE_PAGE_SCHEMA,
  WEBSITE_SCHEMA,
} from "./constants/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Viewport configuration (separate from metadata in Next.js 14+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow user scaling for accessibility (WCAG 1.4.4)
};

// Enhanced SEO metadata
export const metadata: Metadata = {
  ...ENHANCED_METADATA,
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(PROFILE_PAGE_SCHEMA),
          }}
        />
        {/* Microsoft Clarity */}
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "uehtex8zqz");
            `,
          }}
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

        {/* Cloudflare Web Analytics */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "e48b484435ef4fb0a307689022769282"}'
        />

        {/* Google Tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-8SLDNR1QTT"
        />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-8SLDNR1QTT');
          `}
        </Script>
      </body>
    </html>
  );
}
