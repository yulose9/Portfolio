"use client";

import UpdatedAt from "../../components/UpdatedAt";
import { updatedAtExact } from "../../lib/updated-at";

export type SaveStatus = "saved" | "unsaved" | "saving" | "offline" | "error";

/*
 * The save state as one glyph that morphs rather than swaps (the idea from
 * benji.org/morphing-icons-with-claude): a dot for unsaved edits, the dot
 * opening into a spinning arc while saving, the arc closing into a check once
 * it lands, a slashed ring when it can't. Every state is the same circle's
 * stroke-dasharray and a check path drawn on or off, so each change is a
 * continuous transition, and the label beside it crossfades with a blur.
 */
const LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved",
  saving: "Saving",
  offline: "Offline, retrying",
  error: "Not saved",
};

export default function SaveState({ status, at, local }: { status: SaveStatus; at: string | null; local?:import("./draft-journal").LocalState }) {
  const label = LABEL[status];
  const localNote = local === "saved" ? " · Saved on this device" : local === "unavailable" ? " · Local recovery unavailable" : "";
  // The whole state as plain text: the tooltip, and what a screen reader gets
  // once a narrow bar folds the label down to the glyph.
  const full = status === "saved" && at ? `Cloud saved, last updated ${updatedAtExact(at)}` : `${label}${localNote}`;

  return (
    <span className="save-state" data-status={status}>
      {/* Autosave runs on every pause in typing, so "Saving… Saved" would talk
          over the writer. Only trouble is announced; the state itself stays
          readable on the line below. */}
      <span className="sr-only" role="status">
        {status === "error" ? "Couldn’t save" : status === "offline" ? "Offline. Retrying the save." : ""}
      </span>
      {/* The glyph carries the full text as its tooltip: once the label folds
          away it's all that's left to hover. */}
      <span className="save-glyph-wrap" title={full}>
        <svg className="save-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle className="save-ring" cx="8" cy="8" r="5.5" pathLength="100" />
          <circle className="save-dot" cx="8" cy="8" r="2.75" />
          <path className="save-check" d="M5.4 8.2 L7.2 10 L10.8 6.2" pathLength="100" />
          <path className="save-slash" d="M3.8 12.2 L12.2 3.8" pathLength="100" />
        </svg>
      </span>
      <span key={label} className="save-label">
        {status === "saved" && at ? <>Cloud saved <UpdatedAt at={at} /></> : <>{label}{localNote}</>}
      </span>
      <span className="save-label-sr">{full}</span>
    </span>
  );
}
