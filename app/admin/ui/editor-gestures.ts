"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/*
 * Two pointer behaviours the editor page wants, kept out of Editor.tsx:
 *
 *  - the closed hand while something is being dragged, everywhere on the
 *    page, so a block dragged across the body doesn't turn into an I-beam
 *    the moment it crosses some text;
 *  - a click in the empty space under the last block writes there, the way
 *    Notion does.
 */

/** What can be picked up: the block grip, tag pills, page tree rows, anything natively draggable. */
const HANDLES = ".block-grip, [data-drag-handle], [data-rfd-drag-handle-draggable-id], .page-tree-grip, [draggable='true']";

/**
 * Puts .is-grabbing on <html> from the press on a drag handle until the drag
 * ends (globals.css turns that into `cursor: grabbing` on every element).
 * Native HTML drags (the block handle, the page tree) end with dragend or
 * drop and never see a pointerup, so those end it too; the pointer-driven
 * ones (tag pills) end on pointerup.
 */
export function useGrabbingCursor() {
  useEffect(() => {
    const root = document.documentElement;
    let native = false;
    const on = () => root.classList.add("is-grabbing");
    const off = () => {
      native = false;
      root.classList.remove("is-grabbing");
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      const target = event.target as Element | null;
      if (target?.closest?.(HANDLES) && !target.closest("input, textarea, select")) on();
    };
    const start = () => {
      native = true;
      on();
    };
    // Chrome cancels the pointer when a native drag takes over; that's not the end.
    const release = () => {
      if (!native) off();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("dragstart", start, true);
    document.addEventListener("dragend", off, true);
    document.addEventListener("drop", off, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", off);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("dragstart", start, true);
      document.removeEventListener("dragend", off, true);
      document.removeEventListener("drop", off, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", off);
      off();
    };
  }, []);
}

/**
 * A click below the last block puts the caret on a fresh line at the end:
 * a new empty paragraph, unless the page already ends in one, which is then
 * simply focused. Listens for `click` rather than the press, so a marquee
 * drag that starts down there (BlockMarquee) is left alone.
 */
export function useClickBelowToWrite(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;
    const canvas = editor.view.dom.closest(".editor-canvas");
    if (!(canvas instanceof HTMLElement)) return;
    let pressed: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      pressed = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    };
    const click = (event: MouseEvent) => {
      const from = pressed;
      pressed = null;
      if (!from || !editor.isEditable || event.defaultPrevented) return;
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4) return;
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      // Only the bare page: the body's own empty area, the article, the canvas.
      const target = event.target as Element;
      const dom = editor.view.dom;
      if (target !== dom && target !== canvas && !(target.matches("article") && canvas.contains(target))) return;
      const last = dom.lastElementChild;
      if (!last) return;
      const bounds = dom.getBoundingClientRect();
      if (event.clientY <= last.getBoundingClientRect().bottom || event.clientX < bounds.left - 48 || event.clientX > bounds.right + 48) return;

      const { doc } = editor.state;
      const tail = doc.lastChild;
      const end = doc.content.size;
      const tr = editor.state.tr;
      if (tail?.type.name === "paragraph" && tail.content.size === 0) {
        tr.setSelection(TextSelection.create(doc, end - 1));
      } else {
        tr.insert(end, editor.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, end + 1));
      }
      editor.view.dispatch(tr.scrollIntoView());
      editor.view.focus();
    };
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("click", click);
    return () => {
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("click", click);
    };
  }, [editor]);
}
