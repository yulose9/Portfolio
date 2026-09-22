"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SiGithub, SiGoogle, SiHashicorp } from "@icons-pack/react-simple-icons";
import { Cloud, HardHat, Palette, Robot } from "@phosphor-icons/react";
import { haptic } from "../lib/haptics";
import type { Entry, Post, Tab } from "../site-content";

/**
 * The nav row plus the panel it switches.
 *
 * Two motions carry this component:
 *  - a layout animation on a single shared highlight, which travels to the
 *    hovered row rather than one background fading in per row;
 *  - a scale-in + fade that reveals the hovered row image.
 *
 * Both animate transform/opacity/filter only, and both use CSS transitions
 * rather than keyframes, so sweeping quickly down the list retargets the
 * motion mid-flight instead of restarting it.
 */
export default function TabbedIndex({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const tabRefs = useRef<Array<HTMLLIElement | null>>([]);
  const railRef = useRef<HTMLSpanElement>(null);
  const railPlaced = useRef(false);

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
      <nav aria-label="Sections">
        {/*
          gap drops from 24px to 4px: the pill now supplies the separation that
          the gap used to, and 24px between pills would read as four buttons
          rather than one control.
        */}
        <ul className="relative flex list-none items-center gap-1 p-0">
          {tabs.map((tab, index) => {
            const isActive = tab.id === active.id;
            return (
              <li
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    setActiveId(tab.id);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  // No hover colour shift: the labels hold one tone in every
                  // state, and the rail below is the active cue.
                  // The label sits above the pill, so it needs its own padding
                  // to give the pill something to wrap. relative + z-10 keeps
                  // the text painting over the glass rather than under it.
                  className="tab-hit relative z-10 cursor-pointer whitespace-nowrap rounded-[99px] border-0 bg-transparent px-3 py-1.5 text-base leading-6 text-zinc-400 outline-offset-4 transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  {tab.label}
                </button>
              </li>
            );
          })}

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
        <div
          key={active.id}
          ref={measurePanel}
          className="panel-floor rhythm-12 flex min-h-[23rem] w-full flex-col gap-12"
        >
        {active.items?.length ? <EntryList items={active.items} /> : null}
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
        {active.body?.length ? <Prose body={active.body} start={0} /> : null}
        {active.posts?.length ? (
          <PostList posts={active.posts} start={active.body?.length ?? 0} />
        ) : null}
        {active.links?.length ? (
          <LinkList
            links={active.links}
            start={
              (active.body?.length ?? 0) +
              (active.posts?.length ? active.posts.length + 1 : 0)
            }
          />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EntryList({ items }: { items: Entry[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const highlightRef = useRef<HTMLDivElement>(null);
  // Position is driven imperatively so React never fights the inline transform.
  const idle = useRef(true);

  const enter = useCallback((index: number) => {
    const row = rowRefs.current[index];
    const highlight = highlightRef.current;
    if (!row || !highlight) return;

    // Rows shrink to their own text, so the highlight takes each row's exact
    // box: it travels vertically and resizes to the new width at the same time.
    // The preview panel is pinned to the viewport and deliberately not moved.
    //
    // Both offsets are read against the wrapper that also positions the
    // highlight, so they need no correction. offsetLeft is 0 today because
    // every row starts at the wrapper's left edge; it is read rather than
    // assumed so an indented row would still be tracked correctly.
    const left = row.offsetLeft;
    const top = row.offsetTop;
    const height = row.offsetHeight;
    const width = row.offsetWidth;

    // Arriving from idle, the highlight should fade in under the cursor rather
    // than slide across from whichever row the pointer left last time.
    // Suppress the transition, set the geometry, flush a reflow, restore it.
    if (idle.current) highlight.style.transition = "none";

    highlight.style.transform = `translate(${left}px, ${top}px)`;
    highlight.style.height = `${height}px`;
    highlight.style.width = `${width}px`;

    if (idle.current) {
      void highlight.offsetHeight;
      highlight.style.transition = "";
    }

    idle.current = false;
    setHovered(index);
  }, []);

  const leave = useCallback(() => {
    idle.current = true;
    setHovered(null);
  }, []);

  const previewSrc = hovered === null ? undefined : items[hovered]?.image;

  // The stack of preview images, in list order. Narrowed so image is a string.
  const withImages = items.filter(
    (item): item is Entry & { image: string } => Boolean(item.image)
  );

  return (
    <div className="relative w-full" onPointerLeave={leave}>
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
              <Row {...item} />
            </li>
          ))}
        </ul>
      </div>

      {/*
        Sits outside the text column, and only renders where there is room for
        it and a real pointer to drive it (see .preview-panel in globals.css).
      */}
      <div aria-hidden="true" className="preview-panel pointer-events-none w-60">
        <div
          // Concentric corners: 8px padding around an 8px inner radius wants a
          // 16px outer radius, which is what rounded-2xl gives.
          className={`preview-frame relative rounded-2xl p-2 ${
            previewSrc ? "is-shown" : ""
          }`}
        >
          {/*
            Every image in the list is mounted and stacked; only the hovered
            one is opaque.

            Swapping used to remount a single <img> keyed on src, which tore
            the old image out and started the new one at opacity 0 — a flash of
            empty frame, then a fade with no frame motion behind it. Nothing
            mounts or unmounts now, so moving between rows is a straight
            crossfade between two already-decoded images.
          */}
          <div className="relative h-48 w-full">
            {withImages.map((item) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={item.image}
                src={item.image}
                alt=""
                className={`preview-img absolute inset-0 h-full w-full rounded-lg ${
                  item.fit === "contain"
                    ? "bg-gray-50 object-contain p-3"
                    : "object-cover"
                } ${item.image === previewSrc ? "is-active" : ""}`}
              />
            ))}
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
    <div className="flex max-w-[32rem] flex-col gap-6">
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
    <section className="post-list">
      {/*
        A quiet label rather than a headline — it names the list without
        competing with it. Still an h2 semantically, under the page h1.
      */}
      <div
        className="panel-chunk border-b-[0.8px] border-zinc-100 pb-2"
        style={{ "--i": start } as React.CSSProperties}
      >
        <h2 className="m-0 text-sm font-normal leading-5 text-black/40">
          Writing
        </h2>
      </div>

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
                      "--i": start + 1 + order.indexOf(post),
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

  // Nothing is published yet, so rows without a destination stay inert rather
  // than becoming href="#" links that go nowhere.
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
    <span className={`${shell} cursor-default`}>{content}</span>
  );
}

function LinkList({
  links,
  start,
}: {
  links: NonNullable<Tab["links"]>;
  start: number;
}) {
  return (
    <ul className="-mx-10 flex list-none flex-col gap-2 p-0">
      {links.map((link, index) => (
        <li
          key={link.label}
          className="panel-chunk"
          style={{ "--i": start + index } as React.CSSProperties}
        >
          <a
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={link.href.startsWith("http") ? "noreferrer" : undefined}
            onClick={haptic}
            className="row-pad inline-flex w-fit items-baseline gap-2 rounded-[14px] px-10 py-4 no-underline transition-colors duration-150 ease-out hover:bg-neutral-100"
          >
            <span className="text-base leading-6 text-zinc-400">{link.label}</span>
            <span className="text-base leading-6 text-black underline">
              {link.display ??
                link.href.replace(/^mailto:/, "").replace(/^https?:\/\/(www\.)?/, "")}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
