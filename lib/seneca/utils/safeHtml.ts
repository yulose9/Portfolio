// @ts-nocheck
/**
 * Untrusted-HTML boundary.
 *
 * Anything that isn't produced by our own TipTap schema — legacy HTML entries,
 * Gemini "Stoic Rewrite" output, pasted content — must pass through here before
 * it reaches the DOM.
 */
import DOMPurify from "dompurify";

const CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "data-type", "data-checked"],
};

// Without a DOM (e.g. server rendering) DOMPurify can't sanitise — fail closed
const isBrowser = typeof window !== "undefined";
const supported = isBrowser && DOMPurify.isSupported && typeof DOMPurify.addHook === "function";

if (supported) {
  // Only allow YouTube iframes; strip every other frame source
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    const el = node as Element;
    if (data.tagName === "iframe" && typeof el.getAttribute === "function") {
      const src = el.getAttribute("src") || "";
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//.test(src)) {
        el.remove();
      }
    }
  });

  // Links opened in a new tab can't reach back into the app
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "A" && typeof el.getAttribute === "function" && el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/** Sanitised HTML string, safe for dangerouslySetInnerHTML. */
export const sanitizeHtml = (html: string): string =>
  supported && typeof html === "string" ? (DOMPurify.sanitize(html, CONFIG as any) as string) : "";

/**
 * Plain text of an HTML string without executing anything: DOMParser builds an
 * inert document (no scripts, no event handlers, no resource loads).
 */
export const htmlToText = (html: string): string => {
  if (typeof html !== "string" || !html || typeof DOMParser === "undefined") return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return parsed.body.textContent || "";
};
