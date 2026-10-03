/*
 * The Iconify sets the admin's icon library offers, and the only Iconify API
 * routes the admin proxy (functions/api/admin/icons/[[path]].ts) forwards.
 * Shared by the browser and the proxy so both agree on what is allowed.
 *
 * Apple's SF Symbols are not here: their licence allows them only in apps
 * for Apple platforms, never on a website. Phosphor, Lucide and Fluent are
 * the nearest in look.
 */

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

const PREFIXES = new Set(ICON_SETS.map((s) => s.prefix));
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Most icons one bulk request may name; keeps the upstream URL short. */
export const MAX_BULK_ICONS = 160;

export const isIconPrefix = (prefix: string) => PREFIXES.has(prefix);
export const isIconName = (name: string) => name.length <= 120 && NAME.test(name);

/** A list of offered prefixes, or null when any one isn't offered. */
function prefixList(value: string | null): string[] | null {
  const list = (value ?? "").split(",").filter(Boolean);
  return list.length && list.every(isIconPrefix) ? list : null;
}

/**
 * The Iconify API path and query a proxied request stands for, rebuilt from
 * validated parts only, or null when it isn't one the admin uses:
 * `collections`, `collection`, `search`, `{prefix}.json?icons=…` and
 * `{prefix}/{name}.svg`.
 */
export function iconifyRoute(path: string, params: URLSearchParams): string | null {
  const out = new URLSearchParams();
  if (path === "collections") {
    const prefixes = params.get("prefixes");
    if (prefixes !== null) {
      const list = prefixList(prefixes);
      if (!list) return null;
      out.set("prefixes", list.join(","));
    }
    return `collections${String(out) ? `?${out}` : ""}`;
  }
  if (path === "collection") {
    const prefix = params.get("prefix") ?? "";
    if (!isIconPrefix(prefix)) return null;
    out.set("prefix", prefix);
    return `collection?${out}`;
  }
  if (path === "search") {
    const query = (params.get("query") ?? "").trim();
    if (!query || query.length > 100) return null;
    out.set("query", query);
    const limit = Number(params.get("limit") ?? "64");
    if (!Number.isInteger(limit) || limit < 32 || limit > 999) return null;
    out.set("limit", String(limit));
    if (params.has("prefix")) {
      const prefix = params.get("prefix") ?? "";
      if (!isIconPrefix(prefix)) return null;
      out.set("prefix", prefix);
    } else {
      const list = prefixList(params.get("prefixes"));
      if (!list) return null;
      out.set("prefixes", list.join(","));
    }
    return `search?${out}`;
  }
  const bulk = /^([a-z0-9-]+)\.json$/.exec(path);
  if (bulk) {
    if (!isIconPrefix(bulk[1])) return null;
    const names = (params.get("icons") ?? "").split(",");
    if (!names.length || names.length > MAX_BULK_ICONS || !names.every(isIconName)) return null;
    out.set("icons", names.join(","));
    return `${bulk[1]}.json?${out.toString().replace(/%2C/g, ",")}`;
  }
  const svg = /^([a-z0-9-]+)\/([a-z0-9-]+)\.svg$/.exec(path);
  if (svg) {
    if (!isIconPrefix(svg[1]) || !isIconName(svg[2])) return null;
    const color = params.get("color");
    if (color !== null) {
      if (!/^#[0-9a-f]{6}$/i.test(color)) return null;
      out.set("color", color.toLowerCase());
    }
    const height = params.get("height");
    if (height !== null) {
      if (!/^\d{1,4}$/.test(height) || Number(height) < 1 || Number(height) > 1024) return null;
      out.set("height", height);
    }
    return `${svg[1]}/${svg[2]}.svg${String(out) ? `?${out}` : ""}`;
  }
  return null;
}
