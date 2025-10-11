import "lenis/dist/lenis.css";
import { title } from "process";
import { ImagePreloader } from "./components/shared";
import "./globals.css";
import { SmoothScrolling } from "./providers";

export const metadata = {
  title: "John Nazarene",
  description: "Generated manually in existing folder",
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
        <ImagePreloader />
        <SmoothScrolling>{children}</SmoothScrolling>
      </body>
    </html>
  );
}
