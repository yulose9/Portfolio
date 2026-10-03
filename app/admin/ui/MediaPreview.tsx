"use client";

import { ArrowSquareOut, CaretLeft, CaretRight, Info, MagnifyingGlassMinus, MagnifyingGlassPlus, Play, VideoCamera, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import { AudioFigure } from "../../components/writing/AudioPlayer";
import { mediaDimensions, versionedSrc } from "../../../cms/media-details";

/*
 * The media library's previews. An image grows out of its thumbnail into a
 * full view and shrinks back on close, as the same picture getting bigger.
 *
 * Why it never distorts: the thumbnail crops the picture (cover) and the
 * full view shows all of it (contain), so the box's proportions change on the
 * way. Two shared layers carry that: an outer frame that clips (its shape
 * may stretch; it has no content of its own) and the image inside it, which
 * keeps the picture's own proportions at both ends, so its own animation is
 * a uniform scale. The frame's corner radius rides along in `style`, where
 * Motion corrects it for the scale.
 *
 * Audio plays in place, in the same card the published page uses. Video
 * keeps its link to the file.
 */

export type PreviewAsset = {
  src: string;
  type: string;
  title?: string | null;
  alt?: string | null;
  size?: number;
  uploadedAt?: string;
  usedIn?: unknown[];
  version?: string | null;
};

const SPRING = { type: "spring", duration: 0.42, bounce: 0 } as const;
const INSTANT = { duration: 0 } as const;
const label = (a: PreviewAsset) => a.title || a.src.split("/").pop() || "Media";
/** Never more than twice its own size: past that a small picture turns to mush. */
const MAX_UPSCALE = 2;

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.ceil(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
export const usedLabel = (n: number) => (n ? `Used in ${n} ${n === 1 ? "page" : "pages"}` : "Not used on any saved page");

export function AssetPreview({
  asset,
  open,
  playing,
  onOpen,
  onPlay,
}: {
  asset: PreviewAsset;
  /** This image is the one shown full size (its thumbnail steps aside). */
  open: boolean;
  /** This audio is the one playing. */
  playing: boolean;
  onOpen: () => void;
  onPlay: (on: boolean) => void;
}) {
  const still = useReducedMotion();
  const known = mediaDimensions(asset.src);
  const [loaded, setLoaded] = useState<number | null>(null);
  const ratio = known ? known.width / known.height : loaded;
  const src = versionedSrc(asset.src, asset.version);
  if (asset.type.startsWith("image/")) {
    return (
      <button
        type="button"
        className="asset-preview asset-preview-image"
        data-asset-src={asset.src}
        onClick={onOpen}
        aria-label={`View ${label(asset)}`}
        aria-haspopup="dialog"
      >
        {open ? (
          <span className="asset-preview-placeholder" aria-hidden="true" />
        ) : (
          <motion.span className="asset-preview-frame" layoutId={still ? undefined : `media-frame-${asset.src}`} transition={SPRING} style={{ borderRadius: 0 }}>
            <motion.img
              layoutId={still ? undefined : `media-img-${asset.src}`}
              transition={SPRING}
              src={src}
              alt={asset.alt ?? ""}
              loading="lazy"
              draggable={false}
              data-ratio={ratio ? "" : undefined}
              style={ratio ? ({ "--ar": ratio } as CSSProperties) : undefined}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!known && img.naturalWidth && img.naturalHeight) setLoaded(img.naturalWidth / img.naturalHeight);
              }}
            />
          </motion.span>
        )}
      </button>
    );
  }
  if (asset.type.startsWith("audio/")) {
    return playing ? (
      <div className="asset-preview asset-preview-audio" data-playing="">
        <AudioFigure src={src} title={label(asset)} autoPlay />
        <button type="button" className="asset-preview-close" aria-label="Close player" onClick={() => onPlay(false)}>
          <X size={12} weight="bold" aria-hidden="true" />
        </button>
      </div>
    ) : (
      <button type="button" className="asset-preview asset-preview-audio" onClick={() => onPlay(true)} aria-label={`Play ${label(asset)}`}>
        <span className="asset-preview-play" aria-hidden="true">
          <Play size={16} weight="fill" />
        </span>
        <span className="asset-preview-wave" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ height: `${28 + Math.round(Math.abs(Math.sin(i * 1.7)) * 60)}%` }} />
          ))}
        </span>
      </button>
    );
  }
  return (
    <a className="asset-preview" href={src} target="_blank" rel="noreferrer" aria-label={`Open ${label(asset)}`}>
      <VideoCamera size={22} aria-hidden="true" />
    </a>
  );
}

/** The stage's inner size: the viewport less its gutters, the bars and the safe areas (set in CSS). */
function useStageSize(open: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!open || !el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const width = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const height = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);
  return [stage, size] as const;
}

/**
 * The full view: the picture over a dimmed page, fitted to the screen.
 * Click it (or +) for actual size, then drag or scroll to look around; click
 * again (or −) to fit. ← → or a swipe step through the list; Escape, a click
 * outside or ✕ closes, and focus goes back to the picture's thumbnail.
 */
export function ImageLightbox({
  items,
  current,
  onNavigate,
  onClose,
  onDetails,
}: {
  items: PreviewAsset[];
  /** The src shown, or null when closed. */
  current: string | null;
  onNavigate: (src: string) => void;
  onClose: () => void;
  onDetails?: (src: string) => void;
}) {
  const still = useReducedMotion();
  const index = current ? items.findIndex((a) => a.src === current) : -1;
  const asset = index >= 0 ? items[index] : null;
  const open = Boolean(asset);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const lastSrc = useRef<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // Stepping with the arrows swaps the picture in place: no flight, no wait.
  const [stepped, setStepped] = useState(false);
  const [natural, setNatural] = useState<Record<string, { width: number; height: number }>>({});
  const [stage, stageSize] = useStageSize(open && !zoomed);
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ fx: number; fy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (asset) lastSrc.current = asset.src;
  }, [asset]);
  const dims = asset ? (mediaDimensions(asset.src) ?? natural[asset.src] ?? null) : null;
  const scale = dims && stageSize ? Math.min(stageSize.width / dims.width, stageSize.height / dims.height, MAX_UPSCALE) : null;
  const box = dims && scale ? { width: Math.round(dims.width * scale), height: Math.round(dims.height * scale) } : null;
  const canZoom = Boolean(scale && Math.abs(scale - 1) > 0.02);

  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    setZoomed(false);
    setStepped(false);
  }

  const step = useCallback(
    (by: number) => {
      if (index < 0 || items.length < 2) return;
      const next = items[(index + by + items.length) % items.length];
      setZoomed(false);
      setStepped(true);
      onNavigate(next.src);
    },
    [index, items, onNavigate],
  );

  const zoomTo = useCallback(
    (on: boolean, at?: { fx: number; fy: number; px: number; py: number }) => {
      if (on && !canZoom) return;
      anchor.current = on ? (at ?? null) : null;
      setZoomed(on);
    },
    [canZoom],
  );

  // Actual size opens on the point that was clicked (or the middle).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!zoomed || !el || !dims) return;
    const a = anchor.current ?? { fx: 0.5, fy: 0.5, px: el.clientWidth / 2, py: el.clientHeight / 2 };
    el.scrollLeft = a.fx * dims.width - a.px;
    el.scrollTop = a.fy * dims.height - a.py;
  }, [zoomed, dims]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      // Back to the thumbnail of the picture last shown (it may not be the one opened).
      const src = lastSrc.current;
      const thumb = src ? document.querySelector<HTMLElement>(`[data-asset-src="${CSS.escape(src)}"]`) : null;
      (thumb ?? (opener.current as HTMLElement | null))?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Capture phase, so these keys act on the picture before the sheet behind it sees them.
    const onKey = (e: KeyboardEvent) => {
      const handled = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (e.key === "Escape") {
        handled();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (zoomed) return; // arrows scroll the picture at actual size
        handled();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "+" || e.key === "=") {
        handled();
        zoomTo(true);
      } else if (e.key === "-" || e.key === "_") {
        handled();
        zoomTo(false);
      } else if (e.key === "Tab" && dialog.current) {
        // Keep focus inside the picture's controls.
        const stops = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
        if (!stops.length) return;
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          handled();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          handled();
          first.focus();
        } else if (!dialog.current.contains(document.activeElement)) {
          handled();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, step, zoomTo, zoomed]);

  // Swipe (touch) to step; a tap still toggles zoom.
  const swipe = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const swiped = useRef(false);
  const onStageDown = (e: ReactPointerEvent) => {
    swiped.current = false;
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  };
  const onStageUp = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId || zoomed) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - s.t);
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && (Math.abs(dx) > 60 || (Math.abs(dx) > 20 && velocity > 0.4))) {
      swiped.current = true;
      window.setTimeout(() => (swiped.current = false), 400);
      step(dx < 0 ? 1 : -1);
    }
  };

  // Drag to pan at actual size (a mouse; touch scrolls natively). A press
  // that barely moves is a click, which returns to fit.
  const pan = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const onPanDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = e.currentTarget;
    pan.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPanMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) < 4) return;
    p.moved = true;
    e.currentTarget.scrollLeft = p.left - dx;
    e.currentTarget.scrollTop = p.top - dy;
  };
  const onPanUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    pan.current = null;
    if (p && !p.moved) zoomTo(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const flight = stepped ? INSTANT : SPRING;
  const src = asset ? versionedSrc(asset.src, asset.version) : "";
  const facts = asset
    ? [
        dims ? `${dims.width} × ${dims.height}` : null,
        asset.size ? formatBytes(asset.size) : null,
        asset.uploadedAt ? formatDay(asset.uploadedAt) : null,
        asset.usedIn ? usedLabel(asset.usedIn.length) : null,
      ].filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {asset ? (
        <motion.div
          key="lightbox"
          ref={dialog}
          className="media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={label(asset)}
          aria-describedby="media-lightbox-facts"
          data-zoomed={zoomed || undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0.15 : 0.2 }}
          onClick={() => {
            // The click a swipe can leave behind is not a click outside.
            if (swiped.current) swiped.current = false;
            else onClose();
          }}
        >
          <div className="media-lightbox-top" onClick={(e) => e.stopPropagation()}>
            {items.length > 1 ? (
              <span className="media-lightbox-count">
                {index + 1} of {items.length}
              </span>
            ) : (
              <span />
            )}
            <button ref={closeButton} type="button" className="media-lightbox-round" onClick={onClose} aria-label="Close preview">
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>

          {zoomed && dims ? (
            <div
              ref={scroller}
              className="media-lightbox-scroller"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={onPanDown}
              onPointerMove={onPanMove}
              onPointerUp={onPanUp}
              onPointerCancel={() => (pan.current = null)}
            >
              <div className="media-lightbox-actual">
                <img src={src} alt={asset.alt ?? ""} width={dims.width} height={dims.height} draggable={false} />
              </div>
            </div>
          ) : (
            <div ref={stage} className="media-lightbox-stage" onPointerDown={onStageDown} onPointerUp={onStageUp} onPointerCancel={() => (swipe.current = null)}>
              <motion.div
                key={asset.src}
                className="media-lightbox-frame"
                layoutId={still ? undefined : `media-frame-${asset.src}`}
                transition={flight}
                style={{ borderRadius: 10, ...(box ? { width: box.width, height: box.height } : null) }}
                data-fallback={box ? undefined : ""}
                data-zoomable={canZoom || undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (swiped.current) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  const stageRect = stage.current?.getBoundingClientRect();
                  zoomTo(true, {
                    fx: (e.clientX - r.left) / r.width,
                    fy: (e.clientY - r.top) / r.height,
                    px: e.clientX - (stageRect?.left ?? 0),
                    py: e.clientY - (stageRect?.top ?? 0),
                  });
                }}
              >
                <motion.img
                  layoutId={still ? undefined : `media-img-${asset.src}`}
                  transition={flight}
                  className="media-lightbox-img"
                  src={src}
                  alt={asset.alt ?? ""}
                  draggable={false}
                  style={box ? { width: box.width, height: box.height } : undefined}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (!mediaDimensions(asset.src) && img.naturalWidth)
                      setNatural((n) => (n[asset.src] ? n : { ...n, [asset.src]: { width: img.naturalWidth, height: img.naturalHeight } }));
                  }}
                />
              </motion.div>
              {items.length > 1 ? (
                <>
                  <button type="button" className="media-lightbox-round media-lightbox-step" data-side="previous" aria-label="Previous image" onClick={(e) => {
                      e.stopPropagation();
                      step(-1);
                    }}>
                    <CaretLeft size={16} weight="bold" aria-hidden="true" />
                  </button>
                  <button type="button" className="media-lightbox-round media-lightbox-step" data-side="next" aria-label="Next image" onClick={(e) => {
                      e.stopPropagation();
                      step(1);
                    }}>
                    <CaretRight size={16} weight="bold" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          )}

          <div className="media-lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <div className="media-lightbox-text">
              <span className="media-lightbox-title">{label(asset)}</span>
              <span id="media-lightbox-facts" className="media-lightbox-facts">
                {facts.join(" · ")}
              </span>
            </div>
            <div className="media-lightbox-actions">
              {canZoom ? (
                <button
                  type="button"
                  className="media-lightbox-action"
                  onClick={() => zoomTo(!zoomed)}
                  aria-pressed={zoomed}
                  aria-label={zoomed ? "Fit to screen (−)" : "Actual size (+)"}
                  title={zoomed ? "Fit to screen (−)" : "Actual size (+)"}
                >
                  {zoomed ? <MagnifyingGlassMinus size={15} aria-hidden="true" /> : <MagnifyingGlassPlus size={15} aria-hidden="true" />}
                </button>
              ) : null}
              <a className="media-lightbox-action" href={src} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={14} aria-hidden="true" /> Original
              </a>
              {onDetails ? (
                <button type="button" className="media-lightbox-action" onClick={() => onDetails(asset.src)}>
                  <Info size={15} aria-hidden="true" /> Details
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
