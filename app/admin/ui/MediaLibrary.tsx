"use client";
import { useEffect, useState } from "react";
import {
  SquaresFour,
  List,
  UploadSimple,
  Trash,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import Sheet from "./Sheet";
import { api } from "./api";
import { uploadMedia } from "./media";
import { beginPendingWork } from "./session";
import { assetIdentity } from "../../../cms/media-library";
export type Asset = {
  src: string;
  size: number;
  type: string;
  uploadedAt: string;
  usedIn: { id: string; title: string }[];
  title?: string;
  alt?: string;
  trashed?: boolean;
  base?: string | null;
  digest?: string | null;
};
export default function MediaLibrary({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert?: (asset: Asset) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [view, setView] = useState<"gallery" | "list">("gallery"),
    [trash, setTrash] = useState(false),
    [edit, setEdit] = useState<Asset | null>(null),
    [progress, setProgress] = useState("");
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (open) setBusy(true);
  }
  const refresh = async () => {
    const r = await api.media();
    setAssets(r.assets);
    setCursor(r.cursor);
  };
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api
      .media()
      .then((r) => {
        if (alive) {
          setAssets(r.assets);
          setCursor(r.cursor);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);
  const perform = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const finish = beginPendingWork();
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update media.");
    } finally {
      finish();
      setBusy(false);
      setProgress("");
    }
  };
  const save = (asset: Asset, trashed = Boolean(asset.trashed)) =>
    perform(async () => {
      const r = await api.saveMedia({
        src: asset.src,
        title: asset.title ?? "",
        alt: asset.alt ?? "",
        trashed,
        base: asset.base ?? null,
      });
      setAssets((rows) =>
        rows.map((a) =>
          assetIdentity(a.src, a.digest) ===
          assetIdentity(asset.src, asset.digest)
            ? {
                ...a,
                title: asset.title,
                alt: asset.alt,
                trashed,
                base: r.base,
              }
            : a,
        ),
      );
      setEdit(null);
    });
  const unique = [
    ...new Map(
      [...assets]
        .reverse()
        .filter((a) => Boolean(a.trashed) === trash)
        .map((a) => [assetIdentity(a.src, a.digest), a]),
    ).values(),
  ];
  const shown = unique.filter(
    (a) =>
      Boolean(a.trashed) === trash &&
      `${a.title ?? ""} ${a.src} ${a.alt ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) {
          setEdit(null);
          onClose();
        }
      }}
      title="Media library"
      description="Reuse an image, organize its details, or upload something new."
      className="media-workspace"
    >
      <div className="library-tools">
        <input
          aria-label="Search media"
          placeholder="Search media…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="view-switch" role="group" aria-label="Media view">
          <button
            aria-label="Gallery view"
            aria-pressed={view === "gallery"}
            onClick={() => setView("gallery")}
          >
            <SquaresFour size={18} />
          </button>
          <button
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={18} />
          </button>
        </div>
        <button
          className="admin-button admin-button-quiet"
          aria-pressed={trash}
          onClick={() => setTrash(!trash)}
        >
          <Trash size={15} />
          Trash
        </button>
        <label className="admin-button admin-button-primary">
          <UploadSimple size={15} />
          Upload
          <input
            type="file"
            className="sr-only"
            aria-label="Upload media"
            accept="image/*,video/*,audio/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void perform(async () => {
                  await uploadMedia(file, (_, label) => setProgress(label));
                  await refresh();
                });
            }}
          />
        </label>
      </div>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="admin-button"
            onClick={() => void perform(refresh)}
          >
            Refresh
          </button>
        </p>
      ) : null}
      <p className="field-help" role="status">
        {busy
          ? progress || "Loading…"
          : `${shown.length} ${shown.length === 1 ? "asset" : "assets"}${cursor ? " loaded" : ""}`}
      </p>
      {edit ? (
        <form
          className="media-details"
          onSubmit={(e) => {
            e.preventDefault();
            void save(edit);
          }}
        >
          <label className="picker-field">
            Name
            <input
              maxLength={200}
              value={edit.title ?? ""}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
            />
          </label>
          <label className="picker-field">
            Default alt text
            <input
              maxLength={1000}
              value={edit.alt ?? ""}
              onChange={(e) => setEdit({ ...edit, alt: e.target.value })}
            />
          </label>
          <p className="field-help">
            Used for new insertions. Existing pages keep their own alt text.
          </p>
          <button className="admin-button admin-button-primary" disabled={busy}>
            Save details
          </button>{" "}
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            onClick={() => setEdit(null)}
          >
            Cancel
          </button>
        </form>
      ) : null}
      <div className="asset-grid" data-view={view}>
        {shown.map((asset) => (
          <article key={asset.src} className="asset-card">
            <a
              className="asset-preview"
              href={asset.src}
              target="_blank"
              rel="noreferrer"
              aria-label={`Preview ${asset.title || "asset"}`}
            >
              {asset.type.startsWith("image/") ? (
                <img src={asset.src} alt={asset.alt ?? ""} loading="lazy" />
              ) : (
                <span>
                  {asset.type.startsWith("video/") ? "Video" : "Audio"}
                </span>
              )}
            </a>
            <div className="asset-info">
              <strong>{asset.title || asset.src.split("/").pop()}</strong>
              <small>
                {Math.ceil(asset.size / 1024)} KB ·{" "}
                {new Date(asset.uploadedAt).toLocaleDateString()}
              </small>
              <small>
                {asset.usedIn.length
                  ? `Used in ${asset.usedIn.length} pages`
                  : "No saved page references"}
              </small>
              <div className="asset-actions">
                {onInsert && !trash ? (
                  <button
                    className="admin-button"
                    onClick={() => onInsert(asset)}
                  >
                    Insert
                  </button>
                ) : null}
                <button
                  className="admin-button admin-button-quiet"
                  disabled={busy}
                  onClick={() => setEdit(asset)}
                >
                  Details
                </button>
                <button
                  className="admin-icon-button"
                  disabled={busy}
                  aria-label={trash ? "Restore asset" : "Move asset to trash"}
                  onClick={() => void save(asset, !trash)}
                >
                  {trash ? (
                    <ArrowCounterClockwise size={16} />
                  ) : (
                    <Trash size={16} />
                  )}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && !busy ? <p>No media matches this view.</p> : null}
      {cursor ? (
        <button
          className="admin-button"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              const r = await api.media(cursor);
              setAssets((a) => [...a, ...r.assets]);
              setCursor(r.cursor);
            })
          }
        >
          Load more
        </button>
      ) : null}
      {trash ? (
        <p className="field-help">
          Trashed assets are hidden from the library. Their files remain
          available to published pages and revision history.
        </p>
      ) : null}
    </Sheet>
  );
}
