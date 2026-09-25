import { markProgrammaticCopy, snippet, toast } from "../../lib/toast";

const SITE = "https://nazarene.dev";
const EMAIL = "jannazarene09@gmail.com";
const REPO = "https://github.com/yulose9/Portfolio";

/*
 * Every menu action goes through these four, so every action confirms itself
 * the same way — a new menu item gets the right toast without asking for it.
 */

/**
 * Copy text, preferring the async Clipboard API, and say so.
 *
 * The fallback matters more than it looks: navigator.clipboard is undefined on
 * any page served over plain HTTP, and it rejects outright in some embedded
 * webviews even on HTTPS. The execCommand path is deprecated and still the only
 * thing that works in both of those cases.
 *
 * @param title the toast's headline, e.g. "Link copied"; the description
 *   previews what actually went to the clipboard.
 */
export async function copy(text: string, title = "Copied to clipboard"): Promise<boolean> {
  const ok = await writeClipboard(text);
  toast.add(
    ok
      ? { type: "success", title, description: snippet(text) }
      : {
          type: "error",
          title: "Couldn’t copy",
          description: "Your browser blocked clipboard access. Select the text and copy it instead.",
          priority: "high",
        }
  );
  return ok;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through — a rejected permission may still allow execCommand.
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  // Kept on screen but invisible: a display:none textarea cannot be selected.
  scratch.setAttribute("readonly", "");
  scratch.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
  document.body.appendChild(scratch);
  scratch.select();
  try {
    // Marked, so the keyboard-copy toast does not fire a second time.
    return markProgrammaticCopy(() => document.execCommand("copy"));
  } catch {
    return false;
  } finally {
    scratch.remove();
  }
}

/**
 * Open in a new tab, with the opener relationship severed.
 *
 * @param what how the toast names the destination, e.g. "the source on
 *   GitHub". Omitted, the toast names the site.
 */
export function openUrl(url: string, what?: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep the raw string */
  }
  toast.add({ type: "info", title: `Opening ${what ?? host}`, description: "In a new tab." });
}

export function openEmail(subject?: string, body?: string): void {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  window.location.href = `mailto:${EMAIL}${query ? `?${query}` : ""}`;
  // Not every machine has a mail app wired up, and when it does not, nothing
  // visibly happens. The address is one tap away either way.
  const id = toast.add({
    type: "info",
    title: "Opening your mail app",
    description: EMAIL,
    timeout: 5000,
    actionProps: {
      children: "Copy address",
      onClick: () => {
        toast.close(id);
        void copy(EMAIL, "Email address copied");
      },
    },
  });
}

export function searchWeb(query: string, title?: string): void {
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  toast.add({ type: "info", title: title ?? "Searching Google", description: snippet(query, 48) });
}

/** The current selection, collapsed whitespace, or "" when nothing is selected. */
export function currentSelection(): string {
  return (window.getSelection()?.toString() ?? "").replace(/\s+/g, " ").trim();
}

export const LINKS = { SITE, EMAIL, REPO };
