"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/core";

/*
 * The picture under the cursor while a block is dragged by its handle: a
 * copy of the block itself (or of every selected block), on the page's own
 * paper, faded at the bottom when it is tall. The original stays where it
 * is at 40% (html.is-block-dragging, admin-editor.css) until it lands.
 *
 * The drag handle's own dragstart runs first (it selects what is being
 * dragged and sets a plain image); this listens on the document, so it runs
 * after that and its image is the one the browser keeps.
 */

const SELECTED = ["ProseMirror-selectednoderange", "ProseMirror-selectednode", "ProseMirror-focused", "ProseMirror-noderangeselection"];

function strip(el: Element) {
  el.classList.remove(...SELECTED);
  el.removeAttribute("id");
  el.removeAttribute("contenteditable");
  for (const child of Array.from(el.children)) strip(child);
}

export function useBlockDragGhost(editor: Editor) {
  useEffect(() => {
    const root = document.documentElement;
    let ghost: HTMLElement | null = null;
    const end = () => {
      root.classList.remove("is-block-dragging");
      ghost?.remove();
      ghost = null;
    };
    const start = (event: DragEvent) => {
      const target = event.target;
      const host = editor.view.dom.parentElement;
      if (!event.dataTransfer || !(target instanceof Element) || !host?.contains(target)) return;
      if (!target.closest(".block-handle") && !target.querySelector(".block-grip")) return;
      const { from, to } = editor.state.selection;
      const blocks: HTMLElement[] = [];
      editor.state.doc.nodesBetween(from, to, (_node, pos) => {
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement) blocks.push(dom);
        return false;
      });
      if (!blocks.length) return;
      end();
      const rects = blocks.map((b) => b.getBoundingClientRect());
      const first = rects[0];
      // The handle sits left of the block: leave that much room, so the grab
      // point lands where it was on the page.
      const gap = Math.max(0, first.left - event.clientX);
      ghost = document.createElement("div");
      ghost.className = "block-drag-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.paddingLeft = `${16 + gap}px`;
      const card = document.createElement("div");
      card.className = "block-drag-ghost-card";
      const body = document.createElement("div");
      body.className = editor.view.dom.className;
      body.classList.remove(...SELECTED);
      body.style.width = `${Math.max(...rects.map((r) => r.width))}px`;
      for (const block of blocks) {
        const copy = block.cloneNode(true) as HTMLElement;
        strip(copy);
        body.append(copy);
      }
      card.append(body);
      ghost.append(card);
      host.append(ghost);
      if (body.scrollHeight > body.clientHeight + 1) card.dataset.clipped = "";
      const at = ghost.getBoundingClientRect();
      const lead = (body.firstElementChild as HTMLElement).getBoundingClientRect();
      const x = Math.max(0, event.clientX - first.left + (lead.left - at.left));
      const y = Math.min(at.height, Math.max(0, event.clientY - first.top + (lead.top - at.top)));
      event.dataTransfer.setDragImage(ghost, x, y);
      root.classList.add("is-block-dragging");
      // The browser has its snapshot once dragstart returns.
      const made = ghost;
      window.setTimeout(() => made.remove(), 0);
    };
    document.addEventListener("dragstart", start);
    document.addEventListener("dragend", end, true);
    document.addEventListener("drop", end, true);
    return () => {
      document.removeEventListener("dragstart", start);
      document.removeEventListener("dragend", end, true);
      document.removeEventListener("drop", end, true);
      end();
    };
  }, [editor]);
}
