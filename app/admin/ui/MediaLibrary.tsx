"use client";
import { useEffect, useRef, useState } from "react";
import {
  SquaresFour,
  List,
  UploadSimple,
  Trash,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import Sheet from "./Sheet";
import {
  AssetPreview,
  ImageLightbox,
  formatBytes,
  formatDay,
  usedLabel,
} from "./MediaPreview";
import MediaDetails from "./MediaDetails";
import { api } from "./api";
import { mediaApi } from "./media-api";
import { uploadMedia, ACCEPT } from "./media";
import { beginPendingWork } from "./session";
import { assetIdentity } from "../../../cms/media-library";
import { MagneticDropzone } from "../../components/kit/inputs/magnetic-dropzone";
export type Asset = {
  src: string;
  size: number;
  type: string;
  uploadedAt: string;
  /** The pages that reference it; `kind` is absent from older servers (writing). */
  usedIn: {
    id: string;
    title: string;
    kind?: "writing" | "project" | "website";
  }[];
  title?: string;
  alt?: string;
  caption?: string;
  trashed?: boolean;
  base?: string | null;
  digest?: string | null;
  /** Set once the file has been replaced; the admin shows `src?v=<version>`. */
  version?: string | null;
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
    // Loading the list is not a write: the sheet can always be closed while
    // it loads (a hung request must never trap anyone). Only a write holds it.
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [view, setView] = useState<"gallery" | "list">("gallery"),
    [trash, setTrash] = useState(false),
    // The asset whose details are open, by src.
    [detail, setDetail] = useState<string | null>(null),
    [progress, setProgress] = useState(""),
    // The image open full size, and the audio playing, if any (one at a time).
    [viewing, setViewing] = useState<string | null>(null),
    [playing, setPlaying] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const gridScroll = useRef(0);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (open) setLoading(true);
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
        if (alive) setLoading(false);
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
      const r = await mediaApi.saveDetails({
        src: asset.src,
        title: asset.title ?? "",
        alt: asset.alt ?? "",
        caption: asset.caption ?? "",
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
    });
  const update = (next: Asset) =>
    setAssets((rows) => rows.map((a) => (a.src === next.src ? next : a)));
  const sheetBody = () =>
    root.current?.closest<HTMLElement>(".sheet-body") ?? null;
  const openDetail = (src: string) => {
    gridScroll.current = sheetBody()?.scrollTop ?? 0;
    setViewing(null);
    setDetail(src);
    const body = sheetBody();
    if (body) body.scrollTop = 0;
  };
  // Back to the grid where it was, with focus on the asset just left.
  const closeDetail = (focusSrc: string | null = detail) => {
    setDetail(null);
    requestAnimationFrame(() => {
      const body = sheetBody();
      if (body) body.scrollTop = gridScroll.current;
      if (!focusSrc) return;
      const s = CSS.escape(focusSrc);
      document
        .querySelector<HTMLElement>(
          `[data-asset-src="${s}"], [data-asset-details="${s}"]`,
        )
        ?.focus({ preventScroll: true });
    });
  };
  const detailAsset = detail
    ? (assets.find((a) => a.src === detail) ?? null)
    : null;
  // Several at once, one after another: each one's progress reads
  // "2 of 5 · Uploading…", and a failure stops the rest with what it was.
  const uploadFiles = (files: File[]) => {
    if (!files.length) return;
    void perform(async () => {
      for (const [i, file] of files.entries()) {
        const of = files.length > 1 ? `${i + 1} of ${files.length} · ` : "";
        await uploadMedia(file, (_, label) => setProgress(`${of}${label}`));
      }
      await refresh();
    });
  };
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
  // The pictures the full view steps through: the images in this view, in order.
  const lightboxItems = shown.filter((a) => a.type.startsWith("image/"));
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) {
          setDetail(null);
          setViewing(null);
          onClose();
        }
      }}
      title="Media library"
      description="Reuse an image, organize its details, or upload something new."
      className="media-workspace"
    >
      <div ref={root} hidden />
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
      {detailAsset ? (
        <MediaDetails
          asset={detailAsset}
          busy={busy}
          perform={perform}
          onBack={() => closeDetail()}
          onChange={update}
          onDeleted={() => {
            setAssets((rows) => rows.filter((a) => a.src !== detailAsset.src));
            closeDetail(null);
          }}
          onView={() => setViewing(detailAsset.src)}
        />
      ) : (
        <>
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
                aria-label="Upload media (one or more files)"
                accept={ACCEPT}
                multiple
                disabled={busy}
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = "";
                  uploadFiles(files);
                }}
              />
            </label>
          </div>
          {/* Drop files anywhere near it: the zone wakes when a file is dragged
          over the page and leans toward the pointer. Click or Enter picks. */}
          {!trash ? (
            <MagneticDropzone
              className="media-dropzone"
              accept={ACCEPT}
              multiple
              disabled={busy}
              title="Drop images, video or audio"
              hint="Or click to choose. HEIC photos are converted."
              onFiles={uploadFiles}
            />
          ) : null}
          <p className="field-help" role="status">
            {busy || loading
              ? progress || (busy ? "Saving…" : "Loading…")
              : `${shown.length} ${shown.length === 1 ? "asset" : "assets"}${cursor ? " loaded" : ""}`}
          </p>
          <div className="asset-grid" data-view={view}>
            {shown.map((asset) => (
              <article key={asset.src} className="asset-card">
                <AssetPreview
                  asset={asset}
                  open={viewing === asset.src}
                  playing={playing === asset.src}
                  onOpen={() => setViewing(asset.src)}
                  onPlay={(on) => setPlaying(on ? asset.src : null)}
                />
                <div className="asset-info">
                  <strong>{asset.title || asset.src.split("/").pop()}</strong>
                  <small>
                    {formatBytes(asset.size)} · {formatDay(asset.uploadedAt)}
                  </small>
                  <small>{usedLabel(asset.usedIn.length)}</small>
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
                      data-asset-details={asset.src}
                      onClick={() => openDetail(asset.src)}
                    >
                      Details
                    </button>
                    <button
                      className="admin-icon-button"
                      disabled={busy}
                      aria-label={
                        trash ? "Restore asset" : "Move asset to trash"
                      }
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
          {!shown.length && !busy && !loading ? (
            <p>No media matches this view.</p>
          ) : null}
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
        </>
      )}
      <ImageLightbox
        items={detailAsset ? [detailAsset] : lightboxItems}
        current={viewing}
        onNavigate={setViewing}
        onClose={() => setViewing(null)}
        onDetails={detailAsset ? undefined : openDetail}
      />
    </Sheet>
  );
}
