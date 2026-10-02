"use client";

import { FileArrowUp, HandGrabbing, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * A drop target that notices a file before it arrives. The moment a file is
 * dragged anywhere over the page the zone wakes; as the pointer comes within
 * reach it leans toward it, a few pixels, on a spring, so the eye finds where
 * to let go; over the zone its dashed edge fills in solid from the point the
 * pointer entered, the way Kobra's does.
 *
 * Only `dragover` on the zone itself calls preventDefault, so the rest of the
 * page keeps whatever drop handling it has (the editor's own image drop).
 * Click, Enter or Space opens the file dialog, so it works without a mouse.
 */

type Phase = "idle" | "armed" | "near" | "over" | "error";

export type MagneticDropzoneProps = {
  onFiles: (files: File[]) => void;
  /** Same syntax as the file input's `accept`: "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  /** Per-file limit in bytes. */
  maxSize?: number;
  title?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  /** How far, in px beyond its edge, the zone starts to reach for the pointer. */
  reach?: number;
  className?: string;
  children?: ReactNode;
};

const PULL = 10;

const hasFiles = (e: globalThis.DragEvent | DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
}

function accepts(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .some((rule) =>
      rule.startsWith(".")
        ? name.endsWith(rule)
        : rule.endsWith("/*")
          ? file.type.startsWith(rule.slice(0, -1))
          : file.type === rule,
    );
}

export function MagneticDropzone({
  onFiles,
  accept,
  multiple = false,
  maxSize,
  title,
  hint,
  disabled,
  reach = 160,
  className,
  children,
}: MagneticDropzoneProps) {
  const id = useId();
  const zone = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [ground, setGround] = useState({ x: 50, y: 50 });
  const still = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 22 });
  const y = useSpring(0, { stiffness: 260, damping: 22 });

  // The page-wide half: wake on any file drag, follow the pointer, sleep when
  // it leaves the window or lets go anywhere.
  useEffect(() => {
    if (disabled) return;
    let depth = 0;
    const settle = () => {
      depth = 0;
      x.set(0);
      y.set(0);
      setPhase((p) => (p === "error" ? p : "idle"));
    };
    const enter = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setPhase((p) => (p === "idle" || p === "error" ? "armed" : p));
    };
    const leave = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) settle();
    };
    const over = (e: globalThis.DragEvent) => {
      const el = zone.current;
      if (!el || !hasFiles(e)) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // Distance from the zone's edge, not its centre, so a wide zone and a
      // small one feel the same reach.
      const gap = Math.hypot(Math.max(0, Math.abs(dx) - r.width / 2), Math.max(0, Math.abs(dy) - r.height / 2));
      const inside = gap === 0;
      const pull = inside ? 0.35 : Math.max(0, 1 - gap / reach);
      if (!still) {
        x.set((dx / Math.max(1, Math.hypot(dx, dy))) * PULL * pull);
        y.set((dy / Math.max(1, Math.hypot(dx, dy))) * PULL * pull);
      }
      if (!inside) setPhase(pull > 0 ? "near" : "armed");
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", settle);
    window.addEventListener("dragend", settle);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", settle);
      window.removeEventListener("dragend", settle);
    };
  }, [disabled, reach, still, x, y]);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const wrongType = chosen.find((f) => !accepts(f, accept));
    const tooBig = maxSize ? chosen.find((f) => f.size > maxSize) : undefined;
    if (wrongType || tooBig) {
      setError(
        wrongType
          ? `${wrongType.name} isn't a file type this accepts.`
          : `${tooBig!.name} is ${formatBytes(tooBig!.size)}; the limit is ${formatBytes(maxSize!)}.`,
      );
      setPhase("error");
      playSound("error");
      return;
    }
    setError("");
    setPhase("idle");
    playSound("success");
    onFiles(chosen);
  };

  const label =
    phase === "over"
      ? multiple
        ? "Release to add them"
        : "Release to add it"
      : (title ?? (multiple ? "Drop files here" : "Drop a file here"));

  return (
    <motion.div
      ref={zone}
      data-slot="magnetic-dropzone"
      data-phase={phase}
      data-disabled={disabled || undefined}
      className={cn("ki-dropzone", className)}
      style={{ x, y, ["--ground-x" as string]: `${ground.x}%`, ["--ground-y" as string]: `${ground.y}%` }}
      onDragOver={(e) => {
        if (disabled || !hasFiles(e)) return;
        // This is what makes the zone a drop target at all.
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (phase !== "over") {
          const r = e.currentTarget.getBoundingClientRect();
          setGround({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          setPhase("over");
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPhase("near");
      }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        take(e.dataTransfer.files);
      }}
    >
      <span aria-hidden="true" className="ki-dropzone-edge">
        <span className="ki-dropzone-edge-dashed" />
        <span className="ki-dropzone-edge-solid" />
      </span>
      <input
        ref={picker}
        id={`${id}-input`}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        data-slot="magnetic-dropzone-trigger"
        className="ki-dropzone-button"
        disabled={disabled}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        onClick={() => picker.current?.click()}
      >
        <span className="ki-dropzone-icon" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={phase === "over" ? "over" : phase === "error" ? "error" : "idle"}
              initial={still ? false : { opacity: 0, scale: 0.6, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }}
              transition={{ duration: 0.18 }}
              className="ki-dropzone-glyph"
            >
              {phase === "over" ? (
                <HandGrabbing size={22} />
              ) : phase === "error" ? (
                <WarningCircle size={22} />
              ) : (
                <FileArrowUp size={22} />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="ki-dropzone-title">{label}</span>
        <span id={`${id}-hint`} className="ki-dropzone-hint">
          {hint ?? (
            <>
              or click to choose{maxSize ? ` · ${formatBytes(maxSize)} limit` : ""}
            </>
          )}
        </span>
      </button>
      {children}
      <div id={`${id}-error`} role="alert" className="ki-dropzone-error">
        {error}
      </div>
    </motion.div>
  );
}

export default MagneticDropzone;
