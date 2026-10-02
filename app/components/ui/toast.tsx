"use client";

import { Info, Trash, Warning, WarningCircle } from "@phosphor-icons/react";
import { Toast } from "@base-ui/react/toast";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { playSound, type SoundName } from "./sound";

import { buttonClassName } from "../kit/button";
import { StatusBadge } from "../kit/spinner";
import { isProgrammaticCopy, snippet, toast } from "../../lib/toast";

/**
 * The toaster: renders what lib/toast's manager raises, after Kobra's toast.
 * Each toast is a single-line pill on the frosted popover; several make a
 * pile that fans into a list when pointed at or focused (the geometry is in
 * kit-components.css, under .kt-*). Inside the pill, what changes morphs
 * rather than swaps: the glyph pops, the words slide and the pill's width
 * follows them on the same spring, so a promise toast going from "Saving…"
 * to "Saved" reads as one thing finishing.
 *
 * Loaded as its own chunk after hydration (see LazyToaster), so none of this
 * weighs on the first load. Types pick the glyph: success, info, warning,
 * error, loading, and trash (a quiet bin for something just deleted, which
 * can morph into the loading badge when it is undone). Pending and success share one badge, which turns from a
 * running arc into a filled tick in place.
 */

type ToastType = "success" | "info" | "warning" | "error" | "loading" | "trash";

// Kobra's MORPH and EXIT: critically damped springs, .3s in, .2s out.
const MORPH = { type: "spring", duration: 0.3, bounce: 0 } as const;
const EXIT = { type: "spring", duration: 0.2, bounce: 0 } as const;

const GLYPH_POP = {
  initial: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.5, filter: "blur(4px)", transition: EXIT },
} as const;

const TEXT_SLIDE = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -6, transition: EXIT },
} as const;

function isType(type: string | undefined): type is ToastType {
  return type === "success" || type === "info" || type === "warning" || type === "error" || type === "loading" || type === "trash";
}

function Glyph({ type }: { type: ToastType }) {
  if (type === "loading" || type === "success") return <StatusBadge state={type === "success" ? "done" : "loading"} />;
  if (type === "trash") return <Trash size={16} weight="duotone" />;
  const Mark = type === "error" ? WarningCircle : type === "warning" ? Warning : Info;
  return <Mark size={16} weight="fill" />;
}

// Pending and done are one badge morphing; the other kinds replace each other.
const glyphKey = (type: ToastType) => (type === "loading" || type === "success" ? "badge" : type);

/**
 * Keyboard feedback: Ctrl/⌘+C (or the browser's own Copy) confirms what was
 * copied, and a paste is told, kindly, that there is nowhere on the page to put
 * it. Listens to the `copy` and `paste` events rather than keystrokes, so the
 * browser's own menus and Edit menu count too.
 */
function KeyboardToasts() {
  useEffect(() => {
    const onCopy = () => {
      if (isProgrammaticCopy()) return;
      const text = window.getSelection()?.toString() ?? "";
      if (!text.trim()) return;
      toast.add({
        // A fixed id: copying again updates this toast in place and restarts
        // its timer, rather than stacking one per keystroke.
        id: "keyboard-copy",
        type: "success",
        title: "Copied to clipboard",
        description: snippet(text),
        timeout: 2600,
      });
    };

    const onPaste = (event: ClipboardEvent) => {
      // A real field would take it; only answer when nothing can.
      const target = event.target as Element | null;
      if (target?.closest?.("input, textarea, [contenteditable]")) return;
      toast.add({
        id: "keyboard-paste",
        type: "info",
        title: "Nothing to paste into",
        description: window.location.pathname.startsWith("/admin")
          ? "Click into the page or a field first, then paste."
          : "This page has no text fields — to send me something, use Email under About.",
        timeout: 3200,
      });
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, []);
  return null;
}

/*
 * Each toast says itself once, when it appears or changes kind (a promise
 * toast going from loading to done). What it says follows its type; a copy
 * confirmation gets the copy cue rather than the general success.
 */
const voiced = new Map<string, string>();

function cueFor(type: string | undefined, title: unknown): SoundName | null {
  if (type === "loading") return null;
  if (type === "success") return typeof title === "string" && /\bcopied\b/i.test(title) ? "copy" : "success";
  if (type === "error") return "error";
  if (type === "warning") return "warning";
  return "notification";
}

function ToastSounds({ toasts }: { toasts: { id: string; type?: string; title?: unknown }[] }) {
  useEffect(() => {
    const live = new Set<string>();
    for (const t of toasts) {
      live.add(t.id);
      const kind = `${t.type ?? ""}:${String(t.title ?? "")}`;
      if (voiced.get(t.id) === kind) continue;
      voiced.set(t.id, kind);
      const cue = cueFor(t.type, t.title);
      if (cue) playSound(cue);
    }
    for (const id of voiced.keys()) if (!live.has(id)) voiced.delete(id);
  }, [toasts]);
  return null;
}

/*
 * While piled, the cards behind are held to the front card's width (Kobra's
 * DeckCap), so a longer message further back never sticks out past the front
 * of the pile. CSS can't see another element's width, so the front card's is
 * measured and handed to the viewport as --kt-front-width.
 */
function useFrontWidth(viewport: RefObject<HTMLDivElement | null>, toasts: readonly { id: string }[]) {
  useLayoutEffect(() => {
    const root = viewport.current;
    if (!root) return;
    const front = [...root.querySelectorAll<HTMLElement>(".kt-toast")].find(
      (el) => !el.hasAttribute("data-ending-style") && !el.querySelector(":scope > [data-behind]")
    );
    if (!front) return;
    const write = () => root.style.setProperty("--kt-front-width", `${front.offsetWidth}px`);
    write();
    const observer = new ResizeObserver(write);
    observer.observe(front);
    return () => observer.disconnect();
  }, [viewport, toasts]);
}

/** The words: a title, and the description after it in a quieter grey, on one line. */
function Line({ title, description }: { title: ReactNode; description: ReactNode }) {
  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: "auto" }}
      exit={{ width: 0, transition: EXIT }}
      transition={MORPH}
      className="kt-toast-text"
    >
      <motion.span {...TEXT_SLIDE} transition={MORPH} className="kt-toast-line">
        <Toast.Title className="kt-toast-title toast-title" render={<span />}>
          {title}
        </Toast.Title>
        {description ? (
          <Toast.Description className="kt-toast-description" render={<span />}>
            {description}
          </Toast.Description>
        ) : null}
      </motion.span>
    </motion.div>
  );
}

function ToastList({ viewport }: { viewport: RefObject<HTMLDivElement | null> }) {
  const { toasts } = Toast.useToastManager();
  useFrontWidth(viewport, toasts);

  return [
    <ToastSounds key="__sounds" toasts={toasts} />,
    ...toasts.map((t) => {
      const type = isType(t.type) ? t.type : null;
      // One that won't leave on its own keeps its × in view.
      const sticky = t.timeout === 0;
      const title: ReactNode = t.title ?? null;
      const description: ReactNode = t.description ?? null;
      const wording = `${typeof t.title === "string" ? t.title : ""}\u0000${typeof t.description === "string" ? t.description : ""}`;

      return (
        <Toast.Root
          key={t.id}
          toast={t}
          className="kt-toast"
          data-type={t.type}
          data-glyph={type ? "" : undefined}
          data-sticky={sticky ? "" : undefined}
          data-trailing={t.actionProps || sticky ? "" : undefined}
          // Down, back the way it came, or off to either side.
          swipeDirection={["down", "left", "right"]}
        >
          <Toast.Content className="kt-toast-content">
            <AnimatePresence initial={false}>
              {type ? (
                <motion.div
                  key="glyph"
                  initial={{ width: 0 }}
                  animate={{ width: "auto" }}
                  exit={{ width: 0, transition: EXIT }}
                  transition={MORPH}
                  className="kt-toast-glyph"
                >
                  <div className="kt-toast-glyph-inner">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={glyphKey(type)}
                        {...GLYPH_POP}
                        transition={MORPH}
                        className="kt-toast-mark"
                        data-tone={type}
                        aria-hidden="true"
                      >
                        <Glyph type={type} />
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Old and new words share the line for a moment: one folds away as the other opens. */}
            <AnimatePresence initial={false}>
              <Line key={wording} title={title} description={description} />
            </AnimatePresence>

            <Toast.Action className={buttonClassName("secondary", "kt-toast-action")} data-variant="secondary" data-size="xs" />
            <Toast.Close className="kt-toast-close" aria-label="Dismiss" data-slot="toast-close">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Toast.Close>
          </Toast.Content>
        </Toast.Root>
      );
    }),
  ];
}

/** Mount once, in the root layout. */
export function Toaster() {
  const viewport = useRef<HTMLDivElement>(null);
  return (
    <Toast.Provider toastManager={toast} timeout={3200} limit={3}>
      <KeyboardToasts />
      <Toast.Portal>
        <MotionConfig reducedMotion="user">
          <Toast.Viewport ref={viewport} className="kt-viewport">
            <ToastList viewport={viewport} />
          </Toast.Viewport>
        </MotionConfig>
      </Toast.Portal>
    </Toast.Provider>
  );
}
