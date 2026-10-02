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
