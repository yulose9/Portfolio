"use client";
import { safeInlineUrl } from "../../../cms/inline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OutlineItem } from "../../lib/writing";
import { PageOutline, afterScroll, flashElements, prefersReducedMotion } from "./PageOutline";

/**
 * The article's contents. On wide screens with a mouse, Notion's outline on
 * the right edge (PageOutline). Elsewhere, a sticky disclosure above the
 * body; it renders open, so the markup is complete without script, and
 * script closes it. The section you're reading is tracked here and shared by
 * both.
 */
export default function Toc({ items }: { items: OutlineItem[] }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const viewport = disclosure.current?.ownerDocument.defaultView;
    if (!viewport) return;
    const wide = viewport.matchMedia("(min-width: 1440px)");
    const sync = () => { if (disclosure.current) disclosure.current.open = wide.matches; };
    sync();
    // Settled: the CSS that held the list hidden until now can let go.
    disclosure.current?.setAttribute("data-ready", "");
    const doc = disclosure.current!.ownerDocument;
    let frame = 0;
    const update = () => {
      frame = 0;
      const heads = items.map(item => doc.getElementById(item.id)).filter((h): h is HTMLElement => Boolean(h));
      let current = heads[0];
      for (const head of heads) if (head.getBoundingClientRect().top < viewport.innerHeight * .3) current = head;
      setActive(current?.id ?? null);
    };
    // Captured, so a scrolling sheet (the admin preview) counts as well as the page.
    const scroll = () => { if (!frame) frame = viewport.requestAnimationFrame(update); };
    viewport.addEventListener("scroll", scroll, { capture: true, passive: true });
    update();
    wide.addEventListener("change", sync);
    return () => { wide.removeEventListener("change", sync); viewport.removeEventListener("scroll", scroll, true); viewport.cancelAnimationFrame(frame); };
  }, [items]);

  // Keep the disclosure's marked row in view inside its own scroll box.
  useEffect(() => {
    const list = disclosure.current?.querySelector("ol");
    const link = active ? disclosure.current?.querySelector<HTMLElement>(`[data-toc-link="${CSS.escape(active)}"]`) : null;
    if (!list || !link || !disclosure.current?.open) return;
    const r = link.getBoundingClientRect(), lr = list.getBoundingClientRect();
    if (r.top < lr.top) list.scrollTop -= lr.top - r.top + 8;
    else if (r.bottom > lr.bottom) list.scrollTop += r.bottom - lr.bottom + 8;
  }, [active]);

  const jump = useCallback((id: string) => {
    const doc = disclosure.current?.ownerDocument;
    const viewport = doc?.defaultView;
    if (!doc || !viewport) return;
    if (viewport.innerWidth < 1440 && disclosure.current) disclosure.current.open = false;
    // A history entry, so Back returns to where the reader was.
    viewport.history.pushState(null, "", `#${id}`);
    viewport.requestAnimationFrame(() => {
      const head = doc.getElementById(id);
      if (!head) return;
      head.scrollIntoView({ block: "start", behavior: prefersReducedMotion(viewport) ? "auto" : "smooth" });
      // Focus follows the jump, so the next Tab continues from the
      // section rather than from inside the contents list.
      if (!head.hasAttribute("tabindex")) head.tabIndex = -1;
      head.focus({ preventScroll: true });
      // Once it lands, a brief wash over the heading and its first block.
      afterScroll(viewport, () => {
        const next = head.nextElementSibling;
        flashElements([head, next && !/^H[1-6]$/.test(next.tagName) ? next : null]);
      });
    });
  }, []);

  const headings = useMemo(
    () => items.map(item => ({ id: item.id, text: item.text, level: item.depth, icon: item.icon })),
    [items],
  );

  return (
    <>
      <div className="toc-rail">
        <nav className="toc" aria-label="On this page">
          <details ref={disclosure} open>
          <summary className="toc-title">On this page <span aria-hidden="true">⌄</span></summary>
          <ol data-lenis-prevent>
            {items.map((item) => (
              <li key={item.id} data-depth={item.depth}>
                <a
                  href={`#${item.id}`}
                  data-toc-link={item.id}
                  data-active={active === item.id || undefined}
                  aria-current={active === item.id ? "location" : undefined}
                  onClick={(event) => { event.preventDefault(); jump(item.id); }}
                >
                  {item.icon ? <span className="toc-icon" aria-hidden="true">{safeInlineUrl(item.icon, true) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={safeInlineUrl(item.icon, true)} alt="" />
                  ) : item.icon}</span> : null}{item.text}
                </a>
              </li>
            ))}
          </ol>
          </details>
        </nav>
      </div>
      <PageOutline headings={headings} activeId={active} onJump={jump} label="On this page" asLinks variant="site" />
    </>
  );
}
