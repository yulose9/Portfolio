"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ArrowCounterClockwise, ArrowLeft, ArrowSquareOut, Swap, Trash } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { AudioFigure } from "../../components/writing/AudioPlayer";
import { CopyButton } from "../../components/kit/inputs/copy-button";
import { Tooltip } from "../../components/kit/tooltip";
import { MEDIA_LIMITS, mediaDimensions, validateMediaDetails, versionedSrc, type MediaDetailErrors } from "../../../cms/media-details";
import type { Asset } from "./MediaLibrary";
import { formatBytes, formatDay, usedLabel } from "./MediaPreview";
import { AltAssist } from "./AltAssist";
import { detailErrors, mediaApi } from "./media-api";
import { replaceAccept, replaceMedia, replaceNotice } from "./media-replace";

/*
 * One asset, in full: what it is, where it is used, its editable details,
 * replacing its file at the same URL, and the way out (trash, or permanent
 * deletion once nothing uses it).
 */

type Form = { title: string; alt: string; caption: string };
const formOf = (a: Asset): Form => ({ title: a.title ?? "", alt: a.alt ?? "", caption: a.caption ?? "" });

const pageHref = (use: Asset["usedIn"][number]) =>
  use.kind === "website"
    ? "/admin?section=website"
    : `/admin?${new URLSearchParams({ section: use.kind === "project" ? "projects" : "writing", post: use.id })}`;

/** "Replaced Oct 3, 2026" from a version, which is a base-36 timestamp. */
const replacedOn = (version?: string | null) => {
  const at = version ? parseInt(version, 36) : NaN;
  return Number.isFinite(at) && at > 1_500_000_000_000 ? formatDay(new Date(at).toISOString()) : null;
};

export default function MediaDetails({
  asset,
  busy,
  perform,
  onBack,
  onChange,
  onDeleted,
  onView,
}: {
  asset: Asset;
  busy: boolean;
  /** Runs one write, holding the sheet open and reporting failures above. */
  perform: (work: () => Promise<void>) => Promise<void>;
  onBack: () => void;
  onChange: (next: Asset) => void;
  onDeleted: () => void;
  onView: () => void;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState<Form>(() => formOf(asset));
  const [errors, setErrors] = useState<MediaDetailErrors>({});
  const [saved, setSaved] = useState("");
  const [picked, setPicked] = useState<{ file: File; notice: string | null } | null>(null);
  const [progress, setProgress] = useState("");
  const [replaceError, setReplaceError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // A different asset, or new details from the server: start from those.
  const [shown, setShown] = useState(asset);
  if (shown.src !== asset.src || shown.base !== asset.base) {
    setShown(asset);
    setForm(formOf(asset));
    setErrors({});
  }

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [asset.src]);

  const file = asset.src.split("/").pop() ?? asset.src;
  const dims = mediaDimensions(asset.src);
  const src = versionedSrc(asset.src, asset.version);
  const used = asset.usedIn.length > 0;
  const dirty = form.title !== (asset.title ?? "") || form.alt !== (asset.alt ?? "") || form.caption !== (asset.caption ?? "");
  const isImage = asset.type.startsWith("image/");

  const edit = (field: keyof Form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved("");
    // Clear a field's error as soon as it is back within its limit.
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      if (!validateMediaDetails({ [field]: value })[field]) delete next[field];
      return next;
    });
  };

  const save = () => {
    const found = validateMediaDetails(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    void perform(async () => {
      try {
        const r = await mediaApi.saveDetails({
          src: asset.src,
          title: form.title.trim(),
          alt: form.alt.trim(),
          caption: form.caption.trim(),
          trashed: Boolean(asset.trashed),
          base: asset.base ?? null,
        });
        onChange({ ...asset, title: form.title.trim(), alt: form.alt.trim(), caption: form.caption.trim(), base: r.base });
        setSaved("Details saved.");
      } catch (error) {
        const fields = detailErrors(error);
        if (fields) setErrors(fields);
        else throw error;
      }
    });
  };

  const setTrashed = (trashed: boolean) =>
    perform(async () => {
      const r = await mediaApi.saveDetails({
        src: asset.src,
        title: asset.title ?? "",
        alt: asset.alt ?? "",
        caption: asset.caption ?? "",
        trashed,
        base: asset.base ?? null,
      });
      onChange({ ...asset, trashed, base: r.base });
    });

  const pick = async (chosen: File | undefined) => {
    setReplaceError("");
    if (!chosen) return;
    setPicked({ file: chosen, notice: await replaceNotice(asset, chosen).catch(() => null) });
  };

  const replace = () => {
    if (!picked) return;
    setReplaceError("");
    void perform(async () => {
      try {
        const r = await replaceMedia(asset, picked.file, setProgress);
        onChange({
          ...asset,
          version: r.version ?? asset.version ?? null,
          size: r.size ?? asset.size,
          type: r.type ?? asset.type,
          digest: r.digest ?? asset.digest ?? null,
          base: r.base === undefined ? (asset.base ?? null) : r.base,
          title: r.title ?? asset.title,
          alt: r.alt ?? asset.alt,
          caption: r.caption ?? asset.caption,
        });
        setPicked(null);
        setSaved("File replaced. Pages that use it now show the new file.");
      } catch (error) {
        setReplaceError(error instanceof Error ? error.message : "Couldn't replace the file.");
      } finally {
        setProgress("");
      }
    });
  };

  const destroy = () =>
    perform(async () => {
      await mediaApi.destroy(asset.src);
      setConfirming(false);
      onDeleted();
    });

  const field = (name: keyof Form, labelText: string, hint?: string, rows?: number, tools?: ReactNode) => {
    const value = form[name];
    const error = errors[name];
    const limit = MEDIA_LIMITS[name];
    const near = value.length > limit * 0.9;
    const props = {
      id: `${id}-${name}`,
      value,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": [hint ? `${id}-${name}-hint` : "", error ? `${id}-${name}-error` : ""].filter(Boolean).join(" ") || undefined,
      onChange: (e: { target: { value: string } }) => edit(name, e.target.value),
    };
    return (
      <div className="media-field" data-invalid={error ? "" : undefined}>
        <div className="media-field-label">
          <label htmlFor={`${id}-${name}`}>{labelText}</label>
          {tools}
          {near || error ? (
            <span className="media-field-count" aria-hidden="true">
              {value.length.toLocaleString()} / {limit.toLocaleString()}
            </span>
          ) : null}
        </div>
        {rows ? <textarea rows={rows} {...props} /> : <input {...props} />}
        {hint ? (
          <p id={`${id}-${name}-hint`} className="field-help">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${id}-${name}-error`} className="media-field-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  const deleteButton = (
    <button type="button" className="admin-button admin-button-danger" disabled={busy || used} onClick={() => setConfirming(true)}>
      Delete permanently
    </button>
  );

  return (
    <section className="media-detail" aria-labelledby={`${id}-heading`}>
      <div className="media-detail-head">
        <button type="button" className="admin-button admin-button-quiet" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          All media
        </button>
      </div>
      <h3 id={`${id}-heading`} ref={heading} tabIndex={-1} className="media-detail-title">
        {asset.title || file}
      </h3>
      {asset.trashed ? <p className="media-detail-flag">In the trash. Pages that use it keep working.</p> : null}

      <div className="media-detail-top">
        <div className="media-detail-preview">
          {isImage ? (
            <button type="button" className="media-detail-image" onClick={onView} aria-label={`View ${asset.title || file} full size`} aria-haspopup="dialog">
              <img src={src} alt={asset.alt ?? ""} />
            </button>
          ) : asset.type.startsWith("video/") ? (
            <video src={src} controls preload="metadata" />
          ) : asset.type.startsWith("audio/") ? (
            <AudioFigure src={src} title={asset.title || file} />
          ) : null}
        </div>
        <dl className="media-facts">
          <div>
            <dt>File</dt>
            <dd className="media-facts-file">{file}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{asset.type}</dd>
          </div>
          {dims ? (
            <div>
              <dt>Dimensions</dt>
              <dd>
                {dims.width} × {dims.height}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(asset.size)}</dd>
          </div>
          <div>
            <dt>Uploaded</dt>
            <dd>{formatDay(asset.uploadedAt)}</dd>
          </div>
          {replacedOn(asset.version) ? (
            <div>
              <dt>Replaced</dt>
              <dd>{replacedOn(asset.version)}</dd>
            </div>
          ) : null}
          <div className="media-facts-url">
            <dt>URL</dt>
            <dd>
              <code>{asset.src}</code>
              <CopyButton value={() => new URL(asset.src, window.location.origin).href} label="Copy URL" copiedLabel="URL copied" />
            </dd>
          </div>
        </dl>
      </div>

      <div className="media-detail-block">
        <h4>{usedLabel(asset.usedIn.length)}</h4>
        {used ? (
          <ul className="media-uses">
            {asset.usedIn.map((use) => (
              <li key={`${use.kind ?? "writing"}:${use.id}`}>
                <a href={pageHref(use)} target="_blank" rel="noreferrer">
                  <span>{use.title || "Untitled"}</span>
                  {use.kind === "project" ? <small>Project</small> : use.kind === "website" ? <small>Website</small> : null}
                  <ArrowSquareOut size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-help">No saved draft, live post, project or website content points at this file.</p>
        )}
      </div>

      <form
        className="media-detail-block media-detail-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h4>Details</h4>
        {field("title", "Name")}
        {isImage
          ? field("alt", "Default alt text", "Used for new insertions. Pages already using it keep their own alt text.", 2,
              <AltAssist src={asset.src} value={form.alt} onAlt={(alt) => edit("alt", alt)}
                context={() => ({ title: asset.usedIn[0]?.title, caption: form.caption, fileName: form.title || file })} />)
          : null}
        {field("caption", "Caption", "A description for your own reference and for new insertions.", 3)}
        <div className="media-detail-actions">
          <button className="admin-button admin-button-primary" disabled={busy || !dirty}>
            Save details
          </button>
          {dirty ? (
            <button type="button" className="admin-button admin-button-quiet" disabled={busy} onClick={() => {
                setForm(formOf(asset));
                setErrors({});
              }}>
              Revert
            </button>
          ) : null}
          <span className="field-help" role="status">
            {saved}
          </span>
        </div>
      </form>

      <div className="media-detail-block">
        <h4>Replace file</h4>
        <p className="field-help">
          Upload a new {isImage ? "image" : asset.type.startsWith("video/") ? "video" : "file"} to the same URL. Every page that uses it shows the new file, with no edits.
          {isImage && dims ? ` It is fitted to ${dims.width} × ${dims.height}, the size pages reserve for it.` : ""}
        </p>
        {picked ? (
          <div className="media-replace-confirm">
            <p>
              <strong>{picked.file.name}</strong> · {formatBytes(picked.file.size)}
            </p>
            {picked.notice ? <p className="field-help">{picked.notice}</p> : null}
            <div className="media-detail-actions">
              <button type="button" className="admin-button admin-button-primary" disabled={busy} onClick={replace}>
                {progress || "Replace file"}
              </button>
              <button type="button" className="admin-button admin-button-quiet" disabled={busy} onClick={() => setPicked(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <label className="admin-button" data-disabled={busy || undefined}>
            <Swap size={15} aria-hidden="true" />
            Choose a file…
            <input
              type="file"
              className="sr-only"
              accept={replaceAccept(asset.type)}
              disabled={busy}
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                e.target.value = "";
                void pick(chosen);
              }}
            />
          </label>
        )}
        {replaceError ? (
          <p className="media-field-error" role="alert">
            {replaceError}
          </p>
        ) : null}
      </div>

      <div className="media-detail-block">
        <h4>Remove</h4>
        <p className="field-help">
          Trash hides it from the library; the file stays, so nothing that uses it breaks. Delete permanently removes the file and its sizes for good.
        </p>
        <div className="media-detail-actions">
          <button type="button" className="admin-button" disabled={busy} onClick={() => void setTrashed(!asset.trashed)}>
            {asset.trashed ? <ArrowCounterClockwise size={15} aria-hidden="true" /> : <Trash size={15} aria-hidden="true" />}
            {asset.trashed ? "Restore" : "Move to trash"}
          </button>
          {used ? (
            <Tooltip content={`Used in ${asset.usedIn.length} ${asset.usedIn.length === 1 ? "page" : "pages"}. Remove it there first.`}>
              <span className="media-disabled-wrap" tabIndex={0} aria-describedby={`${id}-delete-why`}>
                {deleteButton}
              </span>
            </Tooltip>
          ) : (
            deleteButton
          )}
        </div>
        {used ? (
          <p id={`${id}-delete-why`} className="sr-only">
            Delete permanently is unavailable while pages use this file.
          </p>
        ) : null}
      </div>

      <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="sheet-backdrop" data-variant="center" />
          <AlertDialog.Popup className="sheet" data-variant="center">
            <div className="sheet-header">
              <div>
                <AlertDialog.Title className="sheet-title">Delete “{asset.title || file}” permanently?</AlertDialog.Title>
                <AlertDialog.Description className="sheet-description">
                  The file and its smaller sizes are removed from storage. Older revisions that pointed at it will show a missing file. This can’t be undone.
                </AlertDialog.Description>
              </div>
            </div>
            <div className="sheet-body">
              <div className="publish-actions">
                <AlertDialog.Close data-slot="alert-dialog-close" className="admin-button admin-button-quiet">
                  Keep it
                </AlertDialog.Close>
                <button type="button" className="admin-button admin-button-danger" data-confirming="" disabled={busy} onClick={() => void destroy()}>
                  {busy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
