"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "../../lib/toast";
import { api, ApiError, type Draft, type Revision } from "./api";
import { exactTime, relative } from "./bits";
import Sheet from "./Sheet";

/*
 * Revision history: autosave keeps one every ten minutes, and ⌘S, publishing
 * and restoring each keep one on the spot. Pick one to read it; restoring
 * brings its words back into the draft (and snapshots the current text first,
 * so nothing is lost by trying).
 */
export default function RevisionsSheet({
  open,
  onClose,
  id,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  onRestored: () => void;
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<Draft | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Opening starts fresh; the list is fetched each time, since it grows as you write.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRevisions(null);
      setSelected(null);
      setPreview(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    api
      .revisions(id)
      .then(({ revisions }) => live && setRevisions(revisions))
      .catch(() => live && setRevisions([]));
    return () => {
      live = false;
    };
  }, [open, id]);

  // Only the last one clicked may land, however the responses race.
  const wanted = useRef("");
  const choose = (at: string) => {
    wanted.current = at;
    setSelected(at);
    setPreview(null);
    api
      .revision(id, at)
      .then(({ revision }) => wanted.current === at && setPreview(revision))
      .catch(() => wanted.current === at && setPreview(null));
  };

  const restore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      await api.restore(id, selected);
      toast.add({ type: "success", title: "Revision restored", description: "The previous text was kept as a revision too." });
      onRestored();
    } catch (error) {
      setRestoring(false);
      toast.add({ type: "error", title: "Couldn’t restore", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Revisions" description="Kept for every save you make on purpose, and every ten minutes while you write.">
      {revisions === null ? (
        <ul className="rev-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rev-skeleton" />
          ))}
        </ul>
      ) : revisions.length === 0 ? (
        <p className="field-help">No revisions yet. Press ⌘S to keep one.</p>
      ) : (
        <ul className="rev-list">
          {revisions.map((r) => (
            <li key={r.at}>
              <button type="button" className="rev-row" aria-pressed={selected === r.at} onClick={() => choose(r.at)} title={exactTime(r.at)}>
                <span className="rev-label">{r.label}</span>
                <span className="rev-meta">
                  {relative(r.at)}, {r.words.toLocaleString()} words
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="rev-preview">
          {preview ? (
            <>
              <p className="rev-preview-title">{preview.title || "Untitled"}</p>
              <pre className="rev-preview-body">{preview.body.slice(0, 4000) || "(empty)"}</pre>
              <button type="button" className="admin-button admin-button-primary" data-keycap onClick={restore} disabled={restoring}>
                {restoring ? "Restoring…" : "Restore this revision"}
              </button>
            </>
          ) : (
            <div className="rev-skeleton" />
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
