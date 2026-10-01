import { Toast } from "@base-ui/react/toast";

/**
 * The toast manager, on its own so it stays tiny.
 *
 * Base UI's manager is a small event emitter; the rendering half (Provider,
 * stacking, swipe, icons) lives in components/ui/toast.tsx and loads as its
 * own chunk after hydration. Anything can raise a toast from here without
 * pulling that into the first load:
 *
 *   toast.add({ title, description, type })   toast.close(id)
 *   toast.promise(p, { loading, success, error })
 */
export const toast = Toast.createToastManager();

/*
 * An error stays until it is dismissed: a failure that vanishes on a timer
 * while the visitor is looking elsewhere is a failure nobody saw. A caller
 * that passes its own timeout still gets it.
 */
const addToast = toast.add.bind(toast);
toast.add = ((options) =>
  addToast(options.type === "error" && options.timeout === undefined ? { ...options, timeout: 0 } : options)) as typeof toast.add;

/** Truncated and quoted, for showing what just went to the clipboard. */
export function snippet(text: string, max = 64): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return `“${flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat}”`;
}

/*
 * Copying with our own menu can fall back to execCommand("copy"), which fires
 * the same `copy` event as Ctrl+C. The menu raises its own toast, so the
 * keyboard listener is told to stand down for that one event.
 */
let programmaticCopy = false;

export function markProgrammaticCopy<T>(run: () => T): T {
  programmaticCopy = true;
  try {
    return run();
  } finally {
    programmaticCopy = false;
  }
}

export const isProgrammaticCopy = () => programmaticCopy;
