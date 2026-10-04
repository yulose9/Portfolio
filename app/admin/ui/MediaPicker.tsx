"use client";

import { Popover } from "@base-ui/react/popover";
import { Tabs } from "@base-ui/react/tabs";
import { useEffect, useId, useRef, useState, type ComponentProps, type DragEvent, type KeyboardEvent, type ReactElement } from "react";

import { imageInfo, videoInfo, type MediaKind } from "../../../cms/media";
import { MagneticDropzone } from "../../components/kit/inputs/magnetic-dropzone";
import { altFromName, api, ApiError } from "./api";
import type { Asset } from "./MediaLibrary";
import { kindOf, uploadMedia } from "./media";
import { beginPendingWork } from "./session";
import "../media-picker.css";

/*
 * The compact picker Notion opens under "Change cover": Gallery, Upload and
 * Link tabs in a 540px popover, Remove on the right of the tab row.
 *
 *  - Gallery: plain colours and gradients (static SVGs in /public/covers,
 *    so a cover stays an ordinary image URL), then what's already in the
 *    media library, newest first. "Browse all" opens the full library.
 *  - Upload: the same pipeline as everywhere else (media.ts), so sizes,
 *    posters and video transcoding stay; drop a file on the popover or paste
 *    one while it's open. Or hand the files to `onFiles` instead (the body
 *    does, so its uploads go through the recoverable media jobs).
 *  - Link: an image URL, checked by loading it before it's used.
 */

export type MediaAccept = "image" | "image+video" | "audio" | "any";

export type MediaPick = {
  src: string;
  kind: MediaKind;
  width?: number;
  height?: number;
  alt?: string;
  poster?: string | null;
  loop?: boolean;
  /** Set on a fresh upload, whose alt is only its file name: a cue to suggest a real one. */
  fileName?: string;
};

type Tab = "gallery" | "upload" | "link";

/** Colour and gradient covers, drawn at 1500×500 (public/covers). */
export const COVER_SWATCHES: { src: string; name: string }[] = [
  { src: "/covers/solid-ink.svg", name: "Ink" },
  { src: "/covers/solid-stone.svg", name: "Stone" },
  { src: "/covers/solid-moss.svg", name: "Moss" },
  { src: "/covers/solid-harbor.svg", name: "Harbor" },
  { src: "/covers/solid-rose.svg", name: "Rose" },
  { src: "/covers/solid-saffron.svg", name: "Saffron" },
  { src: "/covers/gradient-dawn.svg", name: "Dawn gradient" },
  { src: "/covers/gradient-sea-glass.svg", name: "Sea glass gradient" },
  { src: "/covers/gradient-ember.svg", name: "Ember gradient" },
  { src: "/covers/gradient-meadow.svg", name: "Meadow gradient" },
  { src: "/covers/gradient-night.svg", name: "Night gradient" },
];

const COLUMNS = 4;

const ACCEPT_ATTR: Record<MediaAccept, string> = {
  image: "image/*,.heic,.heif",
  "image+video": "image/*,video/*,.heic,.heif",
  audio: "audio/*",
  any: "image/*,video/*,audio/*,.heic,.heif",
};

const allows = (accept: MediaAccept, kind: MediaKind | null) =>
  kind !== null && (accept === "any" || (accept === "audio" ? kind === "audio" : kind === "image" || (accept === "image+video" && kind === "video")));

const NOUN: Record<MediaAccept, string> = { image: "an image", "image+video": "an image or a video", audio: "an audio file", any: "a photo, video or audio file" };

/** A library file this picker can offer, and its thumbnail. */
function usable(asset: Asset, accept: MediaAccept): { pick: MediaPick; thumb: string | null } | null {
  if (asset.trashed) return null;
  // Smaller widths and posters sit beside the file they belong to.
  if (/-(\d{2,5}|poster)\.(webp|jpg)$/.test(asset.src)) return null;
  const alt = asset.alt ?? "";
  if (asset.type.startsWith("image/")) {
    if (!allows(accept, "image")) return null;
    const info = imageInfo(asset.src);
    const thumb = info && info.width > 640 ? asset.src.replace(/-\d+x\d+\.(webp|jpg)$/, "-640.$1") : asset.src;
    return { pick: { src: asset.src, kind: "image", width: info?.width, height: info?.height, alt }, thumb };
  }
  if (asset.type.startsWith("video/")) {
    if (!allows(accept, "video")) return null;
    const info = videoInfo(asset.src);
    return { pick: { src: asset.src, kind: "video", width: info?.width, height: info?.height, poster: info?.poster ?? null, alt }, thumb: info?.poster ?? null };
  }
  if (asset.type.startsWith("audio/") && allows(accept, "audio")) return { pick: { src: asset.src, kind: "audio", alt }, thumb: null };
  return null;
}

/** Arrow keys move through a grid of buttons; one of them is in the tab order. */
function gridKeys(e: KeyboardEvent<HTMLElement>) {
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[e.key];
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-cell]")];
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  let next = at;
  if (step) next = Math.min(items.length - 1, Math.max(0, at + step));
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  else return;
  e.preventDefault();
  items.forEach((item, i) => (item.tabIndex = i === next ? 0 : -1));
  items[next]?.focus();
}

/** Loads a URL as an image, for its size; fails if it isn't one. */
function probeImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error("timeout")), 12_000);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth && img.naturalHeight) resolve({ width: img.naturalWidth, height: img.naturalHeight });
      else reject(new Error("empty"));
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("error"));
    };
    img.src = src;
  });
}

export default function MediaPicker({
  accept,
  title,
  onPick,
  onFiles,
  onRemove,
  onBrowseAll,
  swatches,
  trigger,
  anchor,
  open: controlled,
  onOpenChange,
  finalFocus,
  defaultTab,
}: {
  accept: MediaAccept;
  /** Names the popover for assistive tech ("Cover", "Add media"). */
  title: string;
  onPick: (pick: MediaPick) => void;
  /** Take the files instead of uploading them here (the body's media jobs). */
  onFiles?: (files: File[]) => void;
  /** Offered on the right of the tab row, when there's something to remove. */
  onRemove?: () => void;
  /** Opens the full media library. */
  onBrowseAll?: () => void;
  /** The colour and gradient row (covers). */
  swatches?: { src: string; name: string }[];
  /** The button that opens it. Without one, pass `anchor` and `open`. */
  trigger?: ReactElement;
  anchor?: ComponentProps<typeof Popover.Positioner>["anchor"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  finalFocus?: ComponentProps<typeof Popover.Popup>["finalFocus"];
  defaultTab?: Tab;
}) {
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const withGallery = accept !== "audio" || Boolean(onBrowseAll);
  const first: Tab = defaultTab ?? (swatches?.length ? "gallery" : "upload");
  const [tab, setTab] = useState<Tab>(first);
  const [progress, setProgress] = useState<{ fraction: number; label: string } | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");
  const [checking, setChecking] = useState(false);
  const linkId = useId();

  // Each opening starts clean, on its first tab.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setTab(first);
      setError("");
      setLink("");
      setDragging(false);
    }
  }

  const choose = (pick: MediaPick) => {
    onPick(pick);
    setOpen(false);
  };

  const takeFiles = async (list: File[]) => {
    if (progress) return;
    const files = list.filter((f) => allows(accept, kindOf(f)));
    if (!files.length) {
      setError(list.length ? `That file isn’t ${NOUN[accept]}.` : "");
      return;
    }
    setError("");
    if (onFiles) {
      onFiles(files);
      setOpen(false);
      return;
    }
    const file = files[0];
    const finish = beginPendingWork();
    setProgress({ fraction: 0, label: "Preparing" });
    try {
      const up = await uploadMedia(file, (fraction, label) => setProgress({ fraction, label }));
      const alt = altFromName(file.name);
      if (up.kind === "image") choose({ kind: "image", src: up.src, width: up.width, height: up.height, alt, fileName: file.name });
      else if (up.kind === "video") choose({ kind: "video", src: up.src, width: up.width, height: up.height, poster: up.poster, loop: up.loop, alt });
      else choose({ kind: "audio", src: up.src, alt });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The upload failed. Try again.");
    } finally {
      finish();
      setProgress(null);
    }
  };

  const submitLink = async () => {
    const src = link.trim();
    if (!src) return setError("Paste a link to an image first.");
    let url: URL | null = null;
    try {
      url = new URL(src, window.location.origin);
    } catch {}
    const local = src.startsWith("/") && !src.startsWith("//");
    if (!url || (!local && url.protocol !== "https:") || url.username || url.password) {
      return setError("Use an https:// link, or a path on this site that starts with /.");
    }
    setChecking(true);
    setError("");
    try {
      const size = await probeImage(src);
      const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      choose({ kind: "image", src, ...size, alt: altFromName(name) });
    } catch {
      setError("That link didn’t load as an image. Check that it points at the picture itself, not a page.");
    } finally {
      setChecking(false);
    }
  };

  const onDrag = (e: DragEvent<HTMLElement>, over: boolean) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragging(over);
  };

  const pasteKey = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘V" : "Ctrl+V";
  const imageHint = accept === "image" || accept === "image+video";

  return (
    <Popover.Root open={open} onOpenChange={(next) => setOpen(next)}>
      {trigger ? <Popover.Trigger render={trigger} /> : null}
      <Popover.Portal>
        <Popover.Positioner className="media-picker-positioner" side="bottom" align="start" sideOffset={6} collisionPadding={12} anchor={anchor}>
          <Popover.Popup
            className="media-picker"
            data-dragging={dragging || undefined}
            data-lenis-prevent
            finalFocus={finalFocus}
            onDragEnter={(e) => onDrag(e, true)}
            onDragOver={(e) => onDrag(e, true)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(e) => {
              if (!e.dataTransfer.files.length) return;
              e.preventDefault();
              setDragging(false);
              void takeFiles([...e.dataTransfer.files]);
            }}
            onPaste={(e) => {
              const files = [...e.clipboardData.files];
              if (!files.length) return;
              e.preventDefault();
              void takeFiles(files);
            }}
          >
            <Popover.Title className="sr-only">{title}</Popover.Title>
            <Tabs.Root value={tab} onValueChange={(value) => { setTab(value as Tab); setError(""); }}>
              <div className="media-picker-head">
                <Tabs.List className="media-picker-tabs" aria-label={title}>
                  {withGallery ? <Tabs.Tab value="gallery" className="media-picker-tab">Gallery</Tabs.Tab> : null}
                  <Tabs.Tab value="upload" className="media-picker-tab">Upload</Tabs.Tab>
                  {accept !== "audio" ? <Tabs.Tab value="link" className="media-picker-tab">Link</Tabs.Tab> : null}
                  <Tabs.Indicator className="media-picker-indicator" />
                </Tabs.List>
                {onRemove ? (
                  <button type="button" className="media-picker-remove" onClick={() => { onRemove(); setOpen(false); }}>
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="media-picker-body">
                {withGallery ? (
                  <Tabs.Panel value="gallery" className="media-picker-panel">
                    {swatches?.length ? (
                      <section aria-labelledby={`${linkId}-colors`}>
                        <h3 id={`${linkId}-colors`} className="media-picker-label">Color &amp; gradient</h3>
                        <div className="media-picker-grid" role="group" aria-labelledby={`${linkId}-colors`} onKeyDown={gridKeys}>
                          {swatches.map((s, i) => (
                            <button
                              key={s.src}
                              type="button"
                              data-cell=""
                              tabIndex={i === 0 ? 0 : -1}
                              className="media-picker-cell"
                              aria-label={s.name}
                              title={s.name}
                              onClick={() => choose({ kind: "image", src: s.src, width: 1500, height: 500, alt: "" })}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.src} alt="" draggable={false} />
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    <Library accept={accept} active={open && tab === "gallery"} onChoose={choose} onUpload={() => setTab("upload")}
                      onBrowseAll={onBrowseAll ? () => { setOpen(false); onBrowseAll(); } : undefined} />
                  </Tabs.Panel>
                ) : null}

                <Tabs.Panel value="upload" className="media-picker-panel media-picker-upload">
                  {progress ? (
                    <div className="media-picker-progress" role="status">
                      <span className="media-picker-meter" aria-hidden="true">
                        <span style={{ transform: `scaleX(${Math.max(0.04, progress.fraction)})` }} />
                      </span>
                      <span>{progress.label} · {Math.round(progress.fraction * 100)}%</span>
                    </div>
                  ) : (
                    <>
                      <MagneticDropzone
                        onFiles={(files) => void takeFiles(files)}
                        accept={ACCEPT_ATTR[accept]}
                        multiple={Boolean(onFiles)}
                        disabled={Boolean(progress)}
                        title={onFiles ? "Drop files to upload" : "Drop a file to upload"}
                        hint={<>or click to choose · {pasteKey} to paste</>}
                        className="media-picker-magnetic-dropzone"
                      />
                      {imageHint ? <p className="media-picker-hint">Images wider than 1500 pixels work best.</p> : null}
                    </>
                  )}
                </Tabs.Panel>

                {accept !== "audio" ? (
                  <Tabs.Panel value="link" className="media-picker-panel">
                    <form
                      className="media-picker-link"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitLink();
                      }}
                    >
                      <label htmlFor={linkId} className="sr-only">Image link</label>
                      <input
                        id={linkId}
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Paste an image link…"
                        value={link}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={error ? `${linkId}-error` : undefined}
                        onChange={(e) => { setLink(e.target.value); setError(""); }}
                      />
                      <button type="submit" className="admin-button admin-button-primary" disabled={checking || !link.trim()}>
                        {checking ? "Checking…" : "Submit"}
                      </button>
                    </form>
                    <p className="media-picker-hint">Works with any image on the web.</p>
                  </Tabs.Panel>
                ) : null}

                {error ? <p className="media-picker-error" role="alert" id={`${linkId}-error`}>{error}</p> : null}
              </div>
            </Tabs.Root>
            {dragging ? <div className="media-picker-drop" aria-hidden="true">Drop to upload</div> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Uploaded files, newest first, a page at a time. */
function Library({
  accept,
  active,
  onChoose,
  onUpload,
  onBrowseAll,
}: {
  accept: MediaAccept;
  active: boolean;
  onChoose: (pick: MediaPick) => void;
  onUpload: () => void;
  onBrowseAll?: () => void;
}) {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const headingId = useId();

  const load = async (from?: string) => {
    setLoading(true);
    setError("");
    try {
      const page = await api.media(from);
      setAssets((rows) => [...(from ? rows ?? [] : []), ...page.assets]);
      setCursor(page.cursor);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn’t load your uploads.");
    } finally {
      setLoading(false);
    }
  };

  // The first page loads when the gallery is first shown.
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    void load();
  }, [active]);

  const seen = new Set<string>();
  const rows = (assets ?? [])
    .map((a) => ({ asset: a, use: usable(a, accept) }))
    .filter((r): r is { asset: Asset; use: NonNullable<ReturnType<typeof usable>> } => {
      if (!r.use || seen.has(r.asset.src)) return false;
      seen.add(r.asset.src);
      return true;
    })
    .sort((a, b) => Date.parse(b.asset.uploadedAt) - Date.parse(a.asset.uploadedAt));

  return (
    <section aria-labelledby={headingId} aria-busy={loading || undefined}>
      <div className="media-picker-section-head">
        <h3 id={headingId} className="media-picker-label">Uploaded</h3>
        {onBrowseAll ? (
          <button type="button" className="media-picker-text-button" onClick={onBrowseAll}>
            Browse all
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="media-picker-error" role="alert">
          {error}{" "}
          <button type="button" className="media-picker-text-button" onClick={() => void load()}>Try again</button>
        </p>
      ) : assets === null ? (
        <div className="media-picker-grid" aria-hidden="true">
          {Array.from({ length: COLUMNS }, (_, i) => <span key={i} className="media-picker-cell media-picker-cell-loading" />)}
        </div>
      ) : rows.length ? (
        <div className="media-picker-grid" role="group" aria-labelledby={headingId} onKeyDown={gridKeys}>
          {rows.map(({ asset, use }, i) => {
            const name = asset.title || asset.alt || asset.src.split("/").pop() || "Upload";
            return (
              <button key={asset.src} type="button" data-cell="" tabIndex={i === 0 ? 0 : -1} className="media-picker-cell" aria-label={name} title={name}
                data-kind={use.pick.kind} onClick={() => onChoose(use.pick)}>
                {use.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={use.thumb} alt="" loading="lazy" draggable={false} />
                ) : (
                  <span className="media-picker-cell-name">{name}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="media-picker-empty">
          Nothing uploaded yet.{" "}
          <button type="button" className="media-picker-text-button" onClick={onUpload}>Upload a file</button>
        </p>
      )}
      {cursor && !error ? (
        <button type="button" className="media-picker-more" disabled={loading} onClick={() => void load(cursor)}>
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
