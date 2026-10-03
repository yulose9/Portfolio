import PortfolioContent from "../components/PortfolioContent";
import { publishedWebsite } from "../../cms/website";
import PageMenu from "../components/menu/PageMenu";
import LastUpdated from "../components/LastUpdated";
import LocalTime from "../components/LocalTime";

import { buildTimeCommit } from "../last-commit";

import { SoundToggle } from "../components/ui/sound";
import { ThemeToggle } from "../components/ui/theme";
import type { Metadata } from "next";

import { FEED, homeGraph, jsonLd } from "../constants/seo";
import { publishedPosts } from "../lib/writing";
import { publishedProjects } from "../lib/projects";
import { TABS, type Tab } from "../site-content";

// The calendar day in Manila, which is the day the post says it went out.
const manilaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });

/**
 * The Writing tab lists what's published in content/writing. A post with a
 * page links to it; a listed-only note is its title and date and nothing to
 * click.
 */
function withWriting(tabs: Tab[]): Tab[] {
  const posts = publishedPosts();
  return tabs.map((tab) =>
    tab.id === "writing"
      ? {
          ...tab,
          posts: posts.map((p) => ({
            title: p.title,
            date: manilaDay.format(new Date(p.publishedAt)),
            href: p.page ? `/writing/${p.slug}` : undefined,
          })),
        }
      : tab.id === "projects" && publishedProjects().some(p => !p.parentId)
        ? { ...tab, items: publishedProjects().filter(p => !p.parentId && p.project?.featured).map(p => ({ title: p.title, year: p.project?.timeframe ?? "", href: `/projects/${p.slug}`, image: p.cover?.src })), links: [{ label: "All projects", href: "/projects" }] }
        : tab
  );
}

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { ...FEED, "text/markdown": [{ url: "/llms.txt", title: "Markdown" }] } },
};

export default async function Page() {
  const commit = await buildTimeCommit();
  return (
    <PageMenu>
      {/*
        JSON-LD as a plain script, so it's in the HTML crawlers download. (A
        next/script tag only arrives through JavaScript, which AI crawlers
        don't run.)
      */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(homeGraph(commit?.date ?? new Date().toISOString()))} />
      <div className="flex w-full justify-center bg-[color:var(--paper)]">
      {/*
        The design pins the text column to 672px and centres it. min-w is left
        off deliberately — the Figma frame is desktop-only, and a 512px floor
        would force a horizontal scrollbar on every phone.
      */}
      <main id="main" tabIndex={-1}
        // Cursor positions are normalised against this element, so a peer
        // lands on the same word regardless of their viewport width.
        data-cursor-frame
        className="page-shell page-enter w-full max-w-[672px] py-16 sm:py-24"
      >
        <PortfolioContent content={{ ...publishedWebsite, tabs: withWriting(TABS) }} />

        {/*
          Two facts, one line: when the site last changed, and what time it is
          where I am. flex-wrap lets them stack rather than collide once the
          column gets narrow.
        */}
        <footer className="footer-gap mt-24 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <LocalTime />
          <div className="flex items-center gap-2">
            {/* Read during the build; refreshed from GitHub on the client. */}
            <LastUpdated initial={commit} />
            {/* The page's two switches, sound and theme: with the other facts about the page. */}
            <SoundToggle className="-my-1 self-center" />
            <ThemeToggle className="-my-1 -ml-1 -mr-1.5 self-center" />
          </div>
        </footer>
      </main>
      </div>
    </PageMenu>
  );
}
