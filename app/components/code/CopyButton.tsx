"use client";

import { useEffect, useRef, useState } from "react";

import { copy } from "../menu/actions";
import { cn } from "../../lib/cn";

/*
 * Copy, with the icon morphing to a check (scale .25 → 1, blur 4px → 0) and
 * the accessible name following it, so a screen reader hears "Copied" too.
 */
export default function CopyButton({ text, label = "Copy code", copiedTitle = "Code copied", className }: {
  /** Read at click time, so it can come from the rendered DOM. */
  text: () => string;
  label?: string;
  copiedTitle?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={cn("code-action code-copy-button", className)}
      data-copied={copied || undefined}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={async () => {
        const ok = await copy(text(), copiedTitle);
        if (!ok) return;
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      <svg className="copy-icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="5" y="5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <svg className="check-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function WrapButton({ wrapped, onToggle }: { wrapped: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="code-action" aria-pressed={wrapped} aria-label="Wrap long lines" title={wrapped ? "Don’t wrap lines" : "Wrap long lines"} onClick={onToggle}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.5 4h11M2.5 8h9a2 2 0 0 1 0 4H8m0 0 1.5-1.5M8 12l1.5 1.5M2.5 12h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
