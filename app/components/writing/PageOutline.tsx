"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { safeInlineUrl } from "../../../cms/inline";
import { playSound } from "../ui/sound";
import { haptic } from "../../lib/haptics";

/*
 * Notion's page outline, elevated with Nick Arce's architecture and ReactBits
 * magnetic cursor attraction.
 *
 * Collapsed on desktop, it is a vertical rail of horizontal lines on the right
 * edge of the viewport. As the cursor nears the lines, they magnetically expand
 * and shift toward the pointer. On hover or focus, the card opens smoothly to
 * the left of the rail, keeping the rail lines visible and allowing wide,
 * legible heading text without truncation.
 *
 * On mobile and narrow screens, a floating pill at the bottom center shows
 * circular scroll progress with an SVG ring, opening into a smooth bottom sheet
 * with staggered row animations and haptic feedback.
 */

export type OutlineHeading = {
  id: string;
  text: string;
  level: number;
  icon?: string;
};

type Props = {
  headings: OutlineHeading[];
  /** The heading whose section is on screen. */
  activeId: string | null;
  /** Scroll to the heading and mark it. */
  onJump: (id: string) => void;
  label?: string;
  /** Real `#id` links (the site), rather than buttons (the editor). */
  asLinks?: boolean;
  /** Extra control at the end of a row (the editor's icon picker). */
  renderAction?: (heading: OutlineHeading, tabIndex: number) => ReactNode;
  variant?: "site" | "editor";
};

// Kobra's glide: 300ms, no overshoot. CSS transitions on transform (see
// .page-outline-marker in article-extras.css), so the outline ships no
// animation library; reduced motion turns them off there too.

/** Vertical pitch of the collapsed lines; long outlines squeeze together. */
function pitchFor(count: number) {
  return count > 30 ? Math.max(4, Math.floor(360 / count)) : 12;
}
/** Line length by depth, as Notion draws them. */
function lineWidth(depth: number) {
  return depth <= 0 ? 16 : depth === 1 ? 12 : 8;
}

/**
 * Calls `done` once the page has stopped scrolling: shortly after the last
 * scroll event, or right away if nothing moved. Returns a cancel.
 */
export function afterScroll(win: Window, done: () => void) {
  let quiet = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    win.removeEventListener("scroll", onScroll, true);
    win.clearTimeout(quiet);
    win.clearTimeout(cap);
    done();
  };
  const onScroll = () => {
    win.clearTimeout(quiet);
    quiet = win.setTimeout(finish, 140);
  };
  win.addEventListener("scroll", onScroll, { capture: true, passive: true });
  quiet = win.setTimeout(finish, 220);
  const cap = win.setTimeout(finish, 2500);
  return () => {
    finished = true;
    win.removeEventListener("scroll", onScroll, true);
    win.clearTimeout(quiet);
    win.clearTimeout(cap);
  };
}

/**
 * The landing mark: a soft wash over the elements, fading in about 1.2s.
 * For plain DOM (the published article); the editor uses a decoration.
 */
export function flashElements(elements: (Element | null | undefined)[]) {
  for (const el of elements) {
    if (!el) continue;
    el.classList.remove("outline-flash");
    // Restart the animation if it was still running from a previous jump.
    void (el as HTMLElement).offsetWidth;
    el.classList.add("outline-flash");
    const clear = () => el.classList.remove("outline-flash");
    el.addEventListener("animationend", clear, { once: true });
    el.ownerDocument.defaultView?.setTimeout(clear, 1400);
  }
}

/** True when the reader asked for less motion. */
export function prefersReducedMotion(win: Window | null | undefined) {
  return Boolean(win?.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function Icon({ value }: { value: string }) {
  const src = safeInlineUrl(value, true);
  return (
    <span className="page-outline-icon" aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        value
      )}
    </span>
  );
}

export function PageOutline({
  headings,
  activeId,
  onJump,
  label = "Outline",
  asLinks = false,
  renderAction,
  variant = "site",
}: Props) {
  const [open, setOpen] = useState(false);
  // Escape closes the card while focus stays put; arrows reopen it.
  const [dismissed, setDismissed] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [marker, setMarker] = useState<{ y: number; h: number } | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  // Mobile Floating Pill & Sheet state
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const anchor = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLElement | null)[]>([]);
  const hovered = useRef(false);
  const timer = useRef(0);
  const releasePin = useRef<(() => void) | null>(null);
  const ticked = useRef<string | null>(null);
  const opened = useRef(false);

  // Magnetic rail lines
  const stripRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const activeLineRef = useRef<HTMLSpanElement>(null);
  const rafId = useRef(0);

  // While a jump's smooth scroll passes over other sections, the dot holds
  // on the target instead of stepping through each of them.
  const current = pinned ?? activeId;
  const activeIndex = headings.findIndex((h) => h.id === current);
  const top = headings.length ? Math.min(...headings.map((h) => h.level)) : 1;
  const pitch = pitchFor(headings.length);
  const rove = focusIndex >= 0 ? focusIndex : Math.max(activeIndex, 0);
  const activeDepth = activeIndex >= 0 ? headings[activeIndex].level - top : 0;

  // Fixed to the viewport, so it lives at the end of the body (or of the
  // dialog it was opened in), clear of any transformed ancestor.
  useEffect(() => {
    const from = anchor.current;
    if (!from) return;
    setHost(
      from.closest<HTMLElement>('[role="dialog"]') ?? from.ownerDocument.body,
    );
  }, []);

  // Track scroll progress for the mobile progress ring
  useEffect(() => {
    if (variant === "editor") return;
    const updateProgress = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const currentPos = window.scrollY;
      const p = total > 0 ? Math.min(1, Math.max(0, currentPos / total)) : 0;
      setScrollProgress(p);
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", updateProgress);
  }, [variant]);

  // Close mobile sheet on Escape key
  useEffect(() => {
    if (!mobileSheetOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSheetOpen]);

  // Magnetic cursor attraction physics (ReactBits Magnet)
  const resetMagnet = useCallback(() => {
    for (let i = 0; i < lineRefs.current.length; i++) {
      const el = lineRefs.current[i];
      if (el) {
        el.style.width = "";
        el.style.transform = "";
        el.style.opacity = "";
      }
    }
    if (activeLineRef.current) {
      activeLineRef.current.style.width = "";
      activeLineRef.current.style.transform = `translateY(${activeIndex * pitch}px)`;
    }
  }, [activeIndex, pitch]);

  const applyMagnet = useCallback(
    (clientX: number, clientY: number) => {
      const strip = stripRef.current;
      if (!strip) return;
      const win = strip.ownerDocument.defaultView;
      if (prefersReducedMotion(win)) return;

      const stripRect = strip.getBoundingClientRect();
      const rightEdge = stripRect.right - 18;
      const dx = Math.max(0, rightEdge - clientX);
      const radiusY = 75;
      const radiusX = 110;

      if (dx > radiusX) {
        resetMagnet();
        return;
      }

      const ratioX = Math.cos((dx / radiusX) * (Math.PI / 2));

      for (let i = 0; i < headings.length; i++) {
        const el = lineRefs.current[i];
        if (!el) continue;
        const lineCenterY = stripRect.top + 14 + i * pitch + 1;
        const dy = Math.abs(clientY - lineCenterY);
        const baseW = lineWidth(headings[i].level - top);

        if (dy < radiusY) {
          const ratioY = Math.cos((dy / radiusY) * (Math.PI / 2));
          const proximity = ratioY * ratioY * ratioX;
          const bonus = Math.round(20 * proximity);
          const pull = Math.round(4 * proximity);
          const opacity = (0.45 + 0.5 * proximity).toFixed(2);

          el.style.width = `${baseW + bonus}px`;
          el.style.transform = `translateX(-${pull}px)`;
          el.style.opacity = opacity;

          if (i === activeIndex && activeLineRef.current) {
            const activeBaseW = lineWidth(activeDepth) + 8;
            activeLineRef.current.style.width = `${activeBaseW + Math.round(24 * proximity)}px`;
            activeLineRef.current.style.transform = `translateY(${activeIndex * pitch}px) translateX(-${pull}px)`;
          }
        } else {
          el.style.width = `${baseW}px`;
          el.style.transform = "";
          el.style.opacity = "";
        }
      }
    },
    [headings, pitch, top, activeIndex, activeDepth, resetMagnet],
  );

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  // The dot and highlight box follow the active row.
  useLayoutEffect(() => {
    // The row (the li), measured against the scroll box: offsets ignore the
    // card's open/close scale, which bounding boxes would not.
    const el = items.current[activeIndex]?.parentElement;
    if (!el) {
      setMarker(null);
      return;
    }
    setMarker({ y: el.offsetTop, h: el.offsetHeight });
    // Keep the active row in view in a long list, without scrolling the page
    // (that would cancel the jump's own smooth scroll).
    const box = list.current;
    if (box && open) {
      if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop - 8;
      else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight)
        box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 8;
    }
  }, [activeIndex, headings, open, host]);

  // A soft cue when the card opens.
  useEffect(() => {
    if (open && !opened.current) playSound("open", { velocity: 0.45 });
    opened.current = open;
  }, [open]);

  // A soft tick once the dot settles on a new row, never a stream while
  // scrolling. Only while the card (and so the dot) is on screen.
  useEffect(() => {
    if (ticked.current === null) {
      ticked.current = current;
      return;
    }
    const win = nav.current?.ownerDocument.defaultView;
    if (!win) return;
    const id = win.setTimeout(() => {
      if (current !== ticked.current) {
        if (open) playSound("tick", { velocity: 0.5 });
        ticked.current = current;
      }
    }, 220);
    return () => win.clearTimeout(id);
  }, [current, open]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      releasePin.current?.();
    },
    [],
  );

  const popupOpen = () =>
    Boolean(nav.current?.querySelector("[data-popup-open]"));
  const focusInside = () =>
    Boolean(nav.current?.contains(nav.current.ownerDocument.activeElement));

  const scheduleClose = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(function check() {
      // An open icon picker belongs to a row: hold the card until it closes.
      if (popupOpen()) {
        timer.current = window.setTimeout(check, 300);
        return;
      }
      if (!hovered.current && !focusInside()) {
        setOpen(false);
        setFocusIndex(-1);
      }
    }, 180);
  };

  const jump = (id: string) => {
    const win = nav.current?.ownerDocument.defaultView;
    releasePin.current?.();
    ticked.current = id; // the click already made its sound
    setPinned(id);
    onJump(id);
    if (!win) return;
    // Release the hold once the jump has landed and the reader scrolls on.
    let stopNext: (() => void) | null = null;
    const stopSettle = afterScroll(win, () => {
      const onScroll = () => {
        win.removeEventListener("scroll", onScroll, true);
        setPinned(null);
      };
      win.addEventListener("scroll", onScroll, { capture: true, passive: true });
      stopNext = () => win.removeEventListener("scroll", onScroll, true);
    });
    releasePin.current = () => {
      stopSettle();
      stopNext?.();
    };
  };

  const move = (index: number) => {
    const next = Math.max(0, Math.min(headings.length - 1, index));
    setFocusIndex(next);
    setOpen(true);
    setDismissed(false);
    items.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Keys typed in a portalled picker bubble here through React; leave them.
    if (!nav.current?.contains(event.target as Node)) return;
    const at = items.current.findIndex((el) => el === event.target);
    const from = at >= 0 ? at : rove;
    if (event.key === "ArrowDown") move(from + 1);
    else if (event.key === "ArrowUp") move(from - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(headings.length - 1);
    else if (event.key === "Escape" && open) {
      setOpen(false);
      setDismissed(true);
    } else return;
    event.preventDefault();
  };

  if (headings.length < 2) return <span ref={anchor} hidden />;

  // While the card is closed the marker jumps, so it is already in place when the card opens.
  const markerInstant = !open;

  const outline = (
    <>
      <nav
        ref={nav}
        className="page-outline"
        aria-label={label}
        data-variant={variant}
        data-open={open || undefined}
        data-dismissed={dismissed || undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === "touch") return;
          hovered.current = true;
          window.clearTimeout(timer.current);
          // A short intent delay, so passing the pointer by doesn't flash it.
          timer.current = window.setTimeout(() => {
            setOpen(true);
            setDismissed(false);
          }, 70);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          hovered.current = false;
          scheduleClose();
        }}
        onFocus={(event) => {
          if (!nav.current?.contains(event.target as Node)) return;
          window.clearTimeout(timer.current);
          if (!dismissed) setOpen(true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && nav.current?.contains(next)) return;
          setDismissed(false);
          scheduleClose();
        }}
        onKeyDown={onKeyDown}
      >
        <div
          ref={stripRef}
          className="page-outline-strip"
          aria-hidden="true"
          style={{ height: headings.length * pitch }}
          onPointerMove={(e) => {
            if (e.pointerType === "touch") return;
            cancelAnimationFrame(rafId.current);
            rafId.current = requestAnimationFrame(() => {
              applyMagnet(e.clientX, e.clientY);
            });
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "touch") return;
            cancelAnimationFrame(rafId.current);
            resetMagnet();
          }}
        >
          {headings.map((h, i) => (
            <span
              key={h.id}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="page-outline-line"
              style={{ top: i * pitch, width: lineWidth(h.level - top) }}
            />
          ))}
          {activeIndex >= 0 ? (
            <span
              ref={activeLineRef}
              className="page-outline-line page-outline-line-active"
              style={{
                transform: `translateY(${activeIndex * pitch}px)`,
                width: lineWidth(activeDepth) + 8,
              }}
            />
          ) : null}
        </div>

        <div
          className="page-outline-card"
          onPointerEnter={() => {
            cancelAnimationFrame(rafId.current);
            resetMagnet();
          }}
        >
          <div className="page-outline-header">
            <span className="page-outline-title">{label}</span>
            <span className="page-outline-count">{headings.length} sections</span>
          </div>
          <div ref={list} className="page-outline-scroll" data-lenis-prevent>
            {marker ? (
              <span
                className="page-outline-marker"
                aria-hidden="true"
                style={{
                  transform: `translateY(${marker.y}px)`,
                  height: marker.h,
                  transition: markerInstant ? "none" : undefined,
                }}
              >
                <span className="page-outline-dot" />
              </span>
            ) : null}
            <ol>
              {headings.map((h, i) => {
                const active = i === activeIndex;
                const body = (
                  <>
                    {h.icon ? <Icon value={h.icon} /> : null}
                    <span className="page-outline-text">{h.text}</span>
                  </>
                );
                const shared = {
                  ref: (el: HTMLElement | null) => {
                    items.current[i] = el;
                  },
                  className: "page-outline-link",
                  "data-active": active || undefined,
                  "aria-current": active ? ("location" as const) : undefined,
                  "data-sound": "select",
                  tabIndex: i === rove ? 0 : -1,
                  title: h.text,
                  onFocus: () => setFocusIndex(i),
                };
                return (
                  <li
                    key={h.id}
                    className="page-outline-item"
                    data-depth={Math.min(h.level - top, 3)}
                  >
                    {asLinks ? (
                      <a
                        {...shared}
                        href={`#${h.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          haptic();
                          jump(h.id);
                        }}
                      >
                        {body}
                      </a>
                    ) : (
                      <button
                        {...shared}
                        type="button"
                        onClick={() => {
                          haptic();
                          jump(h.id);
                        }}
                      >
                        {body}
                      </button>
                    )}
                    {renderAction ? renderAction(h, i === rove ? 0 : -1) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </nav>

      {variant !== "editor" && headings.length >= 2 ? (
        <>
          <button
            type="button"
            className="toc-mobile-pill"
            aria-expanded={mobileSheetOpen}
            aria-controls="toc-mobile-sheet"
            aria-label="Table of contents"
            onClick={() => {
              haptic();
              setMobileSheetOpen((prev) => {
                if (!prev) playSound("open", { velocity: 0.45 });
                return !prev;
              });
            }}
          >
            <svg className="toc-ring" viewBox="0 0 20 20" aria-hidden="true">
              <circle className="toc-ring-track" cx="10" cy="10" r="8" />
              <circle
                className="toc-ring-fill"
                cx="10"
                cy="10"
                r="8"
                pathLength="1"
                style={{ strokeDashoffset: Math.max(0, 1 - scrollProgress) }}
              />
            </svg>
            <span className="toc-pill-label">Contents</span>
            <span className="toc-pill-count">{headings.length}</span>
            <svg
              className={`toc-pill-chevron ${mobileSheetOpen ? "is-open" : ""}`}
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4 10l4-4 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className={`toc-sheet-scrim ${mobileSheetOpen ? "is-open" : ""}`}
            onClick={() => setMobileSheetOpen(false)}
            aria-hidden="true"
          />

          <div
            id="toc-mobile-sheet"
            className={`toc-sheet-dialog ${mobileSheetOpen ? "is-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Table of contents"
          >
            <div className="toc-sheet-handle" aria-hidden="true" />
            <div className="toc-sheet-header">
              <div className="toc-sheet-title-wrap">
                <h2 className="toc-sheet-title">{label || "Contents"}</h2>
                <span className="toc-sheet-count">{headings.length} sections</span>
              </div>
              <button
                type="button"
                className="toc-sheet-close"
                aria-label="Close contents"
                onClick={() => setMobileSheetOpen(false)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="toc-sheet-scroll" data-lenis-prevent>
              <ol className="toc-sheet-list">
                {headings.map((h, i) => {
                  const active = h.id === current;
                  return (
                    <li
                      key={h.id}
                      className="toc-sheet-item"
                      data-depth={Math.min(h.level - top, 3)}
                      style={{ "--stagger-i": i } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className={`toc-sheet-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "location" : undefined}
                        onClick={() => {
                          haptic();
                          playSound("select", { velocity: 0.5 });
                          jump(h.id);
                          setMobileSheetOpen(false);
                        }}
                      >
                        {active ? (
                          <span className="toc-sheet-dot" aria-hidden="true" />
                        ) : null}
                        {h.icon ? <Icon value={h.icon} /> : null}
                        <span className="toc-sheet-text">{h.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  return (
    <>
      <span ref={anchor} hidden />
      {host ? createPortal(outline, host) : null}
    </>
  );
}
