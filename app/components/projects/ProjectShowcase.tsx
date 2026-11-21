"use client";

import { ArrowUpLeft, ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { haptic } from "../../lib/haptics";
import AnalyticsPrivacy from "../AnalyticsPrivacy";
import { ThemeToggle } from "../ui/theme";
import {
  HomePanel,
  ProjectPanel,
  type ShowcaseProfile,
  type ShowcaseProject,
} from "./ShowcasePanels";
import { useRing, type RingSlot } from "./useRing";
import PhoneDemo from "./demos/PhoneDemo";
import PinaSweldoDemo from "./demos/PinaSweldoDemo";
import PortfolioDemo, { type PortfolioDemoData } from "./demos/PortfolioDemo";

export type { ShowcaseProfile, ShowcaseProject } from "./ShowcasePanels";

/** Cards around the ring, at least: the assets repeat until it is this full. */
const MIN_SLOTS = 14;
/** How long each home photo shows before the next dissolves in, in ms. */
const PHOTO_EVERY = 3000;

/*
 * Which project is showing lives in the URL (?project=<slug>), not in React
 * state: a project view can be shared and bookmarked, and Back returns from it.
 * Choosing a project pushes a history entry; turning the ring only replaces
 * the current one, so browsing doesn't fill the history with every card.
 */
const URL_EVENT = "showcase:project";
const readProject = () =>
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("project");
const subscribeProject = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
};
/*
 * Crossing between home and a project morphs the ticket into the badge in
 * the breadcrumb bar (and back): one element, its box sliding and squashing
 * between the two places, as on derolez.dev's "For hire". The View
 * Transitions API does the morph from a shared view-transition-name; the
 * update runs inside it, flushed synchronously so the browser captures the
 * new state. Only the ticket animates (html.showcase-vt turns off the
 * page-wide crossfade), so the ring stays live under it. No support, or
 * reduced motion: the swap is instant.
 */
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};
function writeProject(slug: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("project", slug);
  else url.searchParams.delete("project");
  if (url.href === window.location.href) return;
  const commit = () => {
    window.history[mode === "push" ? "pushState" : "replaceState"](window.history.state, "", url);
    window.dispatchEvent(new Event(URL_EVENT));
  };
  const crossing = (readProject() === null) !== (slug === null);
  const doc = document as ViewTransitionDocument;
  if (!crossing || !doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commit();
    return;
  }
  const root = document.documentElement;
  root.classList.add("showcase-vt");
  doc
    .startViewTransition(() => flushSync(commit))
    .finished.finally(() => root.classList.remove("showcase-vt"));
}

/*
 * The projects index: a panel of words beside a ring of screens.
 *
 * The avatar card is home (who I am and every project, as a list); a
 * project's screens are that project. Turning the ring (wheel, drag, keys, a
 * click on a side card) takes the panel with it. Hovering a project in the
 * home list only previews it, turning the ring to its screens while the list
 * stays; clicking it chooses it. The ring itself is useRing; the panels are
 * ShowcasePanels; this file only composes them around the URL.
 */
export default function ProjectShowcase({
  projects,
  profile,
  portfolioDemo,
}: {
  projects: ShowcaseProject[];
  profile: ShowcaseProfile;
  portfolioDemo: PortfolioDemoData;
}) {
  /*
   * Live screens: the centred screen of a project with a demo can be turned
   * into a working miniature of its signature UI (click it, or "Try it" in
   * the panel). Turning the ring, Esc, or choosing elsewhere puts the
   * screenshot back.
   */
  const demoFor = (slug: string | null) => {
    const project = projects.find((p) => p.slug === slug);
    if (slug === "pinasweldo") return <PinaSweldoDemo icon={project?.icon ?? null} />;
    if (slug === "this-portfolio-redesigned") return <PortfolioDemo data={portfolioDemo} />;
    return null;
  };
  const [live, setLive] = useState<number | null>(null);

  /*
   * The home card's photos. A click on the centred card, or every few
   * seconds on its own, dissolves to another one at random, never the one
   * just shown. It holds still while the pointer is on the ring (someone is
   * looking or dragging), while the tab is hidden, and always under reduced
   * motion, where a click still changes it.
   */
  const photos = profile.photos;
  const [photo, setPhoto] = useState(0);
  const holdPhotos = useRef(false);
  /*
   * A shuffle bag, so the order is random but nothing comes back too soon:
   * each round deals every photo once, in a fresh random order, before any
   * repeats. A new round never opens with a photo from the end of the last
   * one (the most recent half of the photos), so a photo is never seen again
   * within the next couple of changes. Kept in refs and decided outside
   * React's state updater, which may run twice.
   */
  const bag = useRef<number[]>([]);
  const recent = useRef<number[]>([0]);
  const nextPhoto = useCallback(() => {
    const n = photos.length;
    if (n < 2) return;
    if (!bag.current.length) {
      // The round opens with photos not seen recently (picked at random from
      // those), then the rest follow in random order; built, not retried, so
      // the guarantee always holds.
      const keepAway = Math.max(1, Math.floor(n / 2));
      const avoid = new Set(recent.current.slice(-keepAway));
      const shuffle = (list: number[]) => {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
      };
      const all = Array.from({ length: n }, (_, i) => i);
      const opening = shuffle(all.filter((i) => !avoid.has(i))).slice(0, keepAway);
      const rest = shuffle(all.filter((i) => !opening.includes(i)));
      bag.current = [...opening, ...rest];
    }
    const next = bag.current.shift()!;
    recent.current = [...recent.current, next].slice(-n);
    setPhoto(next);
  }, [photos.length]);
  useEffect(() => {
    if (photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!holdPhotos.current && document.visibilityState === "visible") nextPhoto();
    }, PHOTO_EVERY);
    return () => clearInterval(id);
  }, [photos.length, nextPhoto]);
  // Opened from the panel's button (a keyboard path): take focus into the demo.
  const [focusDemo, setFocusDemo] = useState(false);
  const slots = useMemo<RingSlot[]>(() => {
    const assets: RingSlot[] = [
      { project: null, src: profile.avatar },
      ...projects.flatMap((p) => p.screens.map((s) => ({ project: p.slug, src: s.src }))),
    ];
    if (assets.length < 2) return assets;
    const ring: RingSlot[] = [];
    while (ring.length < MIN_SLOTS || ring.length % assets.length) ring.push(assets[ring.length % assets.length]);
    return ring;
  }, [projects, profile]);

  const requested = useSyncExternalStore(subscribeProject, readProject, () => null);
  const current = projects.find((p) => p.slug === requested) ?? null;
  const view = current?.slug ?? null;

  const { stageRef, cardRef, go, jump, nearest,
    aimedProject, aimedIndex, bring, isCentred, wasDrag, onPointerDown, onKeyDown } =
    useRing(
      slots,
      useCallback((project: string | null) => {
        setLive(null);
        writeProject(project, "replace");
      }, [])
    );

  // Keep the ring on whatever the URL shows: at once on arrival (a deep link
  // lands already turned), and with a quiet turn after Back, Forward or a
  // choice from the list. When the ring itself moved the URL, they agree and
  // nothing happens.
  //
  // Arrival is also the ring's one entrance: it lands a card and a half back
  // and settles onto its card with its own spring, which shows a first-time
  // visitor that it turns. Quiet, so the panel and URL don't flick through
  // the cards it passes; skipped under reduced motion.
  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      const home = nearest(view);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        jump(home);
        return;
      }
      jump(home - 1.5);
      go(home, { quiet: true });
      return;
    }
    // Mid-spin, the card passing the centre is not where the ring will stop;
    // compare against where it is heading.
    if (aimedProject() !== view) go(nearest(view), { quiet: true });
  }, [view, aimedProject, go, jump, nearest]);

  /*
   * On a phone the ring sits above the words, so a change made from the words
   * (choosing a project, trying a preview) would happen off-screen. Bring the
   * ring into view when it isn't already; the pinned bar is cleared by the
   * stage's scroll-margin.
   */
  const showRing = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const stage = stageRef.current;
    if (!stage) return;
    const box = stage.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    stage.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const choose = (slug: string | null) => {
    setLive(null);
    haptic();
    writeProject(slug, "push");
    showRing();
  };

  const preview = (slug: string | null) => {
    setLive(null);
    // Previews only ever happen from home; returning goes back to the avatar.
    go(nearest(slug), { quiet: true });
  };

  const onCardClick = (i: number) => (event: React.MouseEvent) => {
    if (wasDrag()) {
      event.preventDefault();
      return;
    }
    if (!isCentred(i)) {
      event.preventDefault();
      haptic();
      bring(i);
      return;
    }
    if (demoFor(slots[i].project)) {
      event.preventDefault();
      haptic();
      setLive(i);
      return;
    }
    if (slots[i].project === null) {
      haptic();
      nextPhoto();
    }
  };

  const status = current ? `Showing ${current.title}` : "Showing all projects";

  return (
    <div className="showcase">
      <section className="showcase-panel">
        <div className="showcase-bar">
        <nav className="showcase-crumbs" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <Link href="/">Home</Link>
            </li>
            {current ? (
              <>
                <li>
                  <Link
                    href="/projects"
                    onClick={(event) => {
                      event.preventDefault();
                      choose(null);
                    }}
                  >
                    Projects
                  </Link>
                </li>
                <li aria-current="page" translate="no" key={current.slug} title={current.title}>
                  {current.title}
                </li>
              </>
            ) : (
              <li aria-current="page">Projects</li>
            )}
          </ol>
        </nav>
          <div className="showcase-bar-tools">
            {current ? (
              <button
                type="button"
                className="showcase-badge-hit"
                aria-label="Things I’ve built. Back to all projects"
                onClick={() => choose(null)}
              >
                {/* The visible ticket; the button around it is the larger hit area. */}
                <span className="showcase-badge" style={{ viewTransitionName: "showcase-ticket" } as React.CSSProperties}>
                  <span className="showcase-badge-main">Things I’ve built.</span>
                  <span className="showcase-badge-stub">
                    <ArrowUpLeft size={11} weight="bold" aria-hidden="true" />
                  </span>
                </span>
              </button>
            ) : null}
            <ThemeToggle className="showcase-theme" />
          </div>
        </div>

        <p className="sr-only" role="status">
          {status}
        </p>

        <div className="showcase-scroll" data-lenis-prevent>
          <div className="showcase-copy" key={view ?? "home"}>
            {current ? (
              <ProjectPanel
                project={current}
                onTry={
                  demoFor(current.slug)
                    ? () => {
                        if (live !== null) {
                          setLive(null);
                          return;
                        }
                        // Mid-turn is fine: steer to the project's first screen
                        // (if it isn't already heading there) and go live on it.
                        if (aimedProject() !== current.slug) go(nearest(current.slug), { quiet: true });
                        setFocusDemo(true);
                        setLive(aimedIndex());
                        showRing();
                      }
                    : undefined
                }
                trying={live !== null}
              />
            ) : (
              <HomePanel profile={profile} projects={projects} onPreview={preview} onChoose={choose} />
            )}
          </div>
        </div>

        <div className="showcase-foot showcase-legal">
          <AnalyticsPrivacy compact />
        </div>
      </section>

      <div
        ref={stageRef}
        className="showcase-stage"
        // The site's smooth scroll (Lenis) would otherwise take the wheel and
        // scroll the page while the ring turns; the ring owns it here.
        data-lenis-prevent
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Screens from ${current ? current.title : "all projects"}. Use the left and right arrow keys to browse.`}
        onPointerDown={onPointerDown}
        onPointerEnter={() => {
          holdPhotos.current = true;
        }}
        onPointerLeave={() => {
          holdPhotos.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setLive(null);
          else onKeyDown(event);
        }}
      >
        <div className="showcase-ring">
          {slots.map((slot, i) => {
            const project = projects.find((p) => p.slug === slot.project);
            // The home card: every photo stacked, the current one showing.
            const image = slot.project === null ? (
              photos.map((src, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  className="showcase-photo"
                  data-on={k === photo ? "" : undefined}
                  src={src}
                  alt=""
                  width={393}
                  height={852}
                  draggable={false}
                  decoding="async"
                  loading={i < 6 ? "eager" : "lazy"}
                  fetchPriority={k === 0 ? (i === 0 ? "high" : undefined) : "low"}
                />
              ))
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.src}
                alt=""
                width={393}
                height={852}
                draggable={false}
                decoding="async"
                loading={i < 6 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
              />
            );
            // Cards are pointer shortcuts; keyboard and screen-reader users get
            // the same destinations from the panel, so the cards stay out of
            // the tab order and the accessibility tree.
            if (live === i) {
              return (
                <div key={i} ref={cardRef(i)} className="showcase-card" data-live="">
                  {/* The screenshot stays under the demo, so it cross-fades into the live screen. */}
                  {image}
                  <PhoneDemo
                    label={`Live demo of ${project?.title ?? "the project"}`}
                    autoFocus={focusDemo}
                    onFocused={() => setFocusDemo(false)}
                  >{demoFor(slot.project)}</PhoneDemo>
                </div>
              );
            }
            return project ? (
              <Link
                key={i}
                href={project.href}
                ref={cardRef(i)}
                className="showcase-card"
                tabIndex={-1}
                aria-hidden="true"
                draggable={false}
                onClick={onCardClick(i)}
              >
                {image}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                ref={cardRef(i)}
                className="showcase-card"
                tabIndex={-1}
                aria-hidden="true"
                onClick={onCardClick(i)}
              >
                {image}
              </button>
            );
          })}
        </div>
        {/*
          * Above the live screen, outside it: this is a taste of the app, not
          * the app, and the real one is a click away.
          */}
        {live !== null ? <PreviewChip project={projects.find((p) => p.slug === slots[live]?.project)} /> : null}
        {/* How to use the ring sits with the ring, not in the panel's footer. */}
        <p className="showcase-hint" aria-hidden="true">
          <span className="showcase-hint-fine">Scroll, drag or use the arrow keys</span>
          <span className="showcase-hint-touch">Swipe to browse</span>
        </p>
      </div>
    </div>
  );
}

function PreviewChip({ project }: { project: ShowcaseProject | undefined }) {
  const site = project?.site;
  const stop = (event: React.PointerEvent) => event.stopPropagation();
  if (!site) {
    return (
      <p className="showcase-preview" onPointerDown={stop}>
        <span className="showcase-preview-tag">Preview</span>
        <span>A demo, not the full app</span>
      </p>
    );
  }
  const external = site.startsWith("http");
  return (
    <a
      className="showcase-preview"
      href={site}
      onPointerDown={stop}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="showcase-preview-tag">Preview</span>
      <span>Open the full {project?.siteNoun ?? "app"}</span>
      <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
