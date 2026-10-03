"use client";

import { useEffect } from "react";

/*
 * Every `title` on the page, shown as the site's own tooltip instead of the
 * browser's. Mounted once per root layout; nothing at the call sites changes.
 *
 * On hover (or keyboard focus) the title moves into `data-tip`, so the native
 * tooltip never gets its turn, and a small pill shows it after 500ms, or at
 * once within 300ms of the last one closing. "Label  ⌘K" (two spaces) shows
 * the keys as chips. React may put `title` back on a re-render; the next
 * hover simply moves it again.
 *
 * Left alone: text being edited (the editor body has its own hover cards),
 * `[data-native-title]`, and Base UI tooltip triggers (`data-slot`), whose
 * own tip already shows — their title is only moved so nothing doubles up.
 */

const DELAY = 500;
const WARM = 300;
const GAP = 6;
const EDGE = 8;

type Adopted = { labelled: boolean };

function hasName(el: Element) {
  if (el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby")) return true;
  if (el instanceof HTMLImageElement && el.alt.trim()) return true;
  if (el.textContent?.trim()) return true;
  return Boolean(el.querySelector("img[alt]:not([alt=''])"));
}

function fill(tip: HTMLElement, text: string) {
  const [label, ...rest] = text.split(/ {2,}/);
  tip.replaceChildren(label);
  const keys = rest.join(" ").trim();
  if (!keys) return;
  const group = document.createElement("span");
  group.className = "title-tip-keys";
  for (const key of keys.split(/\s+/)) {
    const kbd = document.createElement("kbd");
    kbd.textContent = key;
    group.append(kbd);
  }
  tip.append(group);
}

export function TitleTooltips() {
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const adopted = new Map<Element, Adopted>();
    let tip: HTMLDivElement | null = null;
    let anchor: Element | null = null;
    let open = false;
    let closedAt = -Infinity;
    let timer = 0;
    // A press hides the tip; it stays hidden until the pointer leaves that element.
    let pressed: Element | null = null;
    const watch = new MutationObserver(() => {
      if (anchor && open) show(anchor, true);
    });

    /** The title moves into data-tip; an element named only by it keeps that name. */
    const adopt = (el: Element) => {
      const title = el.getAttribute("title");
      if (title === null) return el.getAttribute("data-tip") ?? "";
      el.removeAttribute("title");
      const record = adopted.get(el) ?? { labelled: false };
      if (title.trim()) {
        el.setAttribute("data-tip", title);
        if (!record.labelled && !hasName(el)) {
          el.setAttribute("aria-label", title.split(/ {2,}/)[0]);
          record.labelled = true;
        }
      } else el.removeAttribute("data-tip");
      adopted.set(el, record);
      if (adopted.size > 400) for (const old of adopted.keys()) if (!old.isConnected) adopted.delete(old);
      return title;
    };

    const find = (target: EventTarget | null): Element | null => {
      if (!(target instanceof Element)) return null;
      const el = target.closest("[title], [data-tip]");
      if (!el || el === document.documentElement || el === document.body) return null;
      if ((el instanceof HTMLElement && el.isContentEditable) || el.closest("[data-native-title], iframe")) return null;
      return el;
    };
    const ownTip = (el: Element) => el.closest("[data-slot='tooltip-trigger']") !== null;

    const ensure = () => {
      if (tip?.isConnected) return tip;
      tip = document.createElement("div");
      tip.className = "title-tip";
      tip.id = "title-tip";
      tip.setAttribute("role", "tooltip");
      document.body.append(tip);
      return tip;
    };

    const place = (el: Element, t: HTMLElement) => {
      const a = el.getBoundingClientRect();
      const w = t.offsetWidth;
      const h = t.offsetHeight;
      const below = a.top - GAP - h < EDGE;
      const top = below ? Math.min(a.bottom + GAP, innerHeight - h - EDGE) : a.top - GAP - h;
      const center = a.left + a.width / 2;
      const left = Math.max(EDGE, Math.min(center - w / 2, document.documentElement.clientWidth - w - EDGE));
      t.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
      t.style.transformOrigin = `${Math.round(center - left)}px ${below ? "0" : "100%"}`;
      t.dataset.side = below ? "bottom" : "top";
    };

    const describe = (el: Element, on: boolean) => {
      const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== "title-tip");
      if (on) ids.push("title-tip");
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
    };

    function show(el: Element, instant: boolean) {
      const text = adopt(el);
      if (!text.trim() || !el.isConnected) return hide();
      const t = ensure();
      fill(t, text);
      if (instant) t.dataset.instant = "";
      else delete t.dataset.instant;
      place(el, t);
      if (!open) {
        void t.offsetWidth;
        t.dataset.open = "";
      }
      open = true;
      // Named by something else? The tip is extra; say so to assistive tech.
      const name = el.getAttribute("aria-label")?.trim() || el.textContent?.trim();
      if (name !== text.split(/ {2,}/)[0].trim()) describe(el, true);
      watch.disconnect();
      watch.observe(el, { attributes: true, attributeFilter: ["title"] });
    }

    function hide() {
      window.clearTimeout(timer);
      timer = 0;
      watch.disconnect();
      if (anchor) describe(anchor, false);
      if (open) closedAt = performance.now();
      open = false;
      if (tip) delete tip.dataset.open;
    }

    const arm = (el: Element) => {
      if (el === anchor && (open || timer)) return;
      const warm = open || performance.now() - closedAt < WARM;
      hide();
      anchor = el;
      adopt(el);
      if (ownTip(el)) return;
      timer = window.setTimeout(() => {
        timer = 0;
        if (anchor === el) show(el, warm);
      }, warm ? 0 : DELAY);
    };
    const leave = () => {
      hide();
      anchor = null;
    };

    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const el = find(event.target);
      if (el === anchor) return;
      if (pressed && el !== pressed) pressed = null;
      if (!el) return leave();
      if (el === pressed) return;
      arm(el);
    };
    const out = (event: PointerEvent) => {
      if (!anchor || (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))) return;
      if (event.target instanceof Node && anchor.contains(event.target)) {
        pressed = null;
        leave();
      }
    };
    const down = (event: PointerEvent) => {
      const el = find(event.target);
      if (el) adopt(el);
      pressed = el;
      hide();
    };
    const focus = (event: FocusEvent) => {
      const el = find(event.target);
      if (!el) return;
      adopt(el);
      if (event.target instanceof Element && event.target.matches(":focus-visible")) arm(el);
    };
    const blur = (event: FocusEvent) => {
      if (anchor && event.target instanceof Node && anchor.contains(event.target)) leave();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) leave();
    };

    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("focusin", focus, true);
    document.addEventListener("focusout", blur, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", leave, { capture: true, passive: true });
    window.addEventListener("blur", leave);
    return () => {
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("focusin", focus, true);
      document.removeEventListener("focusout", blur, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", leave, true);
      window.removeEventListener("blur", leave);
      leave();
      watch.disconnect();
      tip?.remove();
      // Put every title back where it was.
      for (const [el, record] of adopted) {
        const text = el.getAttribute("data-tip");
        if (text !== null && !el.hasAttribute("title")) el.setAttribute("title", text);
        el.removeAttribute("data-tip");
        if (record.labelled) el.removeAttribute("aria-label");
      }
      adopted.clear();
    };
  }, []);
  return null;
}
