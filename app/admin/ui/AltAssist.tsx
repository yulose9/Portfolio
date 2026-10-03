"use client";

import { CircleNotch, Sparkle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { AltContext } from "../../../cms/alt-text";
import { Tooltip } from "../../components/kit/tooltip";
import { ALT_UNAVAILABLE, altTextAvailable, canDescribe, generateAltText, isSuggestedAlt } from "./alt-text";

/*
 * Beside an alt-text field: a sparkle that asks Workers AI for a suggestion,
 * and, while the field still holds what was generated, a "Generated, review
 * it" note. Disabled with a reason when the server has no AI binding.
 */
export function AltAssist({
  src,
  value,
  onAlt,
  context,
  className,
}: {
  src: string;
  value: string;
  onAlt: (alt: string) => void;
  /** What the page says around the picture; read when the button is pressed. */
  context?: () => AltContext;
  className?: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void altTextAvailable().then((on) => {
      if (live) setAvailable(on);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!canDescribe(src)) return null;
  const off = available === false;
  const generate = async () => {
    if (busy || off) return;
    setBusy(true);
    setError("");
    try {
      onAlt(await generateAltText(src, context?.()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate alt text.");
      if (!(await altTextAvailable())) setAvailable(false);
    } finally {
      setBusy(false);
    }
  };

  const label = off ? ALT_UNAVAILABLE : value.trim() ? "Regenerate alt text" : "Generate alt text";
  return (
    <span className={["alt-assist", className].filter(Boolean).join(" ")}>
      <Tooltip content={label}>
        <button
          type="button"
          className="alt-assist-button"
          aria-label={label}
          aria-disabled={off || busy || undefined}
          data-busy={busy || undefined}
          onClick={() => void generate()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {busy ? <CircleNotch size={14} className="alt-assist-spin" aria-hidden="true" /> : <Sparkle size={14} weight="fill" aria-hidden="true" />}
        </button>
      </Tooltip>
      {error ? (
        <span className="alt-assist-note" data-error="" role="alert">
          {error}
        </span>
      ) : isSuggestedAlt(src, value) ? (
        <span className="alt-assist-note" role="status">
          Generated, review it
        </span>
      ) : null}
    </span>
  );
}
