import type { Cover } from "./format";

/*
 * How a post's cover is laid out:
 *
 *   classic  the picture on the text's column, under the byline (Notion's)
 *   banner   a full-width header across the top of the page, the page icon
 *            overlapping its bottom edge (a profile header's)
 *
 * The choice rides on the cover itself, as `style`, so it goes wherever the
 * cover goes. A cover without one is classic, as every cover was before.
 */

export type CoverStyle = "classic" | "banner";
export type StyledCover = Cover & { style?: CoverStyle };

export function coverStyle(cover: Cover | null | undefined): CoverStyle {
  return (cover as StyledCover | null | undefined)?.style === "banner" ? "banner" : "classic";
}

/** The cover with this style; classic drops the field, so old covers stay byte-for-byte the same. */
export function withCoverStyle(cover: Cover, style: CoverStyle): Cover {
  const rest: StyledCover = { ...cover };
  delete rest.style;
  return (style === "banner" ? { ...rest, style } : rest) as Cover;
}

/*
 * Where the picture sits in a banner that crops it: 0 shows its top edge,
 * 100 its bottom, 50 (the default, not stored) its middle. Set by dragging
 * the banner in the editor, as Notion's "Reposition" does.
 */
export type PositionedCover = StyledCover & { position?: number };

export function coverPosition(cover: Cover | null | undefined): number {
  const p = (cover as PositionedCover | null | undefined)?.position;
  return typeof p === "number" && Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 50;
}

export function withCoverPosition(cover: Cover, position: number): Cover {
  const rest: PositionedCover = { ...cover };
  delete rest.position;
  const p = Math.round(Math.min(100, Math.max(0, position)) * 10) / 10;
  return (p === 50 ? rest : { ...rest, position: p }) as Cover;
}

/** The banner image's object-position, for the site, the preview and the editor. */
export const coverObjectPosition = (cover: Cover) => `50% ${coverPosition(cover)}%`;

/*
 * How far a banner zooms into its picture: 1 (the default, not stored) up to
 * 3. The zoom grows from the band the position chose, so the two together
 * frame any part of the picture.
 */
export type FramedCover = PositionedCover & { zoom?: number };
export const MAX_COVER_ZOOM = 3;

export function coverZoom(cover: Cover | null | undefined): number {
  const z = (cover as FramedCover | null | undefined)?.zoom;
  return typeof z === "number" && Number.isFinite(z) ? Math.min(MAX_COVER_ZOOM, Math.max(1, z)) : 1;
}

export function withCoverZoom(cover: Cover, zoom: number): Cover {
  const rest: FramedCover = { ...cover };
  delete rest.zoom;
  const z = Math.round(Math.min(MAX_COVER_ZOOM, Math.max(1, zoom)) * 100) / 100;
  return (z === 1 ? rest : { ...rest, zoom: z }) as Cover;
}

/** The banner image's whole framing: where it sits and how far it is zoomed. */
export function coverImageStyle(cover: Cover, position = coverPosition(cover), zoom = coverZoom(cover)) {
  return {
    objectPosition: `50% ${position}%`,
    ...(zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: `50% ${position}%` } : {}),
  };
}
