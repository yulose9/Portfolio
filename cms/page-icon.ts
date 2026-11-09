import { fluentUrl } from "./emoji";

/** Page icons are Fluent emoji or an image from our own media pipeline. */
export function cleanPageIcon(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const icon = value.trim();
  if (!icon) return null;
  if (/^\/media\/\d{4}\/[\w-]+\.(?:webp|png|jpg|gif)$/.test(icon)) return icon;
  if (/[<>/:\\]/.test(icon) || [...icon].length > 80) return null;
  return icon;
}

export function pageIconSrc(value: string): string {
  const icon = cleanPageIcon(value);
  return icon?.startsWith("/media/") ? icon : icon ? fluentUrl(icon) : "";
}
