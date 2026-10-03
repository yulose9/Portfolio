/*
 * The icon library's data: which Iconify sets it offers, how their listings
 * are read, and how a picked icon becomes a file of our own.
 *
 * Browsing and search use the Iconify API through our own admin proxy
 * (functions/api/admin/icons), so none of its 200k icons ship with the admin
 * and the browser never talks to Iconify itself: a third-party host gets
 * rate-limited and blocked by privacy extensions, and its 429s carry no CORS
 * header, which the browser reports as "Failed to fetch". The grid draws each
 * page from one bulk request per set (IconifyJSON), not one image per icon.
 *
 * A picked icon never stays on Iconify: its SVG is fetched once, cleaned, and
 * uploaded through the inline logo path (app/admin/ui/media.ts), which draws
 * it at 256px and stores a WebP in the media library. The upload endpoint
 * refuses SVG on purpose (an SVG served from this origin can carry script),
 * so a raster copy is what the published page loads. Monochrome sets are
 * therefore coloured before upload.
 */

import { ICON_SETS } from "../../../cms/icon-sets";

export { ICON_SETS, type IconSet } from "../../../cms/icon-sets";

/** The admin's Iconify proxy; it forwards only the routes built below. */
export const ICONIFY = "/api/admin/icons";

/** The set menu's first entry: search across every set above at once. */
export const ALL_SETS = "all";

export const iconSet = (prefix: string) => ICON_SETS.find((s) => s.prefix === prefix);

/** "ph:house" → { prefix: "ph", name: "house" }. */
export function splitIcon(id: string): { prefix: string; name: string } | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(id);
  return m ? { prefix: m[1], name: m[2] } : null;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** The colour param Iconify takes: only monochrome sets, only a hex. */
function colourParam(id: string, colour: string | null): string {
  const set = iconSet(splitIcon(id)?.prefix ?? "");
  return colour && set?.mono && HEX.test(colour) ? `color=${encodeURIComponent(colour.toLowerCase())}` : "";
}

/** One icon's SVG, at 256px for the upload. */
export function iconSvgUrl(id: string, colour: string | null = null, height?: number): string {
  const icon = splitIcon(id);
  if (!icon) return "";
  const params = [colourParam(id, colour), height ? `height=${height}` : ""].filter(Boolean).join("&");
  return `${ICONIFY}/${icon.prefix}/${icon.name}.svg${params ? `?${params}` : ""}`;
}

/** Many icons of one set in a single IconifyJSON answer. */
export function iconDataUrl(prefix: string, names: string[]): string {
  return `${ICONIFY}/${prefix}.json?icons=${names.join(",")}`;
}

export function searchUrl(query: string, prefix: string): string {
  const q = new URLSearchParams({ query: query.trim(), limit: "999" });
  if (prefix === ALL_SETS) q.set("prefixes", ICON_SETS.map((s) => s.prefix).join(","));
  else q.set("prefix", prefix);
  return `${ICONIFY}/search?${q}`;
}

export const collectionUrl = (prefix: string) => `${ICONIFY}/collection?prefix=${encodeURIComponent(prefix)}`;

/* ── Drawing icons from IconifyJSON ──────────────────────────────────── */

type IconProps = { left?: number; top?: number; width?: number; height?: number; rotate?: number; hFlip?: boolean; vFlip?: boolean };

/** What /{prefix}.json?icons=… returns, as far as the library reads it. */
export type IconifyJSON = IconProps & {
  prefix: string;
  icons: Record<string, IconProps & { body: string }>;
  aliases?: Record<string, IconProps & { parent: string }>;
  not_found?: string[];
};

/** One icon, aliases followed and defaults filled in. */
export type IconData = Required<IconProps> & { body: string };

/**
 * An icon's data from an IconifyJSON answer, or null when it isn't there.
 * Aliases point at a parent; their own rotation adds to the parent's and their
 * flips toggle it, while any other property they set wins.
 */
export function readIcon(data: IconifyJSON, name: string): IconData | null {
  const chain: IconProps[] = [];
  let at = name;
  for (let depth = 0; depth < 8; depth++) {
    const icon = data.icons[at];
    if (icon) {
      let rotate = icon.rotate ?? 0;
      let hFlip = Boolean(icon.hFlip);
      let vFlip = Boolean(icon.vFlip);
      const size: Required<Omit<IconProps, "rotate" | "hFlip" | "vFlip">> = {
        left: icon.left ?? data.left ?? 0,
        top: icon.top ?? data.top ?? 0,
        width: icon.width ?? data.width ?? 16,
        height: icon.height ?? data.height ?? 16,
      };
      // Nearest alias last, so its own sizes are the ones that stick.
      for (const alias of chain.reverse()) {
        rotate += alias.rotate ?? 0;
        hFlip = hFlip !== Boolean(alias.hFlip);
        vFlip = vFlip !== Boolean(alias.vFlip);
        for (const key of ["left", "top", "width", "height"] as const) if (alias[key] !== undefined) size[key] = alias[key]!;
      }
      return { body: icon.body, ...size, rotate: ((rotate % 4) + 4) % 4, hFlip, vFlip };
    }
    const alias = data.aliases?.[at];
    if (!alias) return null;
    chain.push(alias);
    at = alias.parent;
  }
  return null;
}

const num = (n: number) => String(Math.round(n * 1e4) / 1e4);

/**
 * An icon as standalone SVG markup, the way Iconify draws it: flips and
 * quarter turns become a transform on the body. Monochrome icons draw in
 * currentColor, which an image can't inherit, so a hex `colour` replaces it.
 */
export function iconMarkup(icon: IconData, colour: string | null = null): string {
  const box = { left: icon.left, top: icon.top, width: icon.width, height: icon.height };
  const transforms: string[] = [];
  let rotate = icon.rotate;
  if (icon.hFlip) {
    if (icon.vFlip) rotate += 2;
    else {
      transforms.push(`translate(${num(box.width + box.left)} ${num(0 - box.top)})`, "scale(-1 1)");
      box.top = box.left = 0;
    }
  } else if (icon.vFlip) {
    transforms.push(`translate(${num(0 - box.left)} ${num(box.height + box.top)})`, "scale(1 -1)");
    box.top = box.left = 0;
  }
  rotate %= 4;
  if (rotate === 1) {
    const c = box.height / 2 + box.top;
    transforms.unshift(`rotate(90 ${num(c)} ${num(c)})`);
  } else if (rotate === 2) {
    transforms.unshift(`rotate(180 ${num(box.width / 2 + box.left)} ${num(box.height / 2 + box.top)})`);
  } else if (rotate === 3) {
    const c = box.width / 2 + box.left;
    transforms.unshift(`rotate(-90 ${num(c)} ${num(c)})`);
  }
  if (rotate % 2 === 1) {
    [box.left, box.top] = [box.top, box.left];
    [box.width, box.height] = [box.height, box.width];
  }
  let body = transforms.length ? `<g transform="${transforms.join(" ")}">${icon.body}</g>` : icon.body;
  if (colour && HEX.test(colour)) body = body.replace(/currentColor/g, colour.toLowerCase());
  const viewBox = [box.left, box.top, box.width, box.height].map(num).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(box.width)}" height="${num(box.height)}" viewBox="${viewBox}">${body}</svg>`;
}

/**
 * SVG markup as an image URL. An <img> runs no script and loads nothing
 * outside itself, so this is the safe way to show markup from Iconify.
 */
export const svgImageUrl = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

/** What /collection returns, as far as the library reads it. */
export type CollectionResponse = {
  prefix: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  suffixes?: Record<string, string>;
};

export type Collection = {
  prefix: string;
  /** Every visible icon name, in the set's own order. */
  names: string[];
  categories: { label: string; names: Set<string> }[];
  /** suffix → label; "" is the plain style. Empty when the set has one style. */
  styles: Record<string, string>;
};

export function readCollection(data: CollectionResponse): Collection {
  const seen = new Set<string>();
  const names: string[] = [];
  const add = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    names.push(n);
  };
  const categories = Object.entries(data.categories ?? {}).map(([label, list]) => {
    list.forEach(add);
    return { label, names: new Set(list) };
  });
  (data.uncategorized ?? []).forEach(add);
  const styles = iconSet(data.prefix)?.styles ?? data.suffixes ?? {};
  return { prefix: data.prefix, names, categories, styles };
}

/** The style suffix a name carries: the longest listed one it ends with. */
export function styleOf(name: string, styles: Record<string, string>): string {
  let best = "";
  for (const suffix of Object.keys(styles)) {
    if (suffix && name.endsWith(`-${suffix}`) && suffix.length > best.length) best = suffix;
  }
  return best;
}

/** The style a set opens on: its first listed one. */
export const defaultStyle = (styles: Record<string, string>) => Object.keys(styles)[0] ?? "";

/** The icons to show: one style, one category (or all), in the set's order. */
export function filterNames(collection: Collection, style: string, category: string | null): string[] {
  const inCategory = category ? collection.categories.find((c) => c.label === category)?.names : null;
  const styled = Object.keys(collection.styles).length > 0;
  // One style at a time, so a set doesn't show every icon six times over.
  // Fluent's own list of styles leaves out its other sizes entirely.
  return collection.names.filter((n) => (!inCategory || inCategory.has(n)) && (!styled || styleOf(n, collection.styles) === style));
}

/** "arrow-up-right-24-regular" → "arrow up right", for labels and tooltips. */
export function iconLabel(name: string, styles: Record<string, string> = {}): string {
  const s = styleOf(name, styles);
  return (s ? name.slice(0, -(s.length + 1)) : name).replace(/-/g, " ");
}

/* ── Recently used ───────────────────────────────────────────────────── */

export type RecentIcon = { id: string; colour: string | null };
const RECENT_KEY = "admin-recent-icons";

export function recentIcons(): RecentIcon[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(list)
      ? list.filter((r): r is RecentIcon => Boolean(r) && typeof r.id === "string" && splitIcon(r.id) !== null).slice(0, 24)
      : [];
  } catch {
    return [];
  }
}

export function rememberIcon(icon: RecentIcon) {
  try {
    const rest = recentIcons().filter((r) => r.id !== icon.id || r.colour !== icon.colour);
    localStorage.setItem(RECENT_KEY, JSON.stringify([icon, ...rest].slice(0, 24)));
  } catch {
    /* private mode */
  }
}

/* ── Making the icon ours ────────────────────────────────────────────── */

const FORBIDDEN = new Set(["script", "foreignobject", "iframe", "object", "embed", "audio", "video", "canvas", "image", "animate", "set", "animatemotion", "animatetransform", "handler", "listener"]);

/**
 * Strip an SVG down to drawing: no scripts, foreign content, event handlers,
 * outside references or style sheets that could fetch. Internal references
 * (gradients, clip paths, "#id") are kept, since the colour sets need them.
 * Returns the cleaned markup, or "" when it isn't an SVG.
 */
export function sanitizeSvg(markup: string): string {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) return "";
  for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
    const tag = el.nodeName.toLowerCase();
    if (FORBIDDEN.has(tag) || (tag === "style" && /@import|url\(\s*['"]?(?!#)/i.test(el.textContent ?? ""))) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      const external = /url\(\s*['"]?(?!#)/i.test(value);
      if (name.startsWith("on") || /javascript:|data:/i.test(value) || external) el.removeAttribute(attr.name);
      else if ((name === "href" || name === "xlink:href") && !value.startsWith("#")) el.removeAttribute(attr.name);
    }
  }
  return new XMLSerializer().serializeToString(root);
}

/** A colour the canvas can name, as #rrggbb: computed colours may be oklch(). */
export function toHex(colour: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(colour)) return colour.toLowerCase();
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  if (!a) return null;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}


/**
 * Fetch, clean and upload one icon; resolves with the media URL to store.
 * `upload` is the inline logo path, passed in so this file stays free of the
 * editor's upload code (and testable).
 */
export async function persistIcon(id: string, colour: string | null, upload: (file: File) => Promise<string>, signal?: AbortSignal): Promise<string> {
  const icon = splitIcon(id);
  if (!icon) throw new Error("That icon name isn't valid.");
  const res = await request(iconSvgUrl(id, colour, 256), signal);
  const clean = sanitizeSvg(await res.text());
  if (!clean) throw new Error("That icon couldn't be read.");
  return upload(new File([clean], `${icon.prefix}-${icon.name}.svg`, { type: "image/svg+xml" }));
}

/* ── Requests: queued, honest about failure, cached for the session ──── */

export type IconErrorKind = "offline" | "busy" | "signin" | "missing" | "failed";

/** A failed icon request, with what went wrong in words the admin can act on. */
export class IconRequestError extends Error {
  constructor(
    message: string,
    readonly kind: IconErrorKind,
  ) {
    super(message);
  }
}

/** Requests in flight at once; the rest wait their turn. */
const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function queued<T>(work: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((go) => waiting.push(go));
  inFlight++;
  try {
    return await work();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

/** GET through the proxy; resolves only with an OK response. */
async function request(url: string, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    // Access answers an expired session with a redirect to its login page.
    res = await queued(() => fetch(url, { credentials: "same-origin", redirect: "manual", signal }));
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new IconRequestError("You're offline, or something on this network is blocking the request.", "offline");
  }
  if (res.ok) return res;
  if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) {
    throw new IconRequestError("Your sign-in expired. Reload the admin to sign in again.", "signin");
  }
  if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
    throw new IconRequestError("Iconify is busy right now. Wait a moment, then try again.", "busy");
  }
  if (res.status === 404) throw new IconRequestError("Iconify doesn't have that icon.", "missing");
  throw new IconRequestError(`The icon request failed (error ${res.status}). Try again.`, "failed");
}

const cache = new Map<string, Promise<unknown>>();

/** GET JSON once per session; a failure is forgotten so Retry can try again. */
export function cachedJson<T>(url: string): Promise<T> {
  let hit = cache.get(url) as Promise<T> | undefined;
  if (!hit) {
    hit = request(url).then((r) => r.json() as Promise<T>);
    hit.catch(() => cache.delete(url));
    cache.set(url, hit);
  }
  return hit;
}

/* ── Icon data for the grid, in bulk ─────────────────────────────────── */

/** Icons one bulk request asks for: a page of the grid. */
const BULK = 120;
/** id → its data, or null when Iconify doesn't have it. */
const icons = new Map<string, IconData | null>();
const loading = new Map<string, Promise<void>>();

/** Data already loaded for an icon: undefined while unknown, null when missing. */
export const iconData = (id: string) => icons.get(id);

const images = new Map<string, string>();

/**
 * A loaded icon as an image URL, in `colour` when its set is monochrome:
 * undefined while its data is unknown, null when it can't be drawn.
 */
export function iconImage(id: string, colour: string | null): string | null | undefined {
  const data = icons.get(id);
  if (!data) return data;
  const tint = iconSet(splitIcon(id)?.prefix ?? "")?.mono ? colour : null;
  const key = `${id}|${tint ?? ""}`;
  let url = images.get(key);
  if (!url) {
    url = svgImageUrl(iconMarkup(data, tint));
    images.set(key, url);
  }
  return url;
}

/**
 * Load the data for these icons: one request per set per page of names,
 * however many sets a search spans. Rejects when a request fails; what did
 * arrive is kept, and the rest can be asked for again.
 */
export async function loadIcons(ids: string[]): Promise<void> {
  const bySet = new Map<string, string[]>();
  const pending: Promise<void>[] = [];
  for (const id of new Set(ids)) {
    if (icons.has(id)) continue;
    const already = loading.get(id);
    if (already) {
      pending.push(already);
      continue;
    }
    const icon = splitIcon(id);
    if (!icon || !iconSet(icon.prefix)) {
      icons.set(id, null);
      continue;
    }
    bySet.set(icon.prefix, [...(bySet.get(icon.prefix) ?? []), icon.name]);
  }
  for (const [prefix, names] of bySet) {
    for (let i = 0; i < names.length; i += BULK) {
      const chunk = names.slice(i, i + BULK);
      const work = request(iconDataUrl(prefix, chunk))
        .then((r) => r.json() as Promise<IconifyJSON>)
        .then((data) => {
          for (const name of chunk) icons.set(`${prefix}:${name}`, data && data.icons ? readIcon(data, name) : null);
        })
        .finally(() => chunk.forEach((name) => loading.delete(`${prefix}:${name}`)));
      for (const name of chunk) loading.set(`${prefix}:${name}`, work);
      pending.push(work);
    }
  }
  const results = await Promise.allSettled(pending);
  const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;
}
