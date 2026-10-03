"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/core";

/*
 * The picture under the cursor while a block is dragged by its handle: a
 * faded copy of the block itself (or of every selected block, at their real
 * relative positions), on the page's own paper. The card hugs the content:
 * a short line makes a short, narrow card. It is capped at the column width,
 * 600px and 240px, and fades out only where it overflows. Images are shown
 * scaled down. The original stays where it is at 40% (html.is-block-dragging,
 * admin-editor.css) until it lands.
 *
 * The drag handle's own dragstart runs first (it selects what is being
 * dragged and sets a plain image); this listens on the document, so it runs
 * after that and its image is the one the browser keeps.
 */

const SELECTED = ["ProseMirror-selectednoderange", "ProseMirror-selectednode", "ProseMirror-focused", "ProseMirror-noderangeselection"];
const MAX_W = 600;
const MAX_H = 240;
const MEDIA_W = 280;
// Matches .block-drag-ghost-card's padding in admin-editor.css.
const PAD_X = 8;
const PAD_Y = 6;
const MEDIA_NODE = /image|video|figure|media/i;

function strip(el: Element) {
  el.classList.remove(...SELECTED);
  el.removeAttribute("id");
  el.removeAttribute("contenteditable");
  for (const child of Array.from(el.children)) strip(child);
}

type Piece = { dom: HTMLElement; block: DOMRect; content: DOMRect; media: boolean };

/** Where the block's ink actually is: its text and children, not the full-width box a paragraph gets. */
function contentRect(dom: HTMLElement, block: DOMRect, media: HTMLElement | null): DOMRect {
  if (media) {
    const r = media.getBoundingClientRect();
    const scale = r.width > MEDIA_W ? MEDIA_W / r.width : 1;
    return new DOMRect(r.left, block.top, r.width * scale, block.height);
  }
  const range = document.createRange();
  range.selectNodeContents(dom);
  const r = range.getBoundingClientRect();
  if (!r.width || !r.height) return block;
  return new DOMRect(Math.max(r.left, block.left), block.top, Math.min(r.right, block.right) - Math.max(r.left, block.left), block.height);
}

export function useBlockDragGhost(editor: Editor) {
  useEffect(() => {
    const root = document.documentElement;
    let ghost: HTMLElement | null = null;
    let frame = 0;
    const drop = () => {
      cancelAnimationFrame(frame);
      ghost?.remove();
      ghost = null;
    };
    const end = () => {
      root.classList.remove("is-block-dragging");
      drop();
    };
    const start = (event: DragEvent) => {
      const target = event.target;
      const host = editor.view.dom.parentElement;
      if (!event.dataTransfer || !(target instanceof Element) || !host?.contains(target)) return;
      if (!target.closest(".block-handle") && !target.querySelector(".block-grip")) return;
      const { from, to } = editor.state.selection;
      const pieces: Piece[] = [];
      editor.state.doc.nodesBetween(from, to, (node, pos) => {
        const dom = editor.view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) return false;
        const block = dom.getBoundingClientRect();
        const mediaEl = MEDIA_NODE.test(node.type.name) ? dom.querySelector<HTMLElement>("img, video") : null;
        pieces.push({ dom, block, content: contentRect(dom, block, mediaEl), media: !!mediaEl });
        return false;
      });
      if (!pieces.length) return;
      end();

      const column = editor.view.dom.getBoundingClientRect().width || MAX_W;
      const left = Math.min(...pieces.map((p) => p.content.left));
      const right = Math.max(...pieces.map((p) => p.content.right));
      const top = pieces[0].block.top;
      const width = Math.ceil(Math.min(right - left, column, MAX_W));
      const fullHeight = pieces[pieces.length - 1].block.bottom - top;

      ghost = document.createElement("div");
      ghost.className = "block-drag-ghost-card";
      ghost.setAttribute("aria-hidden", "true");
      // The editor's own classes, so the copies get the article's type sizes;
      // min-height and the like are reset in admin-editor.css.
      const body = document.createElement("div");
      body.className = editor.view.dom.className;
      body.classList.remove(...SELECTED);
      body.style.width = `${width}px`;
      let prevBottom = top;
      for (const piece of pieces) {
        const copy = piece.dom.cloneNode(true) as HTMLElement;
        strip(copy);
        copy.style.margin = "0";
        copy.style.marginTop = `${Math.max(0, piece.block.top - prevBottom)}px`;
        if (piece.media) {
          copy.dataset.ghostMedia = "";
          copy.style.marginLeft = `${piece.content.left - left}px`;
          copy.style.width = `${piece.content.width}px`;
        } else {
          copy.style.marginLeft = `${piece.block.left - left}px`;
          copy.style.width = `${piece.block.width}px`;
        }
        prevBottom = piece.block.bottom;
        body.append(copy);
      }
      ghost.append(body);
      host.append(ghost);
      if (body.scrollHeight > body.clientHeight + 1 || fullHeight > MAX_H) ghost.dataset.clipY = "";
      if (right - left > width + 1) ghost.dataset.clipX = "";

      // The grab point, as an offset into the card: passed to the browser,
      // never added as padding.
      const card = ghost.getBoundingClientRect();
      const x = Math.min(card.width, Math.max(0, event.clientX - left + PAD_X));
      const y = Math.min(card.height, Math.max(0, event.clientY - top + PAD_Y));
      event.dataTransfer.setDragImage(ghost, x, y);
      root.classList.add("is-block-dragging");
      // The browser has its snapshot once dragstart returns.
      frame = requestAnimationFrame(drop);
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
