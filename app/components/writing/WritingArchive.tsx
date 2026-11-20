"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import HighlightList from "./HighlightList";

/** One archive row, already formatted on the server. */
export type ArchiveRow = {
  id: string;
  /** null for a listed-only note: its title and date, not a link. */
  href: string | null;
  title: React.ReactNode;
  dek: string;
  date: string;
  dateTime: string;
  year: string;
  tag: string | null;
  minutes: number;
  media: React.ReactNode;
};

/*
 * The chosen year lives in the URL (?year=2025), so a filtered archive can be
 * linked to and survives Back. Read after hydration (the server renders All).
 */
const YEAR_EVENT = "writing:year";
const readYear = () => new URLSearchParams(window.location.search).get("year");
const subscribeYear = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  window.addEventListener(YEAR_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(YEAR_EVENT, listener);
  };
};
const writeYear = (year: string | null) => {
  const url = new URL(window.location.href);
  if (year) url.searchParams.set("year", year);
  else url.searchParams.delete("year");
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(YEAR_EVENT));
};

/*
 * The archive: every post after the latest few, one row each (date, title and
 * standfirst, tag), with the home page's travelling highlight. Once there is
 * more than one year, a year filter sits above it in the home page's own tab
 * style: one glass pill that travels to the chosen year.
 */
export default function WritingArchive({ rows, start = 0 }: { rows: ArchiveRow[]; start?: number }) {
  const years = [...new Set(rows.map((r) => r.year))];
  const asked = useSyncExternalStore(subscribeYear, readYear, () => null);
  // A year in the URL that has no posts falls back to All.
  const year = asked && years.includes(asked) ? asked : null;
  const id = useId();
  const shown = year ? rows.filter((r) => r.year === year) : rows;

  return (
    <section className="wi-archive" aria-labelledby={`${id}-title`}>
      <div className="wi-archive-head panel-chunk" style={{ "--i": start } as React.CSSProperties}>
        <h2 id={`${id}-title`} className="wi-section-title">
          Archive
        </h2>
        {years.length > 1 ? <YearTabs years={years} year={year} onChange={writeYear} /> : null}
      </div>

      <HighlightList className="wi-rows" start={start + 1}>
        {shown.map((row) => {
          const body = (
            <>
              <time className="wi-row-date" dateTime={row.dateTime}>
                {row.date}
              </time>
              <span className="wi-row-main">
                <h3 className="wi-row-title">{row.title}</h3>
                {row.dek ? <span className="wi-row-dek">{row.dek}</span> : null}
                <span className="wi-row-meta">
                  {row.tag ? <span>{row.tag}</span> : null}
                  {row.href ? <span>{row.minutes} min read</span> : <span>Note</span>}
                </span>
              </span>
              {row.media ? <span className="wi-row-media">{row.media}</span> : null}
            </>
          );
          return row.href ? (
            <Link key={row.id} href={row.href} className="wi-row">
              {body}
            </Link>
          ) : (
            <span key={row.id} className="wi-row wi-row-note">
              {body}
            </span>
          );
        })}
      </HighlightList>
    </section>
  );
}

/*
 * The year filter, as the home page's tabs: labels over one glass pill
 * (.tab-rail) whose position and size are measured from the chosen label.
 * Placed without a transition the first time, so it doesn't fly in.
 */
function YearTabs({
  years,
  year,
  onChange,
}: {
  years: string[];
  year: string | null;
  onChange: (year: string | null) => void;
}) {
  const options = [null, ...years];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const rail = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const el = refs.current[options.indexOf(year)];
    const pill = rail.current;
    if (!el || !pill) return;
    if (!placed.current) pill.style.transition = "none";
    pill.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.height = `${el.offsetHeight}px`;
    if (!placed.current) {
      void pill.offsetHeight;
      pill.style.transition = "";
      placed.current = true;
    }
    // options is derived from years; year is what moves the pill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, years.join()]);

  return (
    <div className="wi-years" role="group" aria-label="Filter by year">
      <span ref={rail} aria-hidden="true" className="tab-rail absolute left-0 top-0 rounded-[99px]" />
      {options.map((y, i) => (
        <button
          key={y ?? "all"}
          ref={(node) => {
            refs.current[i] = node;
          }}
          type="button"
          className="wi-year tab-hit"
          data-keycap=""
          aria-pressed={year === y}
          onClick={() => onChange(y)}
        >
          {y ?? "All"}
        </button>
      ))}
    </div>
  );
}
