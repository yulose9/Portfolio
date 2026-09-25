"use client";

import { useEffect } from "react";

import { copy } from "../menu/actions";

/*
 * The article's one island. Everything it touches is already in the HTML;
 * this only adds behaviour, so with script off the page is simply static.
 *
 *  - Contents: marks the section you're reading in "On this page".
 *  - Headings: the # beside each copies a link to that section.
 *  - Code: a copy button on every block, its icon morphing to a check.
 *  - Images: click to zoom. The picture flies from where it sits to the
 *    middle of the screen (FLIP, on the compositor) and back, with the same
 *    drawer curve the admin's sheets use; any scroll or key puts it back.
 */

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COPY_ICON =
  '<svg class="copy-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
  '<svg class="check-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function contents(root: HTMLElement) {
  const links = [...root.querySelectorAll<HTMLAnchorElement>("[data-toc-link]")];
  if (!links.length) return () => {};
  const heads = links.map((l) => document.getElementById(l.dataset.tocLink ?? "")).filter((h): h is HTMLElement => Boolean(h));
  let frame = 0;
  const update = () => {
    frame = 0;
    let current = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) current = h;
    for (const l of links) l.toggleAttribute("data-active", l.dataset.tocLink === current?.id);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}

function headingLinks(root: HTMLElement) {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>(".heading-anchor");
    if (!a) return;
    e.preventDefault();
    const url = `${location.origin}${location.pathname}${a.getAttribute("href")}`;
    history.replaceState(null, "", a.getAttribute("href"));
    void copy(url, "Link to this section copied");
    document.getElementById(a.getAttribute("href")!.slice(1))?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

function codeCopy(root: HTMLElement) {
  const buttons: HTMLButtonElement[] = [];
  root.querySelectorAll<HTMLPreElement>(".article-body pre").forEach((pre) => {
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
      window.clearTimeout(timer);
      timer = window.setTimeout(() => delete button.dataset.copied, 1600);
    });
    (holder as HTMLElement).classList.add("has-code-copy");
    holder.appendChild(button);
    buttons.push(button);
  });
  return () => buttons.forEach((b) => b.remove());
}

function imageZoom(root: HTMLElement) {
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
    const clone = img.cloneNode() as HTMLImageElement;
    clone.removeAttribute("loading");
    clone.className = "zoom-image";
    Object.assign(clone.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
    overlay.appendChild(clone);
    document.body.appendChild(overlay);
    img.style.visibility = "hidden";

    const invert = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const duration = reduced() ? 0 : 420;
    clone.animate([{ transform: invert, borderRadius: "14px" }, { transform: "none", borderRadius: "6px" }], { duration, easing: EASE, fill: "both" });
    overlay.animate([{ backgroundColor: "rgb(255 255 255 / 0)" }, { backgroundColor: "rgb(255 255 255 / 0.94)" }], { duration: duration * 0.7, easing: "ease", fill: "both" });

    const close = () => {
      if (!open) return;
      open = null;
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", close);
      const back = img.getBoundingClientRect();
      const home = `translate(${back.left - to.left}px, ${back.top - to.top}px) scale(${back.width / to.width}, ${back.height / to.height})`;
      const out = reduced() ? 0 : 280;
      overlay.animate([{ backgroundColor: "rgb(255 255 255 / 0.94)" }, { backgroundColor: "rgb(255 255 255 / 0)" }], { duration: out, easing: "ease", fill: "both" });
      clone.animate([{ transform: "none" }, { transform: home, borderRadius: "14px" }], { duration: out, easing: EASE, fill: "both" }).finished.then(() => {
        img.style.visibility = "";
        overlay.remove();
      });
    };
    open = close;
    overlay.addEventListener("click", close);
    window.addEventListener("scroll", close, { passive: true, once: true });
    window.addEventListener("keydown", close, { once: true });
  };

  const onClick = (e: MouseEvent) => {
    const img = (e.target as Element).closest<HTMLImageElement>("img[data-zoom]");
    if (!img || img.closest("a")) return;
    zoom(img);
  };
  root.addEventListener("click", onClick);
  return () => {
    root.removeEventListener("click", onClick);
    open?.();
  };
}

export default function ArticleEnhance() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".article-page");
    if (!root) return;
    const off = [contents(root), headingLinks(root), codeCopy(root), imageZoom(root)];
    return () => off.forEach((fn) => fn());
  }, []);
  return null;
}
