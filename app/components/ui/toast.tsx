"use client";

import {
  CheckCircle,
  CircleNotch,
  Info,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { Toast } from "@base-ui/react/toast";
import { useEffect } from "react";

import { playSound, type SoundName } from "./sound";

import { isProgrammaticCopy, snippet, toast } from "../../lib/toast";

/**
 * The toaster: renders what lib/toast's manager raises, in the page's own
 * glass. Base UI's Toast is the same primitive shadcn's Toast wraps.
 *
 * Loaded as its own chunk after hydration (see LazyToaster), so none of this —
 * stacking, swipe, icons — weighs on the first load. Types pick the icon:
 * success, info, warning, error, loading.
 */

type ToastType = "success" | "info" | "warning" | "error" | "loading";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} weight="fill" />,
  info: <Info size={18} weight="fill" />,
  warning: <Warning size={18} weight="fill" />,
  error: <WarningCircle size={18} weight="fill" />,
  loading: <CircleNotch size={18} weight="bold" className="toast-spin" />,
};

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

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return [<ToastSounds key="__sounds" toasts={toasts} />, ...toasts.map((t) => {
    const icon = t.type ? ICONS[t.type as ToastType] : null;
    return (
      <Toast.Root
        key={t.id}
        toast={t}
        className="toast-root"
        data-type={t.type}
        // Bottom-centred, so it leaves by the way it came.
        swipeDirection="down"
      >
        <Toast.Content className="toast-content">
          {icon ? (
            <span className="toast-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="toast-text">
            <Toast.Title className="toast-title" />
            <Toast.Description className="toast-description" />
          </div>
          <Toast.Action className="toast-action" />
          <Toast.Close className="toast-close" aria-label="Dismiss" data-slot="toast-close">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  })];
}

/** Mount once, in the root layout. */
export function Toaster() {
  return (
    <Toast.Provider toastManager={toast} timeout={3200} limit={3}>
      <KeyboardToasts />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
