"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef } from "react";

import { advanceStable, makeSpring, POINTER_SPRING } from "../../lib/spring";

/*
 * A caret that glides, with the site cursor's physics.
 *
 * The browser's caret teleports: every keystroke, arrow or click and it's
 * simply somewhere else, which the eye loses on a long line or a jump to
 * another paragraph. This draws the caret itself and moves it on the same
 * critically damped spring as the custom pointer (POINTER_SPRING, ~28ms
 * behind, never overshooting), so it travels to where you are and you can
 * follow it. While it moves it's solid and stretches a little along its path;
 * once it settles it blinks, like a caret should.
 *
 * It covers the body (ProseMirror) and the title and standfirst (textareas,
 * measured with a mirror element). Pointer devices only: on a phone the
 * system caret carries the selection handles and must stay. Reduced motion
 * keeps the native caret too.
 */

type Target = { x: number; y: number; h: number } | null;

const MIRRORED = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontFeatureSettings",
  "fontVariationSettings",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "tabSize",
  "textWrap",
] as const;

/** Where the caret sits in a textarea, in page coordinates, via an invisible copy of it. */
function textareaCaret(el: HTMLTextAreaElement): Target {
  if (el.selectionStart !== el.selectionEnd) return null;
  const cs = getComputedStyle(el);
  const mirror = document.createElement("div");
  const style = mirror.style as unknown as Record<string, string>;
  for (const key of MIRRORED) style[key] = (cs as unknown as Record<string, string>)[key];
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    height: "auto",
  });
  const pos = el.selectionStart;
  mirror.textContent = el.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(pos) || "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const rect = el.getBoundingClientRect();
  const lineHeight = Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.2;
  const x = rect.left + window.scrollX + marker.offsetLeft;
  const y = rect.top + window.scrollY + marker.offsetTop - el.scrollTop;
  mirror.remove();
  // The glyph box is shorter than the line; sit the caret on the text, not the leading.
  const fontSize = Number.parseFloat(cs.fontSize);
  const h = Math.min(lineHeight, fontSize * 1.18);
  return { x, y: y + (lineHeight - h) / 2, h };
}

function editorCaret(editor: Editor): Target {
  const { selection } = editor.state;
  if (!selection.empty || !editor.isFocused) return null;
  try {
    const c = editor.view.coordsAtPos(selection.head);
    const h = c.bottom - c.top;
    if (!h) return null;
    return { x: c.left + window.scrollX, y: c.top + window.scrollY, h };
  } catch {
    return null;
  }
}

export default function SmoothCaret({ editor }: { editor: Editor }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const caret = el.current;
    const fine = window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!caret || !fine || still) return;
    const root = document.querySelector<HTMLElement>(".editor-root");
    root?.setAttribute("data-smooth-caret", "");

    const x = makeSpring();
    const y = makeSpring();
    const h = makeSpring(20);
    let target: Target = null;
    let visible = false;
    let frame = 0;
    let last = 0;
    let settledAt = 0;

    const measure = (): Target => {
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement && active.classList.contains("editor-field")) return textareaCaret(active);
      return editorCaret(editor);
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
      last = now;
      if (!target) return;
      advanceStable(x, target.x, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      advanceStable(y, target.y, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      advanceStable(h, target.h, dt, POINTER_SPRING.stiffness, POINTER_SPRING.damping);
      // Stretch along the direction of travel, a little, like a brush stroke.
      const speed = Math.abs(x.velocity);
      const stretch = Math.min(4, 1 + speed / 900);
      const origin = x.velocity > 0 ? "100%" : "0%";
      caret.style.transform = `translate3d(${x.value}px, ${y.value}px, 0) scaleX(${stretch.toFixed(3)})`;
      caret.style.transformOrigin = `${origin} 50%`;
      caret.style.height = `${h.value}px`;
      const moving = Math.abs(x.value - target.x) > 0.3 || Math.abs(y.value - target.y) > 0.3 || speed > 5;
      if (moving) {
        settledAt = now;
        caret.removeAttribute("data-blink");
        frame = requestAnimationFrame(tick);
      } else {
        caret.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
        // Blink only once it has rested a moment, so typing stays solid.
        window.setTimeout(() => {
          if (performance.now() - settledAt >= 480) caret.setAttribute("data-blink", "");
        }, 500);
      }
    };

    const update = () => {
      const next = measure();
      target = next;
      if (!next) {
        caret.removeAttribute("data-visible");
        visible = false;
        return;
      }
      if (!visible) {
        // Appearing: start where it should be, don't fly in from the last place.
        x.value = next.x;
        y.value = next.y;
        h.value = next.h;
        x.velocity = y.velocity = h.velocity = 0;
        caret.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        caret.style.height = `${next.h}px`;
        caret.setAttribute("data-visible", "");
        visible = true;
      }
      caret.removeAttribute("data-blink");
      settledAt = performance.now();
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const soon = () => requestAnimationFrame(update);

    editor.on("selectionUpdate", update);
    editor.on("transaction", soon);
    editor.on("focus", soon);
    editor.on("blur", soon);
    document.addEventListener("selectionchange", soon);
    window.addEventListener("resize", soon);
    document.fonts?.addEventListener?.("loadingdone", soon);
    return () => {
      root?.removeAttribute("data-smooth-caret");
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", update);
      editor.off("transaction", soon);
      editor.off("focus", soon);
      editor.off("blur", soon);
      document.removeEventListener("selectionchange", soon);
      window.removeEventListener("resize", soon);
      document.fonts?.removeEventListener?.("loadingdone", soon);
    };
  }, [editor]);

  return <div ref={el} className="smooth-caret" aria-hidden="true" />;
}
