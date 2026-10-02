"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { useEffect, type MouseEvent } from "react";

/*
 * An inline citation: a small numbered pill (after Kobra's inline citations
 * and shadcn's, minimal) that opens a card on hover or focus with the
 * source's title, site and a snippet. The pill itself links to the source in
 * the list at the end of the article, so a tap on a phone, or a reader with
 * no script, still gets there.
 */

/**
 * Jumps between a citation and its source inside the article. Scrolls the
 * nearest scroller (the window on the site, the admin's page view in the
 * editor), washes the target briefly, and moves focus there. On the site the
 * address keeps the #source-n anchor; inside the admin the URL is left alone.
 */
function jumpTo(target: HTMLElement | null, hash: string) {
  if (!target) return false;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  target.classList.remove("is-cite-target");
  void target.offsetWidth;
  target.classList.add("is-cite-target");
  window.setTimeout(() => target.classList.remove("is-cite-target"), 1500);
  const focusable = target.matches("a, button") ? target : target.querySelector<HTMLElement>("a");
  focusable?.focus({ preventScroll: true });
  if (!location.pathname.startsWith("/admin")) history.replaceState(history.state, "", hash);
  return true;
}

const scopeOf = (el: Element) => el.closest(".article-body") ?? document;
const byId = (scope: Element | Document, id: string) => scope.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);

/* The ↩ links in the sources list are plain anchors from the renderer; one
   listener for the page handles them, however many citations there are. */
let backListeners = 0;
function onBackClick(e: Event) {
  const link = (e.target as Element | null)?.closest?.("a.article-source-back");
  if (!link) return;
  const id = link.getAttribute("href")?.slice(1) ?? "";
  if (jumpTo(byId(scopeOf(link), id), `#${id}`)) e.preventDefault();
}

export type CitationProps = { index: string; href: string; title: string; site: string; snippet: string; id?: string };

export default function Citation({ index, href, title, site, snippet, id }: CitationProps) {
  const initial = (site || "?").trim().charAt(0).toUpperCase();
  useEffect(() => {
    if (backListeners++ === 0) document.addEventListener("click", onBackClick);
    return () => {
      if (--backListeners === 0) document.removeEventListener("click", onBackClick);
    };
  }, []);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (jumpTo(byId(scopeOf(e.currentTarget), `source-${index}`), `#source-${index}`)) e.preventDefault();
  };
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        href={`#source-${index}`}
        id={id}
        className="citation"
        onClick={onClick}
        aria-label={`Source ${index}: ${title || site}`}
        delay={150}
        closeDelay={120}
      >
        {index}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8} collisionPadding={12} className="citation-positioner">
          <PreviewCard.Popup className="citation-card">
            <p className="citation-site">
              <span className="citation-initial" aria-hidden="true">{initial}</span>
              <span>{site}</span>
              <span className="citation-index">[{index}]</span>
            </p>
            <a className="citation-title" href={href} target="_blank" rel="noreferrer">
              {title || href}
            </a>
            {snippet ? <p className="citation-snippet">{snippet}</p> : null}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
