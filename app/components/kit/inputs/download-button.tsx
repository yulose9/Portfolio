"use client";

import { Check, DownloadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * Download with the progress in the button: the fill sweeps across as bytes
 * arrive, the label counts the percent, and at the end the arrow becomes a
 * check before the button rests again. Pressing it mid-way cancels.
 *
 * `source` is a URL (fetched here, so progress is real when the server sends
 * a length) or a function that makes the Blob itself and reports its own
 * progress — an export that builds a zip, say. Either way the file is saved
 * through a temporary object URL, the same way ArticleMenu's `download` does.
 */

export type DownloadSource =
  | string
  | ((report: (fraction: number) => void, signal: AbortSignal) => Promise<Blob>);

type State = "idle" | "loading" | "done" | "error";

async function fetchBlob(url: string, report: (f: number) => void, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    got += value.byteLength;
    // Without a length the bar can't be honest, so it stays indeterminate.
    report(total ? got / total : -1);
  }
  return new Blob(chunks, { type: res.headers.get("content-type") ?? undefined });
}

export function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking on the next tick lets Safari start the save first.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export type DownloadButtonProps = {
  source: DownloadSource;
  filename: string;
  /** Resting label, e.g. "Download". */
  children?: ReactNode;
  onDone?: (blob: Blob) => void;
  onError?: (error: unknown) => void;
  className?: string;
  disabled?: boolean;
};

export function DownloadButton({ source, filename, children = "Download", onDone, onError, className, disabled }: DownloadButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(-1);
  const abort = useRef<AbortController | null>(null);
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const still = useReducedMotion();
  useEffect(
    () => () => {
      abort.current?.abort();
      clearTimeout(rest.current);
    },
    [],
  );

  const start = async () => {
    if (state === "loading") {
      abort.current?.abort();
      return;
    }
    clearTimeout(rest.current);
    const controller = new AbortController();
    abort.current = controller;
    setState("loading");
    setProgress(0);
    try {
      const report = (f: number) => setProgress(f < 0 ? -1 : Math.min(1, f));
      const blob =
        typeof source === "string" ? await fetchBlob(source, report, controller.signal) : await source(report, controller.signal);
      setProgress(1);
      saveBlob(blob, filename);
      setState("done");
      playSound("success");
      onDone?.(blob);
      rest.current = setTimeout(() => setState("idle"), 1800);
    } catch (error) {
      if (controller.signal.aborted) {
        setState("idle");
        return;
      }
      setState("error");
      playSound("error");
      onError?.(error);
      rest.current = setTimeout(() => setState("idle"), 2600);
    }
  };

  const percent = Math.round(Math.max(0, progress) * 100);
  const text =
    state === "loading"
      ? progress < 0
        ? "Downloading…"
        : `${percent}%`
      : state === "done"
        ? "Saved"
        : state === "error"
          ? "Failed"
          : children;
  const Icon = state === "done" ? Check : state === "error" ? WarningCircle : state === "loading" ? X : DownloadSimple;

  return (
    <>
      <button
        type="button"
        data-slot="download-button"
        data-variant="outline"
        data-state={state}
        data-indeterminate={(state === "loading" && progress < 0) || undefined}
        aria-busy={state === "loading" || undefined}
        aria-label={state === "loading" ? `Cancel download of ${filename}, ${progress < 0 ? "in progress" : `${percent}%`}` : undefined}
        disabled={disabled}
        className={cn("ki-button ki-button-md ki-download", className)}
        style={{ "--progress": progress < 0 ? 0 : progress } as CSSProperties}
        onClick={start}
      >
        <span className="ki-download-fill" aria-hidden="true" />
        <span className="ki-swap" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              className="ki-swap-glyph"
              initial={still ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={still ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(3px)" }}
              transition={{ duration: 0.18 }}
            >
              <Icon size={15} weight={state === "done" ? "bold" : "regular"} />
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="ki-download-label">{text}</span>
      </button>
      <span className="sr-only" role="status">
        {state === "done" ? `${filename} saved` : state === "error" ? `Couldn't download ${filename}` : ""}
      </span>
    </>
  );
}

export default DownloadButton;
