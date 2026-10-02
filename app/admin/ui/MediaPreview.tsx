"use client";

import { ArrowSquareOut, Play, VideoCamera, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { AudioFigure } from "../../components/writing/AudioPlayer";

/*
 * The media library's previews. An image grows out of its thumbnail into a
 * full view (a shared layout animation, so it reads as the same picture
 * getting bigger) and shrinks back on close. Audio plays in place, in the
 * same card the published page uses. Video keeps its link to the file.
 */

type Asset = { src: string; type: string; title?: string | null; alt?: string | null };

const SPRING = { type: "spring", duration: 0.42, bounce: 0 } as const;
const label = (a: Asset) => a.title || a.src.split("/").pop() || "Media";

export function AssetPreview({
  asset,
  open,
  playing,
  onOpen,
  onPlay,
}: {
  asset: Asset;
  /** This image is the one shown full size (its thumbnail steps aside). */
  open: boolean;
  /** This audio is the one playing. */
  playing: boolean;
  onOpen: () => void;
  onPlay: (on: boolean) => void;
}) {
  const still = useReducedMotion();
  if (asset.type.startsWith("image/")) {
    return (
      <button type="button" className="asset-preview asset-preview-image" onClick={onOpen} aria-label={`View ${label(asset)}`} aria-haspopup="dialog">
        {open ? (
          <span className="asset-preview-placeholder" aria-hidden="true" />
        ) : (
          <motion.img layoutId={still ? undefined : `media-${asset.src}`} transition={SPRING} src={asset.src} alt={asset.alt ?? ""} loading="lazy" />
        )}
      </button>
    );
  }
  if (asset.type.startsWith("audio/")) {
    return playing ? (
      <div className="asset-preview asset-preview-audio" data-playing="">
        <AudioFigure src={asset.src} title={label(asset)} autoPlay />
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
    <a className="asset-preview" href={asset.src} target="_blank" rel="noreferrer" aria-label={`Open ${label(asset)}`}>
      <VideoCamera size={22} aria-hidden="true" />
    </a>
  );
}

/** The full view: the picture over a dimmed page. Click, Escape or ✕ closes it. */
export function ImageLightbox({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const still = useReducedMotion();
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!asset) return;
    opener.current = document.activeElement;
    close.current?.focus({ preventScroll: true });
    // Capture phase, so Escape closes the picture before it can close the sheet behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [asset, onClose]);

  return (
    <AnimatePresence>
      {asset ? (
        <motion.div
          key="lightbox"
          className="media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={label(asset)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.img
            layoutId={still ? undefined : `media-${asset.src}`}
            transition={SPRING}
            className="media-lightbox-img"
            src={asset.src}
            alt={asset.alt ?? ""}
          />
          <div className="media-lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span className="media-lightbox-title">{label(asset)}</span>
            <a className="media-lightbox-action" href={asset.src} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={14} aria-hidden="true" /> Original
            </a>
            <button ref={close} type="button" className="media-lightbox-action" onClick={onClose} aria-label="Close preview">
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
