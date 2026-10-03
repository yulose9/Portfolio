import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import LazyToaster from "../components/LazyToaster";
import { SoundEffects } from "../components/ui/sound";
import { ThemeSync } from "../components/ui/theme";
import { TitleTooltips } from "../components/ui/title-tooltips";
import { THEME_PAPER, THEME_SCRIPT } from "../lib/theme";
import "./kumo.generated.css";
import "../globals.css";
import "../kit-inputs.css";
import "../kit.css";
import "../kit-components.css";
import "../article.css";
import "../article-blocks.css";
import "../article-extras.css";
import "../article-blocks-2.css";
import "../writing-extras.css";
import "./admin.css";
import "./admin-editor.css";
import "./admin-modes.css";
import "./admin-preview.css";
import "react-day-picker/style.css";
import "./admin-bulk.css";
import "./admin-research.css";
import "./admin-controls.css";
import "./admin-code.css";
import "./admin-blocks.css";
import "./admin-icons.css";
import "./admin-workspace.css";
import "./admin-alt.css";
import "./control-center.css";
import "../projects.css";

/*
 * The admin's own root layout, separate from the site's on purpose.
 *
 * The site layout loads six analytics vendors, Clarity session replay among
 * them, plus the multiplayer cursors. None of that may run here: a replay of
 * this page is a recording of unpublished drafts. So nothing from that layout
 * is inherited — only the fonts, the shared styles and the toasts.
 */

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Workspace · Admin",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_PAPER.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_PAPER.dark },
  ],
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // The pre-paint script sets data-theme on <html> before hydration.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="admin-body">
        <ThemeSync />
        <TitleTooltips />
        <SoundEffects>
          {children}
          <LazyToaster />
        </SoundEffects>
      </body>
    </html>
  );
}
