import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import LazyToaster from "../components/LazyToaster";
import { SoundEffects } from "../components/ui/sound";
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
import "./admin-workspace.css";

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
  title: "Writing · Admin",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="admin-body">
        <SoundEffects>
          {children}
          <LazyToaster />
        </SoundEffects>
      </body>
    </html>
  );
}
