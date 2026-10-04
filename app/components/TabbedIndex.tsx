"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiGithub, SiGoogle, SiHashicorp, SiX } from "@icons-pack/react-simple-icons";
import {
  Briefcase,
  Cloud,
  EnvelopeSimple,
  HardHat,
  Palette,
  ReadCvLogo,
  Robot,
} from "@phosphor-icons/react";
import { haptic } from "../lib/haptics";
import { responsiveImage } from "../lib/images";
import AboutMenu from "./menu/AboutMenu";
import RowMenu from "./menu/RowMenu";
import { playSound } from "./ui/sound";
import type { Entry, Post, Tab } from "../site-content";

/**
 * The nav row plus the panel it switches.
 *
 * Two motions carry this component:
 *  - a layout animation on a single shared highlight, which travels to the
 *    hovered row rather than one background fading in per row;
 *  - a scale-in + fade that reveals the image of the hovered row, or of the
 *    row scrolled level with the pinned frame.
 *
 * Both animate transform/opacity/filter only, and both use CSS transitions
 * rather than keyframes, so sweeping quickly down the list retargets the
 * motion mid-flight instead of restarting it.
 */
export default function TabbedIndex({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  // /#writing opens on that tab: how an article's "← Writing" gets back here.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (tabs.some((tab) => tab.id === id)) setActiveId(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const tabRefs = useRef<Array<HTMLLIElement | null>>([]);
  const railRef = useRef<HTMLSpanElement>(null);
  const railPlaced = useRef(false);

  /*
   * The hover surface travels to whichever tab the pointer is over.
   *
   * It moves onto the active tab as well, and is simply hidden there — rather
   * than being parked. Stopping it would break the journey into two, which is
   * the fade-per-tab behaviour this replaces.
   */
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const hoverRailRef = useRef<HTMLSpanElement>(null);
  const hoverIdle = useRef(true);
  const lastSoundedTab = useRef<number | null>(null);

  const enterTab = useCallback((index: number) => {
    const label = tabRefs.current[index];
    const rail = hoverRailRef.current;
    if (!label || !rail) return;

    if (
      lastSoundedTab.current !== index &&
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      lastSoundedTab.current = index;
      playSound("select", { detune: Math.min(index, 7) * 55, velocity: 0.6 });
    }

    // Arriving from idle it should appear under the cursor, not slide in from
    // wherever it was last left. Suppress, set, flush a reflow, restore.
    if (hoverIdle.current) rail.style.transition = "none";

    rail.style.transform = `translate(${label.offsetLeft}px, ${label.offsetTop}px)`;
    rail.style.width = `${label.offsetWidth}px`;
    rail.style.height = `${label.offsetHeight}px`;

    if (hoverIdle.current) {
      void rail.offsetWidth;
      rail.style.transition = "";
    }

    hoverIdle.current = false;
    setHoveredTab(index);
  }, []);

  const leaveTabs = useCallback(() => {
    hoverIdle.current = true;
    lastSoundedTab.current = null;
    setHoveredTab(null);
  }, []);

  /*
   * Publish the live panel's height so the footer can glide to it rather than
   * teleport. A callback ref rather than an effect, because the panel remounts
   * on every tab change and the observer has to follow the new node.
   *
   * setState only ever runs from the observer callback, which is async, so this
   * never cascades a render.
   */
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const measurePanel = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const ro = new ResizeObserver(() => setPanelHeight(node.offsetHeight));
    ro.observe(node);
    observer.current = ro;
  }, []);

  /*
   * One rail that travels, rather than a rule per tab crossfading in and out.
   *
   * A crossfade gives you two separate events — one rule leaving, another
   * arriving — and the eye reads them as a blink. A single element moving is
   * one continuous event, so the indicator stays the same object throughout
   * and the change reads as connected. Same reasoning as the row highlight.
   */
  useEffect(() => {
    const index = tabs.findIndex((tab) => tab.id === active.id);
    const label = tabRefs.current[index];
    const rail = railRef.current;
    if (!label || !rail) return;

    // On the very first placement there is nowhere to travel from, so it is
    // set without a transition instead of sliding in from the left edge.
    if (!railPlaced.current) rail.style.transition = "none";

    rail.style.transform = `translate(${label.offsetLeft}px, ${label.offsetTop}px)`;
    rail.style.width = `${label.offsetWidth}px`;
    rail.style.height = `${label.offsetHeight}px`;

    if (!railPlaced.current) {
      void rail.offsetWidth;
      rail.style.transition = "";
      railPlaced.current = true;
    }
  }, [active.id, tabs]);

  return (
    <div className="rhythm-12 flex w-full flex-col items-start gap-12">
      {/* tab-scroller: on phones five tabs outrun the column, so the rail
          scrolls sideways there (see globals.css). Desktop is unaffected. */}
      <nav aria-label="Sections" className="tab-scroller">
        {/*
          gap drops from 24px to 4px: the pill now supplies the separation that
          the gap used to, and 24px between pills would read as four buttons
          rather than one control.
        */}
        <ul
          className="relative flex list-none items-center gap-1 p-0"
          onPointerLeave={leaveTabs}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === active.id;
            return (
              <li
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                onPointerEnter={() => enterTab(index)}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    haptic();
                    setActiveId(tab.id);
                    // The URL follows the tab, so it can be linked, survives a
                    // reload, and an agent setting the hash always changes it.
                    // replaceState: switching tabs is not navigation, Back
                    // should leave the page rather than step through tabs.
                    const url = index === 0 ? window.location.pathname + window.location.search : `#${tab.id}`;
                    window.history.replaceState(window.history.state, "", url);
                    // On a phone a tab can sit half off the edge of the
                    // scrolling rail; tapping it brings it fully into view.
                    // "nearest" on both axes: never scrolls the page itself.
                    event.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                        ? "auto"
                        : "smooth",
                    });
                  }}
                  aria-current={isActive ? "true" : undefined}
                  aria-controls="tab-panel"
                  // No hover colour shift: the labels hold one tone in every
                  // state, and the rail below is the active cue.
                  // The label sits above the pill, so it needs its own padding
                  // to give the pill something to wrap. relative + z-10 keeps
                  // the text painting over the glass rather than under it.
                  // Keycap press and click (see [data-keycap] in globals.css).
                  data-keycap=""
                  // select-none: a tab is a control, and a drag or double-click
                  // across the rail should never highlight its labels.
                  className="tab-hit relative z-10 cursor-pointer select-none whitespace-nowrap rounded-[99px] border-0 bg-transparent px-3 py-1.5 text-base leading-6 text-zinc-400 outline-offset-4"
                >
                  {tab.label}
                </button>
              </li>
            );
          })}

          {/*
            Rendered before the active pill so it paints underneath, and both
            sit under the labels, which carry z-10.
          */}
          <span
            ref={hoverRailRef}
            aria-hidden="true"
            className={`tab-hover-rail absolute left-0 top-0 rounded-[99px] ${
              hoveredTab === null ? "is-idle opacity-0" : ""
            } ${
              hoveredTab !== null && tabs[hoveredTab]?.id !== active.id
                ? "opacity-100"
                : "opacity-0"
            }`}
          />

          {/*
            One glass pill that travels, instead of a rule under each tab. Its
            position, width and height are measured from the active label and
            set imperatively; only the timing and material live in CSS.
          */}
          <span
            ref={railRef}
            aria-hidden="true"
            className="tab-rail absolute left-0 top-0 rounded-[99px]"
          />
        </ul>
      </nav>

      {/*
        Remounting on tab change replays the staggered panel entrance.

        min-h holds a floor at the height of the tallest list, Certificates:
        four 84px rows with 8px between them is 360px. Work and Projects are
        shorter and sit inside that floor, so moving between the three list
        tabs does not deflate the page. About is taller and grows past it.

        gap-12 owns the rhythm between blocks. Prose used to carry mb-12 while
        the writing section carried pt-12, and the two stacked into a 96px
        trench between the bio and the list. One gap, one value, set once.
      */}
      <div
        className="panel-anim w-full"
        style={
          panelHeight
            ? ({ "--panel-h": `${panelHeight}px` } as React.CSSProperties)
            : undefined
        }
      >
        {/* Said once on each switch, so a screen reader hears what changed. */}
        <p className="sr-only" aria-live="polite">
          {active.label}
        </p>
        <div
          key={active.id}
          ref={measurePanel}
          id="tab-panel"
          role="region"
          aria-label={active.label}
          className="panel-floor rhythm-12 flex min-h-[23rem] w-full flex-col gap-12"
        >
        {active.items?.length ? (
          <EntryList items={active.items} kind={active.id} />
        ) : null}
        {active.items && !active.items.length && active.empty ? (
          <p className="panel-chunk m-0 text-base leading-6 text-zinc-400">
            {active.empty}
          </p>
        ) : null}
        {/*
          The stagger index runs continuously across the blocks, so About
          cascades bio -> writing -> links instead of all three counting from
          zero and arriving on top of each other. The delay is capped in CSS.
        */}
        {active.body?.length ? (
          <AboutMenu
            bio={active.body.join(PARAGRAPH_BREAK)}
            resumeHref={
              active.links?.find((link) => link.label === "Resume")?.href
            }
          >
            <Prose body={active.body} start={0} />
          </AboutMenu>
        ) : null}
        {active.posts?.length ? (
          <PostList posts={active.posts} start={active.body?.length ?? 0} />
        ) : null}
        {active.posts && !active.posts.length && active.empty ? (
          <p className="panel-chunk m-0 text-base leading-6 text-zinc-400">{active.empty}</p>
        ) : null}
        {active.id === "writing" ? (
          <div className="panel-chunk">
            <Link href="/writing" className="writing-button">View writing</Link>
          </div>
        ) : null}
        {active.links?.length ? (
          <LinkList
            links={active.links}
            start={
              (active.body?.length ?? 0) +
              (active.posts?.length ?? 0)
            }
          />
          ) : null}
        </div>
      </div>

      <TabArchive tabs={tabs} activeId={active.id} />
    </div>
  );
}

/**
 * Every other tab, as plain HTML, hidden.
 *
 * Only the active tab is drawn, so without this the prerendered page holds
 * the Work list and nothing else: the bio, certificates, writing and links
 * would exist only after JavaScript runs, which search crawlers do late and
 * AI crawlers not at all. This is the same content as simple semantic
 * markup, in the HTML they download. `hidden` keeps it out of sight and out
 * of the accessibility tree, so nobody meets it twice.
 */
function TabArchive({ tabs, activeId }: { tabs: Tab[]; activeId: string | undefined }) {
  return (
    <div hidden>
      {tabs
        .filter((tab) => tab.id !== activeId)
        .map((tab) => (
          <section key={tab.id} aria-label={tab.label}>
            <h2>{tab.label}</h2>
            {tab.items?.length ? (
              <ul>
                {tab.items.map((item) => (
                  <li key={`${item.title}-${item.year}`}>
                    {item.href ? <a href={item.href}>{item.title}</a> : item.title}
                    {item.company ? `, ${item.company}` : ""}
                    {item.year ? ` (${item.year})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {tab.body?.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
            {tab.posts?.length ? (
              <ul>
                {tab.posts.map((post) => (
                  <li key={post.title}>
                    {post.href ? <a href={post.href}>{post.title}</a> : post.title} <time dateTime={post.date}>{post.date}</time>
                  </li>
                ))}
              </ul>
            ) : null}
            {tab.links?.length ? (
              <ul>
                {tab.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
    </div>
  );
}

/**
 * One highlight surface that travels to whichever row the pointer is over.
 *
 * Shared by the entry lists and the links list, which were doing this
 * identically. A background that fades in per row makes moving between rows
 * two events — one surface leaving, another arriving — and the eye reads that
 * as a blink. A single element moving is one continuous event.
 *
 * Geometry is driven imperatively so React never fights the inline transform,
 * and all four values come from the same offsetParent that positions the
 * highlight, so no correction is needed.
 */
function useTravellingHighlight() {
  const [hovered, setHovered] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const highlightRef = useRef<HTMLDivElement>(null);
  const idle = useRef(true);
  const lastSoundedRow = useRef<number | null>(null);

  const enter = useCallback((index: number) => {
    const row = rowRefs.current[index];
    const highlight = highlightRef.current;
    if (!row || !highlight) return;

    if (
      lastSoundedRow.current !== index &&
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      lastSoundedRow.current = index;
      playSound("select", { detune: Math.min(index, 7) * 55, velocity: 0.35 });
    }

    // Arriving from idle it should fade in under the cursor rather than slide
    // across from whichever row the pointer left last. Suppress the
    // transition, set the geometry, flush a reflow, restore it.
    if (idle.current) highlight.style.transition = "none";

    highlight.style.transform = `translate(${row.offsetLeft}px, ${row.offsetTop}px)`;
    highlight.style.width = `${row.offsetWidth}px`;
    highlight.style.height = `${row.offsetHeight}px`;

    if (idle.current) {
      void highlight.offsetHeight;
      highlight.style.transition = "";
    }

    idle.current = false;
    setHovered(index);
  }, []);

  const leave = useCallback(() => {
    idle.current = true;
    lastSoundedRow.current = null;
    setHovered(null);
  }, []);

  /*
   * The highlight follows keyboard focus as well as the pointer, so it must
   * let go of both: when focus leaves the list, and when the pointer leaves
   * unless a row still holds keyboard focus (then the highlight stays on it).
   */
  const wrapperProps = {
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      if (!event.currentTarget.querySelector(":focus-visible")) leave();
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) leave();
    },
  };

  return { hovered, rowRefs, highlightRef, enter, leave, wrapperProps };
}

/** Blank line between paragraphs when the bio is copied as one block. */
const PARAGRAPH_BREAK = "\n\n";

/*
 * Where the preview has a real pointer to drive it and room beside the column.
 * Mirrors the media query on .preview-rail in globals.css; the two must agree.
 */
const PREVIEW_ROOM = "(hover: hover) and (pointer: fine) and (min-width: 1280px)";

/**
 * The row level with the pinned preview, as the page scrolls.
 *
 * The frame is sticky at the middle of the viewport, so whichever row's
 * centre sits nearest the frame's centre is the one beside it, and that is
 * the image it should be showing. Measuring against the frame rather than a
 * fixed line keeps that true at both ends of the list too, where the frame
 * stops being stuck and rides along with the first or last row.
 *
 * Only runs where the preview exists. Everywhere else it reports nothing, and
 * the preview falls back to hover alone (which, there, is no preview at all).
 */
function useRowBesideFrame(
  rowRefs: React.RefObject<Array<HTMLLIElement | null>>,
  frameRef: React.RefObject<HTMLDivElement | null>
) {
  const [beside, setBeside] = useState<number | null>(null);

  useEffect(() => {
    const room = window.matchMedia(PREVIEW_ROOM);
    let frame = 0;

    const measure = () => {
      frame = 0;
      const box = frameRef.current?.getBoundingClientRect();
      if (!box) return;
      const centre = box.top + box.height / 2;
      let nearest: number | null = null;
      let distance = Infinity;
      rowRefs.current.forEach((row, index) => {
        if (!row) return;
        const rect = row.getBoundingClientRect();
        const d = Math.abs(rect.top + rect.height / 2 - centre);
        if (d < distance) {
          distance = d;
          nearest = index;
        }
      });
      setBeside(nearest);
    };

    // One read per frame, however fast the wheel fires.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const attach = () => {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      // The first read lands while the rows are still sliding in on their
      // entrance; read again once they have settled where they will stay.
      document.addEventListener("animationend", schedule);
      schedule();
    };
    const detach = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("animationend", schedule);
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onRoomChange = () => {
      if (room.matches) {
        attach();
      } else {
        detach();
        setBeside(null);
      }
    };

    if (room.matches) attach();
    room.addEventListener("change", onRoomChange);
    return () => {
      room.removeEventListener("change", onRoomChange);
      detach();
    };
  }, [rowRefs, frameRef]);

  return beside;
}

/**
 * The image the frame shows: the one asked for, once it is decoded.
 *
 * Swapping to a src that is still downloading would crossfade into an empty
 * box, or paint the image in strips. Until the new one is ready the old one
 * holds, and the crossfade starts only when there is something to fade to.
 * Nothing is cleared when the request goes away, so a frame fading out keeps
 * its picture all the way down.
 */
function useDecodedSrc(
  wanted: string | undefined,
  imgRefs: React.RefObject<Map<string, HTMLImageElement>>
) {
  const [shown, setShown] = useState<string>();

  useEffect(() => {
    if (!wanted) return;
    const img = imgRefs.current.get(wanted);
    if (!img) return;
    let live = true;
    // Lazy until asked for: a lazy image that is wanted now should not wait
    // on the browser's own idea of when it is near enough to fetch.
    img.loading = "eager";
    img
      .decode()
      .catch(() => {
        // decode() rejects for some formats that still render (older engines
        // and SVG); a loaded image with a size is good enough to show.
        if (!img.complete || !img.naturalWidth) throw new Error("unusable");
      })
      .then(
        () => live && setShown(wanted),
        () => live && setShown(undefined)
      );
    return () => {
      live = false;
    };
  }, [wanted, imgRefs]);

  return shown;
}

function EntryList({ items, kind }: { items: Entry[]; kind: string }) {
  const { hovered, rowRefs, highlightRef, enter, wrapperProps } =
    useTravellingHighlight();

  const frameRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef(new Map<string, HTMLImageElement>());
  const beside = useRowBesideFrame(rowRefs, frameRef);

  // A row being pointed at or focused is a deliberate choice, so it outranks
  // whichever row happens to be scrolled level with the frame.
  const target = hovered ?? beside;
  const wantedSrc = target === null ? undefined : items[target]?.image;
  const previewSrc = useDecodedSrc(wantedSrc, imgRefs);

  // The stack of preview images, in list order. Narrowed so image is a string.
  const withImages = items.filter(
    (item): item is Entry & { image: string } => Boolean(item.image)
  );

  return (
    <div className="relative w-full" {...wrapperProps}>
      {/*
        This wrapper is the single coordinate space for the hover surface.

        It owns both the negative margin and the positioning, so the highlight
        and the rows are measured against the same origin. The list itself must
        NOT be positioned: if it were, it would become the rows' offsetParent
        and their offsetLeft would read 0 relative to the list while the
        highlight was placed relative to something 40px away — which is what
        pinned the surface to the text's left edge and pooled all the padding
        on the right.
      */}
      <div className="relative -mx-10">
        {/* Rendered before the list so the positioned rows paint over it. */}
        <div
          ref={highlightRef}
          aria-hidden="true"
          className={`list-highlight pointer-events-none absolute left-0 top-0 rounded-[14px] ${
            hovered === null ? "is-idle opacity-0" : "opacity-100"
          }`}
        />

        <ul className="flex list-none flex-col gap-2 p-0">
          {items.map((item, index) => (
            <li
              key={item.title}
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              // w-fit is what makes the morph legible: each row is only as wide
              // as its own text, so the highlight visibly resizes between rows.
              // relative keeps it painting above the highlight.
              className="panel-chunk relative w-fit"
              style={{ "--i": index } as React.CSSProperties}
              onPointerEnter={() => enter(index)}
              onFocus={() => enter(index)}
            >
              <RowMenu entry={item} kind={kind}>
                <Row {...item} />
              </RowMenu>
            </li>
          ))}
        </ul>
      </div>

      {/*
        A rail beside the column, as tall as the list, that the frame sticks
        inside: it holds still while the rows scroll past and leaves with the
        list. Absolutely placed, so it takes no space and moves nothing. Only
        renders where there is room for it and a real pointer to drive it (see
        .preview-rail in globals.css).
      */}
      <div aria-hidden="true" className="preview-rail pointer-events-none w-60">
        <div
          ref={frameRef}
          // Concentric corners: 8px padding around an 8px inner radius wants a
          // 16px outer radius, which is what rounded-2xl gives.
          className={`preview-frame rounded-2xl p-2 ${
            wantedSrc && previewSrc ? "is-shown" : ""
          }`}
        >
          {/*
            Every image in the list is mounted and stacked; only the shown
            one is opaque.

            Swapping used to remount a single <img> keyed on src, which tore
            the old image out and started the new one at opacity 0 — a flash of
            empty frame, then a fade with no frame motion behind it. Nothing
            mounts or unmounts now, so moving between rows is a straight
            crossfade between two already-decoded images.
          */}
          <div className="relative h-48 w-full">
            {withImages.map((item) => {
              // AVIF/WebP at the frame's size (224px, 2x on retina) in place
              // of the original upload (scripts/optimize-images.mjs).
              const picked = responsiveImage(item.image);
              return (
              <picture key={item.image}>
                {picked?.avifSrcSet ? <source type="image/avif" srcSet={picked.avifSrcSet} sizes="224px" /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={(node) => {
                  if (node) imgRefs.current.set(item.image, node);
                  else imgRefs.current.delete(item.image);
                }}
                src={picked?.src ?? item.image}
                srcSet={picked?.srcSet}
                sizes={picked?.srcSet ? "224px" : undefined}
                width={picked?.width}
                height={picked?.height}
                alt=""
                // Lazy: on a phone the rail is display:none, so these are never
                // fetched at all. Async decode keeps a big badge off the main
                // thread; useDecodedSrc waits for it before showing anything.
                loading="lazy"
                decoding="async"
                className={`preview-img absolute inset-0 h-full w-full rounded-lg ${
                  item.fit === "contain"
                    ? "bg-gray-50 object-contain p-3"
                    : "object-cover"
                } ${item.image === previewSrc ? "is-active" : ""}`}
              />
              </picture>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * Phosphor at `light` weight. Its hairline stroke is the reason for choosing it
 * over Lucide's 2px default — on a page built from 0.8px rules and 14px type, a
 * heavier icon would be the loudest thing on screen.
 */
const ICONS = {
  robot: Robot,
  hardhat: HardHat,
  palette: Palette,
} as const;

/*
 * Issuer marks, from Simple Icons — real trademarks, used to identify the body
 * that actually issued each credential.
 *
 * AWS, Azure and Microsoft are deliberately absent: Simple Icons carries none
 * of them any more, having removed those marks on request, and a trademark is
 * not something to redraw by hand from memory. Both of those certificates are
 * cloud credentials, so they take a neutral cloud glyph instead.
 */
const LOGOS = {
  github: SiGithub,
  hashicorp: SiHashicorp,
  google: SiGoogle,
  cloud: Cloud,
} as const;

/*
 * Contact link marks. GitHub and X are the real trademarks, used to identify
 * the accounts they belong to. Simple Icons carries no LinkedIn mark, so that
 * one takes a neutral glyph rather than a hand-drawn imitation — as do email
 * and the CV, which are not brands at all.
 */
const LINK_ICONS = {
  email: EnvelopeSimple,
  github: SiGithub,
  linkedin: Briefcase,
  x: SiX,
  resume: ReadCvLogo,
} as const;

function Row({ title, company, year, href, icon, logo }: Entry) {
  const external = href?.startsWith("http");
  const Icon = icon ? ICONS[icon] : null;
  const Logo = logo ? LOGOS[logo] : null;

  const content = (
    <span className="flex items-start gap-4">
      {Icon ? (
        // Nudged down to sit optically on the title's cap height rather than
        // its line box, and aria-hidden since the title already says this.
        <span className="mt-[3px] shrink-0 text-zinc-400">
          <Icon size={20} weight="light" aria-hidden="true" />
        </span>
      ) : null}
      {Logo ? (
        // currentColor, not the brand colour: a row of vendor colours would
        // pull every eye to the logos on an otherwise monochrome page. 16px so
        // a solid mark reads no heavier than the 20px hairline icons above.
        <span className="mt-[4px] shrink-0 text-zinc-500">
          <Logo size={16} color="currentColor" aria-hidden="true" />
        </span>
      ) : null}
      <span className="flex flex-col gap-0.5">
        <span className="text-base leading-6 text-black underline">{title}</span>
        {company ? (
          <span className="text-base leading-6 text-zinc-500">{company}</span>
        ) : null}
        <span className="text-sm leading-5 text-zinc-400">{year}</span>
      </span>
    </span>
  );

  // inline-block, so the row box ends at the text rather than at the column
  // edge — the highlight measures this box.
  const shell = "row-pad inline-block rounded-[14px] px-10 py-4 no-underline";

  // Entries without a destination stay inert rather than becoming dead links.
  return href ? (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={shell}
      onClick={haptic}
    >
      {content}
    </a>
  ) : (
    <span className={`${shell} cursor-default`}>{content}</span>
  );
}

function Prose({
  body,
  start,
}: {
  body: NonNullable<Tab["body"]>;
  start: number;
}) {
  return (
    // data-cursor="text": reading material, so the custom cursor becomes an
    // I-beam over the words themselves (see lib/cursor).
    <div className="flex max-w-[32rem] flex-col gap-6" data-cursor="text">
      {body.map((paragraph, index) => (
        <p
          key={paragraph.slice(0, 32)}
          className="panel-chunk prose-line m-0 text-base text-black"
          style={{ "--i": start + index } as React.CSSProperties}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/**
 * Writing index, grouped by year.
 *
 * The hover behaviour is the whole point of the grouping reading cleanly: with
 * the pointer anywhere in the list every row dims, and the one actually under
 * the pointer stays at full strength. It is pure CSS (see .post-list in
 * globals.css) — no hover state in React, so a fast sweep down the list never
 * queues a re-render per row.
 */
function PostList({ posts, start }: { posts: Post[]; start: number }) {
  // Newest first, then bucketed by year while preserving that order.
  const groups = new Map<string, Post[]>();
  for (const post of [...posts].sort((a, b) => b.date.localeCompare(a.date))) {
    const year = post.date.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  const years = [...groups];
  // Flat newest-first order, so a row's stagger index ignores year grouping.
  const order = years.flatMap(([, group]) => group);

  /*
   * Two columns: a gutter holding the year, and the row itself.
   *
   * A grid is what makes the year a real column — every title starts on the
   * same line without anyone positioning anything absolutely, and the row's
   * own bottom rule naturally begins where the content does rather than
   * running back under the gutter.
   */
  const grid =
    "grid grid-cols-[3rem_1fr] items-baseline sm:grid-cols-[7rem_1fr]";

  return (
    // No "Writing" heading: this is its own tab now, and the tab names it.
    <section className="post-list" aria-label="Writing">
      <ul className="flex list-none flex-col p-0">
        {years.map(([year, group], groupIndex) => (
          <li
            key={year}
            // The final group closes on the list, so it needs no rule of its own.
            className={
              groupIndex < years.length - 1
                ? "border-b-[0.8px] border-zinc-100"
                : undefined
            }
          >
            <ul className="flex list-none flex-col p-0">
              {group.map((post, postIndex) => (
                <li
                  key={post.title}
                  className={`panel-chunk ${grid}`}
                  style={
                    {
                      "--i": start + order.indexOf(post),
                    } as React.CSSProperties
                  }
                >
                  {/*
                    Only the first post of a year is labelled; the rest keep
                    the cell so the column stays aligned.
                  */}
                  <span className="post-year py-3 text-sm leading-5 tabular-nums">
                    {postIndex === 0 ? year : null}
                  </span>
                  <PostRow
                    {...post}
                    // Last row in a group defers to the group's own rule.
                    ruled={postIndex < group.length - 1}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PostRow({ title, date, href, ruled }: Post & { ruled: boolean }) {
  const [, month, day] = date.split("-");

  const shell = `post-row flex items-baseline justify-between gap-6 py-3 no-underline ${
    ruled ? "border-b-[0.8px] border-zinc-100" : ""
  }`;

  const content = (
    <>
      <h3 className="post-title m-0 text-pretty text-sm font-normal leading-5">
        {title}
      </h3>
      {/* tabular-nums so the dates hold a straight right-hand column. */}
      <time
        dateTime={date}
        className="post-date shrink-0 text-sm leading-5 tabular-nums"
      >
        {day}/{month}
      </time>
    </>
  );

  // A row without a page stays inert rather than becoming an href="#" that
  // goes nowhere, and it no longer takes the hand either: a pointer that
  // promises a click on something that does nothing reads as a broken link.
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className={shell}
    >
      {content}
    </a>
  ) : (
    <span className={`${shell} cursor-default`}>
      {content}
    </span>
  );
}

function LinkList({
  links,
  start,
}: {
  links: NonNullable<Tab["links"]>;
  start: number;
}) {
  const { hovered, rowRefs, highlightRef, enter, wrapperProps } =
    useTravellingHighlight();

  return (
    /*
      The wrapper owns both the negative margin and the positioning, so the
      highlight and the rows share one origin. The list itself must stay
      unpositioned: if it were the rows' offsetParent, their offsets would be
      measured against it while the highlight sat 40px away.
    */
    <div className="relative -mx-10" {...wrapperProps}>
      <div
        ref={highlightRef}
        aria-hidden="true"
        className={`list-highlight pointer-events-none absolute left-0 top-0 rounded-[14px] ${
          hovered === null ? "is-idle opacity-0" : "opacity-100"
        }`}
      />

      <ul className="flex list-none flex-col gap-2 p-0">
        {links.map((link, index) => (
          <li
            key={link.label}
            ref={(node) => {
              rowRefs.current[index] = node;
            }}
            // w-fit is what makes the travel legible: each row is only as wide
            // as its own text, so the surface visibly resizes between rows.
            className="panel-chunk relative w-fit"
            style={{ "--i": start + index } as React.CSSProperties}
            onPointerEnter={() => enter(index)}
            onFocus={() => enter(index)}
          >
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              title={link.icon === "email" ? "Opens your email client. Emails received are used solely to reply to your inquiry." : undefined}
              onClick={haptic}
              className="row-pad inline-flex w-fit items-center gap-2.5 rounded-[14px] px-10 py-4 no-underline"
            >
              {(() => {
                const Glyph = link.icon ? LINK_ICONS[link.icon] : null;
                return Glyph ? (
                  <span className="shrink-0 text-zinc-500" aria-hidden="true">
                    <Glyph size={16} />
                  </span>
                ) : null;
              })()}
              <span className="text-base leading-6 text-zinc-400">{link.label}</span>
              <span className="text-base leading-6 text-black underline">
                {link.display ??
                  link.href.replace(/^mailto:/, "").replace(/^https?:\/\/(www\.)?/, "")}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
