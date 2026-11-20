"use client";

import {
  ArrowRight,
  HandTap,
  ArrowUpRight,
  BookOpenText,
  CalendarBlank,
  ClockCounterClockwise,
  EnvelopeSimple,
  GithubLogo,
  Globe,
  Stack,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { haptic } from "../../lib/haptics";
import { CopyButton } from "../kit/inputs/copy-button";

export type ShowcaseProject = {
  /** The URL slug; also the project's key in the ring and in ?project=. */
  slug: string;
  title: string;
  role: string;
  /** Long form, for the project panel. */
  timeframe: string;
  /** Short form, for the home list: just the year(s). */
  years: string;
  dek: string;
  tools: string[];
  links: { label: string; href: string }[];
  href: string;
  /** The live app or website itself, when there is one. */
  site: string | null;
  /** What the site is called on the Preview chip ("app", "site"). */
  siteNoun?: string;
  /** The site's own icon when it has one; otherwise a case-study glyph. */
  icon: string | null;
  screens: { src: string; alt: string }[];
};

export type ShowcaseProfile = {
  name: string;
  role: string;
  email: string;
  avatar: string;
  place: string;
  timeZone: string;
};

/** A project's icon: its own favicon, or a case-study glyph when it has none. */
export function ProjectIcon({ project, size }: { project: ShowcaseProject; size: number }) {
  return project.icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="showcase-icon" src={project.icon} alt="" width={size} height={size} />
  ) : (
    <span className="showcase-icon showcase-icon-glyph" style={{ width: size, height: size }}>
      <BookOpenText size={Math.round(size * 0.55)} weight="light" aria-hidden="true" />
    </span>
  );
}

/** The glyph for a link, from what it points at. */
function linkGlyph(label: string, href: string) {
  if (/changelog|release/i.test(label)) return ClockCounterClockwise;
  if (/github\.com/i.test(href)) return GithubLogo;
  return Globe;
}

export function ProjectPanel({
  project,
  onTry,
  trying = false,
}: {
  project: ShowcaseProject;
  /** Turns the centred screen into its live demo, when the project has one. */
  onTry?: () => void;
  trying?: boolean;
}) {
  return (
    <>
      {project.site ? (
        // The app's icon opens the app itself.
        <a
          className="showcase-icon-link"
          href={project.site}
          {...(project.site.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
          aria-label={`Open ${project.title}`}
          onClick={haptic}
        >
          <ProjectIcon project={project} size={40} />
        </a>
      ) : (
        <ProjectIcon project={project} size={40} />
      )}
      <hgroup className="showcase-heading">
        <h1 className="showcase-title" translate="no">
          {project.title}
        </h1>
        <p className="showcase-role">{project.role}</p>
      </hgroup>
      <p className="showcase-body">{project.dek}</p>

      <ul className="showcase-facts">
        {project.timeframe ? (
          <li>
            <CalendarBlank size={16} weight="light" aria-hidden="true" />
            <span>{project.timeframe}</span>
          </li>
        ) : null}
        {project.tools.length ? (
          <li>
            <Stack size={16} weight="light" aria-hidden="true" />
            <span translate="no">{project.tools.join(", ")}</span>
          </li>
        ) : null}
      </ul>

      <ul className="showcase-links">
        {onTry ? (
          <li>
            <button type="button" className="showcase-try" onClick={onTry} aria-pressed={trying}>
              <HandTap size={18} weight="light" aria-hidden="true" />
              <span>Try a preview on the screen</span>
            </button>
          </li>
        ) : null}
        <li>
          <Link href={project.href} data-sound="click">
            <BookOpenText size={18} weight="light" aria-hidden="true" />
            <span>Read the case study</span>
          </Link>
        </li>
        {project.links.map((link) => {
          const Glyph = linkGlyph(link.label, link.href);
          return (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer" onClick={haptic}>
                <Glyph size={18} weight="light" aria-hidden="true" />
                <span>
                  {link.label}
                  <ArrowUpRight className="showcase-link-trail" size={14} aria-hidden="true" />
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Minutes east of UTC for a time zone, from Intl (no string parsing of dates). */
function zoneOffset(timeZone: string, at: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/**
 * Live local time where I am, and how far that is from the visitor's. Only
 * after mount: the server cannot know the visitor's zone, and rendering a
 * clock there would mismatch on hydration.
 */
function useLocalTime(timeZone: string) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!now) return null;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  const minutes = zoneOffset(timeZone, now) + now.getTimezoneOffset();
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const span = m ? `${h}h ${m}m` : `${h}h`;
  const gap = minutes === 0 ? "Same time as you" : `${span} ${minutes > 0 ? "ahead of" : "behind"} you`;
  return { time, gap };
}

export function HomePanel({
  profile,
  projects,
  onPreview,
  onChoose,
}: {
  profile: ShowcaseProfile;
  projects: ShowcaseProject[];
  onPreview: (slug: string | null) => void;
  onChoose: (slug: string) => void;
}) {
  const clock = useLocalTime(profile.timeZone);
  return (
    <>
      <article className="showcase-id" style={{ viewTransitionName: "showcase-ticket" } as React.CSSProperties}>
        <div className="showcase-id-top">
        <h1 className="showcase-id-lede">Things I’ve built.</h1>
        <p className="showcase-id-who">
          <strong translate="no">{profile.name}</strong>
          <span className="showcase-id-role">{profile.role}</span>
          <span className="showcase-id-clock">
            {clock ? (
              <>
                <time>{clock.time}</time> in {profile.place}
                <br />
                {clock.gap}
              </>
            ) : (
              <>
                {profile.place}
                <br />
                &nbsp;
              </>
            )}
          </span>
        </p>
        </div>
        <footer className="showcase-id-foot">
          <a className="showcase-id-mail" href={`mailto:${profile.email}`} onClick={haptic}>
            <span className="showcase-id-mail-label">
              Email <EnvelopeSimple size={15} aria-hidden="true" />
            </span>
            <span className="showcase-id-mail-address" translate="no">
              {profile.email}
            </span>
          </a>
          <CopyButton
            className="showcase-id-copy"
            value={profile.email}
            label="Copy email address"
            copiedLabel="Copied email address"
            timeout={1600}
            onClick={haptic}
          >
            <span className="showcase-id-copy-text">Copy</span>
          </CopyButton>
        </footer>
      </article>

      {projects.length ? (
        <ul className="showcase-list" onPointerLeave={() => onPreview(null)}>
          {projects.map((project) => (
            <li key={project.slug}>
              <button
                type="button"
                className="showcase-row"
                // The visible spans would run together in the computed name
                // ("PinaSweldo2024 — 2026Designer…"); say it as a sentence.
                aria-label={[project.title, project.years, project.role].filter(Boolean).join(", ")}
                onPointerEnter={() => onPreview(project.slug)}
                onFocus={() => onPreview(project.slug)}
                onBlur={() => onPreview(null)}
                onClick={() => onChoose(project.slug)}
              >
                <ProjectIcon project={project} size={28} />
                <span className="showcase-row-text">
                  <span className="showcase-row-title">
                    <span className="showcase-row-name" translate="no">
                      {project.title}
                    </span>
                    <span className="showcase-row-years">{project.years}</span>
                  </span>
                  <span className="showcase-row-role">{project.role}</span>
                </span>
                <ArrowRight className="showcase-row-trail" size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="showcase-empty">Case studies are on the way.</p>
      )}
    </>
  );
}
