"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";

import { cn } from "../../../lib/cn";
import { markProgrammaticCopy } from "../../../lib/toast";
import { playSound } from "../../ui/sound";

/*
 * Copy, and say so where the eye already is: the icon turns into a check in
 * place (the shadcn.io copy button's swap, with a little blur so the two
 * glyphs cross rather than pop), and a status line tells a screen reader
 * what happened. The check holds for `timeout` and turns back.
 *
 * The fallback for browsers without the async clipboard (or without
 * permission) is execCommand, flagged as ours so the site's own Ctrl+C
 * listener doesn't raise a second toast for it.
 */

export async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    const ok = markProgrammaticCopy(() => document.execCommand("copy"));
    area.remove();
    return ok;
  }
}

export type CopyButtonProps = Omit<ComponentProps<"button">, "value" | "onCopy"> & {
  /** The text, or a function that produces it at the moment of the press. */
  value: string | (() => string | Promise<string>);
  /** What the button does, as its accessible name. */
  label?: string;
  copiedLabel?: string;
  /** How long the check stays, in ms. */
  timeout?: number;
  onCopied?: (text: string) => void;
  variant?: "ghost" | "outline";
};

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  timeout = 2000,
  onCopied,
  onClick,
  variant = "ghost",
  className,
  children,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = async (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    const text = typeof value === "function" ? await value() : value;
    const ok = await writeClipboard(text);
    setFailed(!ok);
    if (!ok) {
      playSound("error");
      return;
    }
    setCopied(true);
    onCopied?.(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), timeout);
  };

  return (
    <>
    <button
      type="button"
      data-slot="copy-button"
      data-sound="copy"
      data-variant={variant}
      data-copied={copied || undefined}
      aria-label={children ? undefined : copied ? copiedLabel : label}
      title={children ? undefined : label}
      className={cn("ki-button", children ? "ki-button-md" : "ki-button-icon", className)}
      onClick={press}
      {...props}
    >
      {/*
        Both glyphs stay mounted in one grid cell and cross-fade on
        [data-copied] (kit-inputs.css): the same swap the motion library used
        to run, as a CSS transition, so pages with a copy button don't load it.
      */}
      <span className="ki-swap" aria-hidden="true">
        <span className="ki-swap-glyph" data-swap="idle"><Copy size={15} /></span>
        <span className="ki-swap-glyph" data-swap="done"><Check size={15} weight="bold" /></span>
      </span>
      {children}
    </button>
    {/* Outside the button, so it never becomes part of the button's name. */}
    <span className="sr-only" role="status">
      {copied ? copiedLabel : failed ? "Couldn't copy" : ""}
    </span>
    </>
  );
}

export default CopyButton;
