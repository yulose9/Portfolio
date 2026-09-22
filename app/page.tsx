import LastUpdated from "./components/LastUpdated";
import LocalTime from "./components/LocalTime";
import TabbedIndex from "./components/TabbedIndex";
import { buildTimeCommit } from "./last-commit";
import { PROFILE, TABS } from "./site-content";

export default async function Page() {
  return (
    <div className="flex w-full justify-center bg-white">
      {/*
        The design pins the text column to 672px and centres it. min-w is left
        off deliberately — the Figma frame is desktop-only, and a 512px floor
        would force a horizontal scrollbar on every phone.
      */}
      <main className="page-shell page-enter w-full max-w-[672px] py-16 sm:py-24">
        <div className="pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/*
            48px on phones, 32px from 640px up. The portrait has to hold its own
            against a full-width column on a small screen, where 32px reads as an
            afterthought; on desktop the same 32px sits correctly against the
            16px name beside it. The source is 128px, so 48px still has nearly
            3x the pixels it needs on a retina display.
          */}
          <img
            src={PROFILE.avatar}
            alt={PROFILE.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover sm:h-8 sm:w-8"
          />
        </div>

        <div className="flex flex-col items-start gap-12">
          <header className="flex flex-col items-start gap-1">
            <h1 className="m-0 text-balance text-base font-medium leading-6 text-black">
              {PROFILE.name}
            </h1>
            <p className="m-0 text-base font-normal leading-6 text-black">
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
          </header>

          <TabbedIndex tabs={TABS} />
        </div>

        {/*
          Two facts, one line: when the site last changed, and what time it is
          where I am. flex-wrap lets them stack rather than collide once the
          column gets narrow.
        */}
        <footer className="footer-gap mt-24 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <LocalTime />
          {/* Read during the build; refreshed from GitHub on the client. */}
          <LastUpdated initial={await buildTimeCommit()} />
        </footer>
      </main>
    </div>
  );
}
