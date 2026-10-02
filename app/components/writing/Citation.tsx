"use client";

import { PreviewCard } from "@base-ui/react/preview-card";

/*
 * An inline citation: a small numbered pill (after Kobra's inline citations
 * and shadcn's, minimal) that opens a card on hover or focus with the
 * source's title, site and a snippet. The pill itself links to the source in
 * the list at the end of the article, so a tap on a phone, or a reader with
 * no script, still gets there.
 */

export type CitationProps = { index: string; href: string; title: string; site: string; snippet: string; id?: string };

export default function Citation({ index, href, title, site, snippet, id }: CitationProps) {
  const initial = (site || "?").trim().charAt(0).toUpperCase();
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        href={`#source-${index}`}
        id={id}
        className="citation"
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
