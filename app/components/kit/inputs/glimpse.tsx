"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "../../../lib/cn";

/*
 * A glimpse of where a link goes before following it (shadcn.io's glimpse):
 * the page's image, title, description and site, in a card on hover or
 * focus. Built on Base UI's PreviewCard, so the trigger stays a real <a> —
 * it navigates, it middle-clicks, it is in the tab order — and the card is
 * the extra, never the only way to the information.
 *
 * The card's data can be given up front (an article we already have) or
 * fetched the first time the card opens with `load`; results are cached per
 * URL for the page's lifetime so passing back over a link doesn't refetch.
 */

export type GlimpseData = {
  title?: string;
  description?: string;
  image?: string;
  /** Shown under the title. Defaults to the link's host. */
  site?: string;
};

const cache = new Map<string, Promise<GlimpseData | null>>();

function useGlimpse(href: string, open: boolean, data?: GlimpseData, load?: (href: string) => Promise<GlimpseData | null>) {
  const [loaded, setLoaded] = useState<{ href: string; data: GlimpseData | null } | null>(null);
  useEffect(() => {
    if (!open || data || !load) return;
    let live = true;
    if (!cache.has(href)) cache.set(href, load(href).catch(() => null));
    cache.get(href)!.then((d) => {
      if (live) setLoaded({ href, data: d });
    });
    return () => {
      live = false;
    };
  }, [open, href, data, load]);
  if (data) return { data, pending: false };
  if (!load) return { data: null, pending: false };
  return loaded?.href === href ? { data: loaded.data, pending: false } : { data: null, pending: true };
}

function host(href: string) {
  try {
    return new URL(href, "https://x.invalid").host.replace(/^www\./, "") || href;
  } catch {
    return href;
  }
}

export type GlimpseProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  data?: GlimpseData;
  load?: (href: string) => Promise<GlimpseData | null>;
  /** ms before the card opens. */
  delay?: number;
  side?: "top" | "bottom";
  cardClassName?: string;
  children: ReactNode;
};

export function Glimpse({ href, data, load, delay = 350, side = "top", className, cardClassName, children, ...props }: GlimpseProps) {
  const [open, setOpen] = useState(false);
  const { data: card, pending } = useGlimpse(href, open, data, load);

  return (
    <PreviewCard.Root open={open} onOpenChange={setOpen}>
      <PreviewCard.Trigger
        href={href}
        delay={delay}
        closeDelay={150}
        data-slot="glimpse-trigger"
        className={cn("ki-glimpse-trigger", className)}
        {...props}
      >
        {children}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side={side} sideOffset={8} collisionPadding={12} className="ki-positioner">
          <PreviewCard.Popup data-slot="glimpse" className={cn("ki-popup ki-glimpse", cardClassName)} aria-busy={pending || undefined}>
            {pending ? (
              <div className="ki-glimpse-skeleton" aria-label="Loading preview">
                <span />
                <span />
                <span />
              </div>
            ) : card ? (
              <>
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- any host, any size: next/image would need each one allow-listed
                  <img className="ki-glimpse-image" src={card.image} alt="" width={1200} height={630} loading="lazy" decoding="async" />
                ) : null}
                {card.title ? <p className="ki-glimpse-title">{card.title}</p> : null}
                {card.description ? <p className="ki-glimpse-description">{card.description}</p> : null}
                <p className="ki-glimpse-site">{card.site ?? host(href)}</p>
              </>
            ) : (
              <p className="ki-glimpse-site">{host(href)}</p>
            )}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export default Glimpse;
