"use client";

import { useEffect, useRef } from "react";

import "./image-viewer.css";
import { copy } from "../menu/actions";
import { scrollEdges } from "./scroll-edges";

/*
 * The article's one island. Everything it touches is already in the HTML;
 * this only adds behaviour, so with script off the page is simply static.
 *
 *  - Contents: marks the section you're reading in "On this page".
 *  - Headings: the # beside each copies a link to that section.
 *  - Code: a copy button on every block, its icon morphing to a check.
 *  - Images: click, or Enter/Space when focused, to zoom. The picture flies
 *    from where it sits to the middle of the screen (FLIP, on the
 *    compositor) and back, with the same drawer curve the admin's sheets
 *    use; Escape, a click or a scroll puts it back, and focus returns to it.
 *  - Code and wide tables: focusable, so a keyboard can scroll them sideways;
 *    tables also fade at an edge that has more beyond it (scroll-edges.ts).
 */

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COPY_ICON =
  '<svg class="copy-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
  '<svg class="check-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function headingLinks(root: HTMLElement, canonicalUrl?: string) {
  const doc = root.ownerDocument;
  const viewport = doc.defaultView!;
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>(".heading-anchor");
    if (!a) return;
    e.preventDefault();
    const url = `${canonicalUrl || `${viewport.location.origin}${viewport.location.pathname}`}${a.getAttribute("href")}`;
    if (!canonicalUrl) viewport.history.replaceState(null, "", a.getAttribute("href"));
    void copy(url, "Link to this section copied");
    doc.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

function codeCopy(root: HTMLElement) {
  const document = root.ownerDocument;
  const window = document.defaultView!;
  const buttons: HTMLButtonElement[] = [];
  root.querySelectorAll<HTMLPreElement>(".article-body pre").forEach((pre) => {
    // Framed code (components/code) has its own copy button in its header.
    if (pre.closest(".code-block, .code-tabs")) return;
    const holder = pre.closest("figure") ?? pre;
    if (holder.querySelector(".code-copy")) return;
    const language = pre.getAttribute("data-language");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.setAttribute("aria-label", "Copy code");
    button.innerHTML = COPY_ICON;
    let timer = 0;
    button.addEventListener("click", () => {
      void copy(pre.innerText.replace(/\n$/, ""), language && language !== "plaintext" ? `${language} copied` : "Code copied");
      button.dataset.copied = "";
      // The name follows the icon, so a screen reader hears the check too.
      button.setAttribute("aria-label", "Copied");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete button.dataset.copied;
        button.setAttribute("aria-label", "Copy code");
      }, 1600);
    });
    (holder as HTMLElement).classList.add("has-code-copy");
    holder.appendChild(button);
    buttons.push(button);
  });
  return () => buttons.forEach((b) => b.remove());
}

function imageZoom(root: HTMLElement) {
  const images = [...root.querySelectorAll<HTMLImageElement>("img[data-zoom]")].filter(image => !image.closest("a"));
  let close: (() => void) | undefined;
  let loading = false;
  let disposed = false;
  const attributes = images.map(image => [image, image.getAttribute("tabindex"), image.getAttribute("role"), image.getAttribute("aria-label")] as const);
  for (const image of images) {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", image.alt ? `View larger: ${image.alt}` : "View image larger");
  }
  const zoom = async (image: HTMLImageElement) => {
    if (loading || close) return;
    loading = true;
    image.setAttribute("aria-busy", "true");
    try {
      const viewer = await import("./ImageViewer");
      if (!disposed) close = viewer.openImageViewer(image, images, () => { close = undefined; });
    } catch {
      // Keep the source reachable if the optional enhancement can't load.
      root.ownerDocument.defaultView?.open(image.src, "_blank", "noopener,noreferrer");
    } finally { loading = false; image.removeAttribute("aria-busy"); }
  };
  const click = (event: MouseEvent) => {
    const image = (event.target as Element).closest<HTMLImageElement>("img[data-zoom]");
    if (image && images.includes(image)) void zoom(image);
  };
  const key = (event: KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && images.includes(event.target as HTMLImageElement)) {
      event.preventDefault(); void zoom(event.target as HTMLImageElement);
    }
  };
  root.addEventListener("click", click);
  root.addEventListener("keydown", key);
  return () => {
    disposed = true; close?.();
    root.removeEventListener("click", click);
    root.removeEventListener("keydown", key);
    for (const [image, tab, role, label] of attributes) {
      for (const [name, value] of [["tabindex",tab],["role",role],["aria-label",label]] as const) {
        if (value === null) image.removeAttribute(name); else image.setAttribute(name, value);
      }
    }
  };
}

/** Code scrolls sideways; a keyboard needs to land on it to do it. */
function scrollRegions(root: HTMLElement) {
  const touched: HTMLElement[] = [];
  // Tables in a frame (.table-scroll) are scrollEdges'; this is code and the bare table a chart falls back to.
  for (const el of root.querySelectorAll<HTMLElement>(".article-body pre, .article-body .table-wrap")) {
    if (el.querySelector(":scope > .table-scroll")) continue;
    if (el.scrollWidth <= el.clientWidth + 1 || el.hasAttribute("tabindex")) continue;
    const lang = el.dataset.language;
    el.tabIndex = 0;
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", el.matches("pre") ? `Code${lang && lang !== "plaintext" ? `, ${lang}` : ""}` : "Table");
    touched.push(el);
  }
  return () => {
    for (const el of touched) {
      el.removeAttribute("tabindex");
      el.removeAttribute("role");
      el.removeAttribute("aria-label");
    }
  };
}

/** Wide tables: edge fades on the side there's more to see, and a focusable region while they scroll. */
function tableEdges(root: HTMLElement) {
  const off = Array.from(root.querySelectorAll<HTMLElement>(".article-body .table-wrap > .table-scroll"), (el) => scrollEdges(el));
  return () => off.forEach((fn) => fn());
}

export default function ArticleEnhance({ contentKey, canonicalUrl }: { contentKey?: unknown; canonicalUrl?: string } = {}) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(".article-page");
    if (!root) return;
    const off = [headingLinks(root, canonicalUrl), codeCopy(root), imageZoom(root), scrollRegions(root), tableEdges(root)];
    return () => off.forEach((fn) => fn());
  }, [contentKey, canonicalUrl]);
  return <span ref={marker} hidden />;
}
