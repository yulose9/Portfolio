"use client";

import { useEffect, useRef, useState } from "react";
import type { Draft } from "../../../cms/format";
import { ApiError, call } from "./api";
import Sheet from "./Sheet";

type Workspace = "writing" | "projects";
export type ConvertedDocument = {
  post: Draft;
  targetWorkspace: Workspace;
  source: { version: 1; sourceWorkspace: Workspace; id: string; base: string };
  revisionCount: number;
  replayed: boolean;
  notices: string[];
};
export type ConvertDocumentProps = {
  open: boolean;
  onClose: () => void;
  doc: Draft;
  /** Pass the actual source workspace; never infer it from dormant project metadata. */
  sourceWorkspace: Workspace;
  /** Flush edits and return the server-confirmed saved Draft, or null on save failure. */
  beforeConvert: () => Promise<Draft | null>;
  /** Refresh destination data; navigation must use result.targetWorkspace explicitly. */
  onConverted: (result: ConvertedDocument) => void;
};

/**
 * Parent integration (Editor.tsx/api.ts intentionally untouched):
 * Render this beside PublishDialog; control `open` from a "Copy to Writing/Projects"
 * action. beforeConvert must await autosave + pending uploads and return the saved
 * server Draft (a boolean or stale doc prop is insufficient). Keep the source editor
 * mounted. onConverted may refresh the target list; do not replace the source doc
 * in the existing editor. The success link uses the explicit destination workspace.
 */
export default function ConvertDocument(props: ConvertDocumentProps) {
  return <ConversionDialog key={`${props.sourceWorkspace}:${props.doc.id}`} {...props} />;
}

function ConversionDialog({ open, onClose, doc, sourceWorkspace, beforeConvert, onConverted }: ConvertDocumentProps) {
  const target = sourceWorkspace === "projects" ? "Writing" : "Projects";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConvertedDocument | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const attempt = useRef<ConvertedDocument["source"] | null>(null);
  const [stale, setStale] = useState(false);
  const [hasAttempt, setHasAttempt] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function convert() {
    if (inFlight.current || result) return;
    inFlight.current = true;
    setBusy(true); setError(""); setStale(false);
    let converted: ConvertedDocument | null = null;
    try {
      if (!attempt.current) {
        const saved = await beforeConvert();
        if (!saved || saved.id !== doc.id) throw new Error("The latest edits could not be saved. Save this source page before copying.");
        attempt.current = { version: 1, sourceWorkspace, id: saved.id, base: saved.updatedAt };
        setHasAttempt(true);
      }
      // Explicit Writing scope always reaches /api/admin/convert, even in Projects.
      converted = await call<ConvertedDocument>("/convert", { method: "POST", body: JSON.stringify(attempt.current) }, "writing");
      if (mounted.current) setResult(converted);
    } catch (failure) {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : "Conversion could not be confirmed. Retry the same saved version.");
        setStale(failure instanceof ApiError && failure.body.code === "source_changed");
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
    // A parent refresh failure must not be presented as a failed storage conversion.
    if (converted && mounted.current) {
      try { onConverted(converted); }
      catch { setError("The copy is saved. Open it below; the parent workspace could not refresh."); }
    }
  }

  return <Sheet open={open} onClose={onClose} title={`Copy to ${target}`} variant="center" dismissible={!busy}
    description="Create an unpublished copy in the other workspace.">
    <p><strong>The source and its live URL remain unchanged.</strong> Its publishing schedule and incoming links also stay with the source.</p>
    <p>The copy keeps supported content, editor data, metadata, and saved revisions. Project details are retained even in Writing. Uploaded media keeps its existing URLs.</p>
    <p className="field-help">The copy starts at the top level, without a URL or schedule. Folder placement and editor undo history are not copied. Pages with children, unsafe references, linked research, or polls are blocked with an explanation.</p>
    {error ? <p role="alert">{error}</p> : null}
    {result ? <>
      <p role="status">Copy saved in {target}. {result.revisionCount} saved revisions copied.</p>
      <ul>{result.notices.map(notice => <li key={notice}>{notice}</li>)}</ul>
      <a className="admin-button admin-button-primary" href={`/admin?${new URLSearchParams({ section: result.targetWorkspace, post: result.post.id })}`}>Open copied draft</a>
      {doc.updatedAt !== result.source.base && <button type="button" className="admin-button" onClick={() => { attempt.current = null; setHasAttempt(false); setResult(null); }}>Copy latest edits</button>}
    </> : <div className="publish-actions">
      <button type="button" className="admin-button" disabled={busy} onClick={onClose}>Cancel</button>
      {stale ? <button type="button" className="admin-button" disabled={busy} onClick={() => { attempt.current = null; void convert(); }}>Save and use latest version</button> : null}
      <button type="button" className="admin-button admin-button-primary" disabled={busy || stale} onClick={() => void convert()}>
        {busy ? "Copying…" : hasAttempt ? "Retry saved version" : `Create ${target} draft`}
      </button>
    </div>}
  </Sheet>;
}
