export const TEXT_COLORS = [
  ["Gray", "#52525b"], ["Brown", "#854d0e"], ["Red", "#b91c1c"],
  ["Orange", "#9a3412"], ["Green", "#166534"], ["Blue", "#1d4ed8"], ["Purple", "#7e22ce"],
] as const;
export function textColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}
export function safeInlineUrl(value: unknown, image = false): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  if (/[\s\\\u0000-\u001f\u007f]/.test(s)) return "";
  if (/^\/(?!\/)/.test(s) || (!image && /^#/.test(s))) return s;
  try { const u = new URL(s); return (image ? ["https:", "http:"] : ["https:", "http:", "mailto:", "tel:"]).includes(u.protocol) ? s : ""; } catch { return ""; }
}
export const escapeInline = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const decodeInline = (s: string) => s.replace(/&(amp|quot|lt|gt);/g, (_, name: string) => ({amp:"&",quot:'"',lt:"<",gt:">"})[name]!);
export function decodeLogoLabel(value: string): string { try { return decodeURIComponent(value).slice(0, 200); } catch { return ""; } }
