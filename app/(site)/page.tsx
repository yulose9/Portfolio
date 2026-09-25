import AvatarZoom from "../components/AvatarZoom";
import PageMenu from "../components/menu/PageMenu";
import LastUpdated from "../components/LastUpdated";
import LocalTime from "../components/LocalTime";
import TabbedIndex from "../components/TabbedIndex";
import { buildTimeCommit } from "../last-commit";
import ToolRow from "../components/ToolRow";
import type { Metadata } from "next";

import { FEED, homeGraph, jsonLd } from "../constants/seo";
import { publishedPosts } from "../lib/writing";
import { PROFILE, TABS, TOOLS, type Tab } from "../site-content";

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
      <div className="flex w-full justify-center bg-white">
      {/*
        The design pins the text column to 672px and centres it. min-w is left
        off deliberately — the Figma frame is desktop-only, and a 512px floor
        would force a horizontal scrollbar on every phone.
      */}
      <main
        // Cursor positions are normalised against this element, so a peer
        // lands on the same word regardless of their viewport width.
        data-cursor-frame
        className="page-shell page-enter w-full max-w-[672px] py-16 sm:py-24"
      >
        <div className="pb-8">
          <AvatarZoom alt={PROFILE.name} />
        </div>

        <div className="flex flex-col items-start gap-12">
          <header className="flex flex-col items-start gap-1">
            {/* data-cursor="text": the I-beam over the name and role line. The
                company link inside still gets the hand; links are checked first. */}
            <h1
              data-cursor="text"
              className="m-0 text-balance text-base font-medium leading-6 text-black"
            >
              {PROFILE.name}
            </h1>
            <p data-cursor="text" className="m-0 text-base font-normal leading-6 text-black">
              {PROFILE.rolePrefix}{" "}
              <a
                href={PROFILE.employerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-black underline"
              >
                {PROFILE.employer}
              </a>
            </p>
            <ToolRow tools={TOOLS} />
          </header>

          <TabbedIndex tabs={withWriting(TABS)} />
        </div>

        {/*
          Two facts, one line: when the site last changed, and what time it is
          where I am. flex-wrap lets them stack rather than collide once the
          column gets narrow.
        */}
        <footer className="footer-gap mt-24 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <LocalTime />
          {/* Read during the build; refreshed from GitHub on the client. */}
          <LastUpdated initial={commit} />
        </footer>
      </main>
      </div>
    </PageMenu>
  );
}
