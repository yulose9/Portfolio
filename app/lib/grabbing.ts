"use client";

import { useEffect } from "react";

/*
 * The closed hand while something is held.
 *
 * html.is-grabbing turns every element's cursor into the closed hand and
 * switches off text selection (globals.css), so a row dragged across text or
 * a field never flips to an I-beam or paints a selection behind it. The smooth
 * cursor reads the same class and draws its own closed hand.
 *
 * Several things can hold at once (a grip's press and the drag it starts), so
 * holds are counted: the class goes only when the last one lets go.
 */

let holds = 0;

/**
 * Puts .is-grabbing on <html> until the returned release is called. Safe to
 * release twice. Callers skip touch: a finger has no cursor to change.
 */
export function holdGrabbing(): () => void {
  if (typeof document === "undefined") return () => {};
  holds += 1;
  document.documentElement.classList.add("is-grabbing");
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holds = Math.max(0, holds - 1);
    if (!holds) document.documentElement.classList.remove("is-grabbing");
  };
}

/**
 * What can be picked up: the block grip, poll and table handles, the cover
 * being repositioned, tag pills, page tree rows and folder pages, Seneca's
 * goal, habit and timeline grips, anything natively draggable.
 */
const HANDLES = [
  ".block-grip",
  "[data-drag-handle]",
  "[data-rfd-drag-handle-draggable-id]",
  ".page-tree-grip",
  ".editor-poll-handle",
  ".table-handle",
  ".editor-banner[data-repositioning]",
  ".sn-goal-grip",
  ".hz-grip",
  ".hz-row-grip",
  ".hz-block-body",
  "[draggable='true']",
].join(", ");

/** Mounted hooks. The document listeners go on with the first, off with the last. */
let users = 0;
let uninstall: (() => void) | null = null;

/**
 * Holds the closed hand from the press on a drag handle until the drag ends.
 * Native HTML drags (the block handle, the page tree, folder pages) end with
 * dragend or drop and never see a pointerup, so those end it too; the
 * pointer-driven ones (tag pills, Seneca's grips) end on pointerup.
 *
 * Any number of components can call this; the listeners are installed once.
 */
export function useGrabbingCursor() {
  useEffect(() => {
    users += 1;
    if (users === 1) uninstall = install();
    return () => {
      users -= 1;
      if (!users) {
        uninstall?.();
        uninstall = null;
      }
    };
  }, []);
}

function install() {
  let release: (() => void) | null = null;
  let native = false;
  // dragstart says nothing of the pointer, so the press that led to it does.
  let touch = false;
  const on = () => {
    release ??= holdGrabbing();
  };
  const off = () => {
    native = false;
    release?.();
    release = null;
  };
  const down = (event: PointerEvent) => {
    touch = event.pointerType === "touch";
    if (event.button !== 0 || touch) return;
    const target = event.target as Element | null;
    if (target?.closest?.(HANDLES) && !target.closest("input, textarea, select")) on();
  };
  const start = () => {
    if (touch) return;
    native = true;
    on();
  };
  // Chrome cancels the pointer when a native drag takes over; that's not the end.
  const letGo = () => {
    if (!native) off();
  };
  document.addEventListener("pointerdown", down, true);
  document.addEventListener("dragstart", start, true);
  document.addEventListener("dragend", off, true);
  document.addEventListener("drop", off, true);
  window.addEventListener("pointerup", letGo, true);
  window.addEventListener("pointercancel", letGo, true);
  window.addEventListener("blur", off);
  return () => {
    document.removeEventListener("pointerdown", down, true);
    document.removeEventListener("dragstart", start, true);
    document.removeEventListener("dragend", off, true);
    document.removeEventListener("drop", off, true);
    window.removeEventListener("pointerup", letGo, true);
    window.removeEventListener("pointercancel", letGo, true);
    window.removeEventListener("blur", off);
    off();
  };
}
