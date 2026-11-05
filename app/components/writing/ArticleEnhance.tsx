"use client";

import { useEffect, useRef } from "react";

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

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
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
  const document = root.ownerDocument;
  const window = document.defaultView!;
  let open: (() => void) | null = null;

  const zoom = (img: HTMLImageElement) => {
    if (open) return;
    const from = img.getBoundingClientRect();
    const ratio = (img.naturalWidth || from.width) / (img.naturalHeight || from.height);
    const maxW = Math.min(window.innerWidth * 0.94, img.naturalWidth || Infinity);
    const maxH = window.innerHeight * 0.9;
    const w = Math.min(maxW, maxH * ratio);
    const h = w / ratio;
    const to = { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h };

    const overlay = document.createElement("div");
    overlay.className = "zoom-overlay";
    // A modal moment: named, focused, and the only thing the keyboard reaches.
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", img.alt ? `${img.alt}, enlarged. Press Escape to close.` : "Image, enlarged. Press Escape to close.");
    overlay.tabIndex = -1;
    const clone = img.cloneNode() as HTMLImageElement;
    clone.removeAttribute("loading");
    clone.removeAttribute("role");
    clone.removeAttribute("aria-label");
    clone.removeAttribute("tabindex");
    clone.removeAttribute("srcset");
    clone.removeAttribute("sizes");
    clone.className = "zoom-image";
    Object.assign(clone.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    clone.alt = "";
    overlay.appendChild(clone);
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "zoom-close";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close enlarged image");
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
    closeButton.focus({ preventScroll: true });
    img.style.visibility = "hidden";

    const invert = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const duration = reduced() ? 0 : 420;
    clone.animate([{ transform: invert, borderRadius: "14px" }, { transform: "none", borderRadius: "6px" }], { duration, easing: EASE, fill: "both" });
    // The veil is the page colour, so in the dark theme the picture lifts out
    // of the dark rather than out of a white flash.
    const veil = document.documentElement.dataset.theme === "dark" ? "25 25 25" : "255 255 255";
    overlay.animate([{ backgroundColor: `rgb(${veil} / 0)` }, { backgroundColor: `rgb(${veil} / 0.94)` }], { duration: duration * 0.7, easing: "ease", fill: "both" });

    const close = () => {
      if (!open) return;
      open = null;
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey, true);
      const back = img.getBoundingClientRect();
      const home = `translate(${back.left - to.left}px, ${back.top - to.top}px) scale(${back.width / to.width}, ${back.height / to.height})`;
      const out = reduced() ? 0 : 280;
      overlay.animate([{ backgroundColor: `rgb(${veil} / 0.94)` }, { backgroundColor: `rgb(${veil} / 0)` }], { duration: out, easing: "ease", fill: "both" });
      clone.animate([{ transform: "none" }, { transform: home, borderRadius: "14px" }], { duration: out, easing: EASE, fill: "both" }).finished.catch(() => {}).then(() => {
        img.style.visibility = "";
        overlay.remove();
        if (img.isConnected && img.tabIndex >= 0) img.focus({ preventScroll: true });
      });
    };
    // Escape, Enter or Space puts it back; Tab stays put (there is nothing
    // else to reach); every other key is left alone, a screen reader's too.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        e.preventDefault();
        closeButton.focus();
      }
    };
    open = close;
    overlay.addEventListener("click", close);
    window.addEventListener("scroll", close, { passive: true, once: true });
    window.addEventListener("resize", close, { passive: true, once: true });
    window.addEventListener("keydown", onKey, true);
  };

  // Zoomable images join the tab order as buttons; one inside a link stays
  // the link's.
  const zoomable = [...root.querySelectorAll<HTMLImageElement>("img[data-zoom]")].filter((img) => !img.closest("a"));
  for (const img of zoomable) {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", img.alt ? `View larger: ${img.alt}` : "View image larger");
  }

  const onClick = (e: MouseEvent) => {
    const img = (e.target as Element).closest<HTMLImageElement>("img[data-zoom]");
    if (!img || img.closest("a")) return;
    zoom(img);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const img = (e.target as Element).closest<HTMLImageElement>("img[data-zoom]");
    if (!img || img.closest("a")) return;
    e.preventDefault();
    zoom(img);
  };
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    for (const img of zoomable) {
      img.removeAttribute("tabindex");
      img.removeAttribute("role");
      img.removeAttribute("aria-label");
    }
    open?.();
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
