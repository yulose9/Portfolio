/*
 * The icon library's data: which Iconify sets it offers, how their listings
 * are read, and how a picked icon becomes a file of our own.
 *
 * Browsing and search go to the public Iconify API (api.iconify.design), so
 * none of its 200k icons ship with the admin. A picked icon never stays on
 * Iconify: its SVG is fetched once, cleaned, and uploaded through the inline
 * logo path (app/admin/ui/media.ts), which draws it at 256px and stores a
 * WebP in the media library. The upload endpoint refuses SVG on purpose (an
 * SVG served from this origin can carry script), so a raster copy is what the
 * published page loads. Monochrome sets are therefore coloured before upload.
 *
 * Apple's SF Symbols are not here: their licence allows them only in apps
 * for Apple platforms, never on a website. Phosphor, Lucide and Fluent are
 * the nearest in look.
 */

export const ICONIFY = "https://api.iconify.design";

export type IconSet = {
  prefix: string;
  name: string;
  /** Drawn in one colour (currentColor), so the colour option applies. */
  mono: boolean;
  licence: string;
  /** Overrides the set's own style suffixes (Fluent's come in 20 sizes). */
  styles?: Record<string, string>;
};

/** Every set offered, in the order the set menu lists them. */
export const ICON_SETS: IconSet[] = [
  { prefix: "ph", name: "Phosphor", mono: true, licence: "MIT" },
  { prefix: "fluent", name: "Fluent", mono: true, licence: "MIT", styles: { "24-regular": "Regular", "24-filled": "Filled", "24-light": "Light" } },
  { prefix: "fluent-color", name: "Fluent Color", mono: false, licence: "MIT" },
  { prefix: "fluent-emoji", name: "Fluent Emoji 3D", mono: false, licence: "MIT" },
  { prefix: "fluent-emoji-flat", name: "Fluent Emoji Flat", mono: false, licence: "MIT" },
  { prefix: "lucide", name: "Lucide", mono: true, licence: "ISC" },
  { prefix: "material-symbols", name: "Material Symbols", mono: true, licence: "Apache 2.0" },
  { prefix: "mdi", name: "Material Design Icons", mono: true, licence: "Apache 2.0" },
  { prefix: "tabler", name: "Tabler", mono: true, licence: "MIT" },
  { prefix: "heroicons", name: "Heroicons", mono: true, licence: "MIT" },
  { prefix: "ri", name: "Remix Icon", mono: true, licence: "Apache 2.0" },
  { prefix: "carbon", name: "Carbon", mono: true, licence: "Apache 2.0" },
  { prefix: "bi", name: "Bootstrap Icons", mono: true, licence: "MIT" },
  { prefix: "fa6-solid", name: "Font Awesome 6 Solid", mono: true, licence: "CC BY 4.0" },
  { prefix: "fa6-regular", name: "Font Awesome 6 Regular", mono: true, licence: "CC BY 4.0" },
  { prefix: "fa6-brands", name: "Font Awesome 6 Brands", mono: true, licence: "CC BY 4.0" },
  { prefix: "simple-icons", name: "Simple Icons (brands)", mono: true, licence: "CC0" },
  { prefix: "logos", name: "SVG Logos (brands, colour)", mono: false, licence: "CC0" },
  { prefix: "solar", name: "Solar", mono: true, licence: "CC BY 4.0" },
  { prefix: "iconoir", name: "Iconoir", mono: true, licence: "MIT" },
  { prefix: "mingcute", name: "MingCute", mono: true, licence: "Apache 2.0" },
  { prefix: "streamline", name: "Streamline", mono: true, licence: "CC BY 4.0" },
  { prefix: "streamline-color", name: "Streamline Color", mono: false, licence: "CC BY 4.0" },
  { prefix: "noto", name: "Noto Emoji", mono: false, licence: "Apache 2.0" },
  { prefix: "twemoji", name: "Twemoji", mono: false, licence: "CC BY 4.0" },
  { prefix: "openmoji", name: "OpenMoji", mono: false, licence: "CC BY-SA 4.0" },
  { prefix: "streamline-emojis", name: "Streamline Emojis", mono: false, licence: "CC BY 4.0" },
];

/** The set menu's first entry: search across every set above at once. */
export const ALL_SETS = "all";

export const iconSet = (prefix: string) => ICON_SETS.find((s) => s.prefix === prefix);

/** "ph:house" → { prefix: "ph", name: "house" }. */
export function splitIcon(id: string): { prefix: string; name: string } | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(id);
  return m ? { prefix: m[1], name: m[2] } : null;
}

/** The colour param Iconify takes: only monochrome sets, only a hex. */
function colourParam(id: string, colour: string | null): string {
  const set = iconSet(splitIcon(id)?.prefix ?? "");
  return colour && set?.mono && /^#[0-9a-f]{6}$/i.test(colour) ? `color=${encodeURIComponent(colour.toLowerCase())}` : "";
}

/** One icon's SVG, for previews (and, at 256px, for the upload). */
export function iconSvgUrl(id: string, colour: string | null = null, height?: number): string {
  const icon = splitIcon(id);
  if (!icon) return "";
  const params = [colourParam(id, colour), height ? `height=${height}` : ""].filter(Boolean).join("&");
  return `${ICONIFY}/${icon.prefix}/${icon.name}.svg${params ? `?${params}` : ""}`;
}

export function searchUrl(query: string, prefix: string): string {
  const q = new URLSearchParams({ query: query.trim(), limit: "999" });
  if (prefix === ALL_SETS) q.set("prefixes", ICON_SETS.map((s) => s.prefix).join(","));
  else q.set("prefix", prefix);
  return `${ICONIFY}/search?${q}`;
}

export const collectionUrl = (prefix: string) => `${ICONIFY}/collection?prefix=${encodeURIComponent(prefix)}`;

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
  const res = await fetch(iconSvgUrl(id, colour, 256), { signal });
  if (!res.ok) throw new Error("Iconify didn't send that icon. Try again in a moment.");
  const clean = sanitizeSvg(await res.text());
  if (!clean) throw new Error("That icon couldn't be read.");
  return upload(new File([clean], `${icon.prefix}-${icon.name}.svg`, { type: "image/svg+xml" }));
}

/* ── Requests, cached for the session ────────────────────────────────── */

const cache = new Map<string, Promise<unknown>>();

/** GET JSON once per session; a failure is forgotten so Retry can try again. */
export function cachedJson<T>(url: string): Promise<T> {
  let hit = cache.get(url) as Promise<T> | undefined;
  if (!hit) {
    hit = fetch(url).then((r) => {
      if (!r.ok) throw new Error(r.status === 429 ? "Iconify is busy. Wait a moment and try again." : "Couldn't reach Iconify.");
      return r.json() as Promise<T>;
    });
    hit.catch(() => cache.delete(url));
    cache.set(url, hit);
  }
  return hit;
}
