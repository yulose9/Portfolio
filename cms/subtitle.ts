import type { Fonts } from "./format";

/*
 * Whether a post shows its subtitle (the dek, the standfirst under the
 * headline). Shown is the default; a hidden one keeps its text, which still
 * serves as the meta description and share-card text.
 *
 * The flag rides on the post's `fonts` object, as `subtitle: false`, the way a
 * cover's layout rides on the cover (cms/cover.ts): `fonts` is the one
 * free-form object the front matter carries verbatim (parsePost and
 * draftToPost pass it through), so the choice is published with the post and
 * needs no new field in the schema. Shown isn't stored.
 */

export type PageFonts = Fonts & { subtitle?: boolean };

export function showsSubtitle(fonts: Fonts | null | undefined): boolean {
  return (fonts as PageFonts | null | undefined)?.subtitle !== false;
}

/** A fonts object with nothing set is stored as null, as it always was. */
export function fontsOrNull(fonts: PageFonts): Fonts | null {
  return fonts.heading || fonts.body || fonts.ligatures === false || fonts.subtitle === false ? fonts : null;
}

export function withSubtitle(fonts: Fonts | null | undefined, shown: boolean): Fonts | null {
  const next: PageFonts = { ...(fonts ?? {}) };
  if (shown) delete next.subtitle;
  else next.subtitle = false;
  return fontsOrNull(next);
}
