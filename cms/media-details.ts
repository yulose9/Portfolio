/*
 * A media item's editable details, and the rules for replacing its file.
 *
 * Details live beside the file, in media-meta/<identity>.json (see
 * cms/media-library.ts), as one small JSON object:
 *
 *   { "title": "…", "alt": "…", "caption": "…", "trashed": false }
 *
 * Every field is optional, so files written before captions existed still
 * read cleanly. The file's own R2 custom metadata carries its digest and,
 * once it has been replaced, a `version` the admin appends to its URL.
 */

export const MEDIA_LIMITS = { title: 200, alt: 1000, caption: 2000 } as const;

export type MediaDetails = {
  title: string;
  alt: string;
  caption: string;
  trashed: boolean;
};

export type MediaDetailErrors = Partial<Record<keyof typeof MEDIA_LIMITS, string>>;

const text = (value: unknown, limit: number) =>
  typeof value === "string" ? value.slice(0, limit) : "";

/** Whatever is stored, as a complete details object; unknown or wrong-typed fields fall away. */
export function parseMediaDetails(value: unknown): MediaDetails {
  const v = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    title: text(v.title, MEDIA_LIMITS.title),
    alt: text(v.alt, MEDIA_LIMITS.alt),
    caption: text(v.caption, MEDIA_LIMITS.caption),
    trashed: v.trashed === true,
  };
}

const NAMES: Record<keyof typeof MEDIA_LIMITS, string> = {
  title: "Name",
  alt: "Alt text",
  caption: "Caption",
};

/** One message per field that is too long (after trimming); empty when all are fine. */
export function validateMediaDetails(value: Partial<Record<keyof typeof MEDIA_LIMITS, unknown>>): MediaDetailErrors {
  const errors: MediaDetailErrors = {};
  for (const field of Object.keys(MEDIA_LIMITS) as (keyof typeof MEDIA_LIMITS)[]) {
    const input = value[field];
    if (input === undefined) continue;
    if (typeof input !== "string") errors[field] = `${NAMES[field]} must be text.`;
    else if (input.trim().length > MEDIA_LIMITS[field])
      errors[field] = `${NAMES[field]} is ${input.trim().length.toLocaleString("en-US")} characters; the limit is ${MEDIA_LIMITS[field].toLocaleString("en-US")}.`;
  }
  return errors;
}

/** The file types the upload API stores, and their extensions. */
export const MEDIA_TYPES: Record<string, string[]> = {
  "image/webp": ["webp"],
  "image/jpeg": ["jpg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "audio/mp4": ["m4a"],
  "audio/webm": ["webm"],
  "audio/mpeg": ["mp3"],
  "audio/ogg": ["ogg"],
};

const family = (type: string) => type.split("/")[0];

/**
 * Whether a file of type `next` may take the place of one of type `current`.
 * An image may become any stored image type (pages render it through <img>,
 * which reads the served Content-Type). Video and audio must keep their exact
 * container, so every player and poster that already points at the URL plays
 * it the same way.
 */
export function replacementAllowed(current: string, next: string): boolean {
  if (!MEDIA_TYPES[next] || !MEDIA_TYPES[current]) return false;
  if (family(current) !== family(next)) return false;
  return family(current) === "image" || current === next;
}

/** Why a replacement is refused, in words, or null when it is allowed. */
export function replacementProblem(current: string, next: string): string | null {
  if (replacementAllowed(current, next)) return null;
  const was = family(current);
  if (!MEDIA_TYPES[next]) return "That file type can't be stored. Choose a photo, video or audio file.";
  if (family(next) !== was) return `This is ${was === "image" ? "an image" : `a${was === "audio" ? "n" : ""} ${was} file`}, so it can only be replaced by another ${was === "image" ? "image" : `${was} file`}.`;
  return `Choose a ${MEDIA_TYPES[current][0].toUpperCase()} file, the same format as the one it replaces.`;
}

export type MediaPart = { name: string; role: "main" | "variant" | "poster"; width?: number; height?: number };

const NAMED = /^\/media\/(\d{4})\/([a-z0-9]{10,24})-(\d{1,5})x(\d{1,5})\.([a-z0-9]+)$/;
/** Widths the uploader writes beside a photo (app/admin/ui/media.ts). */
const LADDER = [640, 1280];

/**
 * Every file that makes up the asset at `src`, in the order a replacement
 * writes them: the smaller widths and poster first, the main file last, so
 * the URL pages use changes only once the rest is in place.
 */
export function mediaParts(src: string, type: string): MediaPart[] {
  const file = src.split("/").pop() ?? "";
  const m = NAMED.exec(src);
  if (!m) return [{ name: file, role: "main" }];
  const [, , id, w, h] = m;
  const width = Number(w);
  const height = Number(h);
  const main: MediaPart = { name: file, role: "main", ...(width && height ? { width, height } : {}) };
  if (family(type) === "image" && width && height) {
    return [
      ...LADDER.filter((x) => x < width).map((x) => ({ name: `${id}-${x}.webp`, role: "variant" as const, width: x, height: Math.round((height * x) / width) })),
      main,
    ];
  }
  if (family(type) === "video") return [{ name: `${id}-poster.webp`, role: "poster", width: Math.min(width, 1280) }, main];
  return [main];
}

/** Whether `part` (a file name) belongs to the asset at `src`: its main file, a width, or its poster. */
export function isMediaPart(src: string, part: string): boolean {
  const file = src.split("/").pop() ?? "";
  if (part === file) return true;
  const id = NAMED.exec(src)?.[2];
  return Boolean(id) && new RegExp(`^${id}-(?:\\d{2,5}|poster)\\.(?:webp|jpg)$`).test(part);
}

/** The intrinsic size a media name records, if it records one. */
export function mediaDimensions(src: string): { width: number; height: number } | null {
  const m = NAMED.exec(src);
  if (!m) return null;
  const width = Number(m[3]);
  const height = Number(m[4]);
  return width && height ? { width, height } : null;
}

/** The URL the admin shows: the same file, with its replacement version so no cache serves an old copy. */
export function versionedSrc(src: string, version?: string | null): string {
  return version ? `${src}?v=${encodeURIComponent(version)}` : src;
}
