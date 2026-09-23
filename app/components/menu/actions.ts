const SITE = "https://nazarene.dev";
const EMAIL = "jannazarene09@gmail.com";
const REPO = "https://github.com/yulose9/Portfolio";

/**
 * Copy text, preferring the async Clipboard API.
 *
 * The fallback matters more than it looks: navigator.clipboard is undefined on
 * any page served over plain HTTP, and it rejects outright in some embedded
 * webviews even on HTTPS. The execCommand path is deprecated and still the only
 * thing that works in both of those cases.
 */
export async function copy(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through — a rejected permission is not worth surfacing here.
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  // Kept on screen but invisible: a display:none textarea cannot be selected.
  scratch.setAttribute("readonly", "");
  scratch.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
  document.body.appendChild(scratch);
  scratch.select();
  try {
    document.execCommand("copy");
  } finally {
    scratch.remove();
  }
}

/** Open in a new tab, with the opener relationship severed. */
export function openUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openEmail(subject?: string, body?: string): void {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  window.location.href = `mailto:${EMAIL}${query ? `?${query}` : ""}`;
}

export function searchWeb(query: string): void {
  openUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
}

/** The current selection, collapsed whitespace, or "" when nothing is selected. */
export function currentSelection(): string {
  return (window.getSelection()?.toString() ?? "").replace(/\s+/g, " ").trim();
}

export const LINKS = { SITE, EMAIL, REPO };
