"use client";

import { ArrowsDownUp, ImageSquare, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from "react";

import type { Cover } from "../../../cms/format";
import {
  MAX_COVER_ZOOM, coverImageStyle, coverPosition, coverStyle, coverZoom, withCoverPosition, withCoverStyle, withCoverZoom, type CoverStyle,
} from "../../../cms/cover";
import { Slider } from "../../components/kit/slider";
import { AltAssist } from "./AltAssist";
import MediaPicker, { COVER_SWATCHES, type MediaPick } from "./MediaPicker";

/**
 * The cover's picker (Gallery, Upload, Link), opened by `trigger`: "Change
 * cover" on the cover, "Add cover" above the title. Remove only when there's
 * a cover to remove.
 */
export function CoverPicker({
  trigger,
  onPick,
  onRemove,
  onBrowseAll,
}: {
  trigger: ReactElement;
  onPick: (pick: MediaPick) => void;
  onRemove?: () => void;
  onBrowseAll?: () => void;
}) {
  return (
    <MediaPicker accept="image" title="Cover image" trigger={trigger} swatches={COVER_SWATCHES} onPick={onPick} onRemove={onRemove} onBrowseAll={onBrowseAll} />
  );
}

/*
 * The cover's hover tools, and the banner style's own view. Classic is the
 * picture on the text's column (drawn by Editor.tsx, as it always was);
 * banner spans the whole editor pane, the page icon overlapping its edge, as
 * the published page draws it (app/(site)/writing/[slug]/page.tsx).
 */

const STYLES: { value: CoverStyle; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "banner", label: "Banner" },
];

export function CoverActions({
  cover,
  onChange,
  onPick,
  onBrowseAll,
  onReposition,
}: {
  cover: Cover;
  onChange: (cover: Cover | null) => void;
  onPick: (pick: MediaPick) => void;
  onBrowseAll?: () => void;
  /** Only the banner crops its picture, so only it offers this. */
  onReposition?: () => void;
}) {
  const style = coverStyle(cover);
  return (
    <div className="editor-cover-actions">
      <CoverPicker
        trigger={
          <button type="button" className="admin-chip">
            <ImageSquare size={13} aria-hidden="true" /> Change cover
          </button>
        }
        onPick={onPick}
        onRemove={() => onChange(null)}
        onBrowseAll={onBrowseAll}
      />
      {onReposition ? (
        <button type="button" className="admin-chip" onClick={onReposition}>
          <ArrowsDownUp size={13} aria-hidden="true" /> Reposition and zoom
        </button>
      ) : null}
      <div className="cover-style" role="radiogroup" aria-label="Cover style">
        {STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={style === s.value}
            className="cover-style-option"
            onClick={() => onChange(withCoverStyle(cover, s.value))}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
              e.preventDefault();
              const next = STYLES.find((o) => o.value !== s.value)!;
              onChange(withCoverStyle(cover, next.value));
              const group = e.currentTarget.parentElement;
              requestAnimationFrame(() => group?.querySelector<HTMLButtonElement>(`[aria-checked="true"]`)?.focus());
            }}
            tabIndex={style === s.value ? 0 : -1}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button type="button" className="admin-chip" onClick={() => onChange(null)} aria-label="Remove cover">
        <X size={12} weight="bold" />
      </button>
    </div>
  );
}

/**
 * The banner: edge to edge of the pane, its tools and alt text on hover.
 * "Reposition" works as Notion's does: drag the picture (or press the
 * arrow keys) to choose which band of it the banner shows, then save.
 */
export function EditorBanner({
  cover,
  onChange,
  onPick,
  onBrowseAll,
}: {
  cover: Cover;
  onChange: (cover: Cover | null) => void;
  onPick: (pick: MediaPick) => void;
  onBrowseAll?: () => void;
}) {
  const [moving, setMoving] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const frame = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ y: number; from: number } | null>(null);
  const position = moving ?? coverPosition(cover);

  // How far, in pixels, the picture overflows the banner vertically.
  const overflow = () => {
    const f = frame.current, i = img.current;
    if (!f || !i || !i.naturalWidth) return 0;
    const shown = ((f.clientWidth * i.naturalHeight) / i.naturalWidth) * zoom;
    return Math.max(0, shown - f.clientHeight);
  };
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const save = () => {
    if (moving !== null) onChange(withCoverZoom(withCoverPosition(cover, moving), zoom));
    setMoving(null);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (moving === null || e.button !== 0 || (e.target as Element).closest("button, input, .editor-banner-zoom")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, from: moving };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const room = overflow();
    // Dragging down reveals more of the top: the position moves toward 0.
    if (room) setMoving(clamp(drag.current.from - ((e.clientY - drag.current.y) / room) * 100));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (moving === null) return;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowUp") setMoving(clamp(moving + step));
    else if (e.key === "ArrowDown") setMoving(clamp(moving - step));
    else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(MAX_COVER_ZOOM, z + 0.1));
    else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.1));
    else if (e.key === "Enter") save();
    else if (e.key === "Escape") setMoving(null);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <figure
      ref={frame}
      className="article-banner editor-cover editor-banner"
      data-repositioning={moving !== null || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} draggable={false}
        style={moving === null ? coverImageStyle(cover) : coverImageStyle(cover, position, zoom)} />
      {moving !== null ? (
        <>
          <p className="editor-banner-hint" aria-live="polite">Drag to reposition · ↑ ↓ to move, + − to zoom</p>
          <div className="editor-cover-actions editor-banner-confirm">
            <div className="editor-banner-zoom">
              <button type="button" className="editor-banner-zoom-step" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))}>
                <MagnifyingGlassMinus size={14} aria-hidden="true" />
              </button>
              <Slider aria-label="Zoom" min={1} max={MAX_COVER_ZOOM} step={0.01} value={zoom} onValueChange={(v) => setZoom(v)} />
              <button type="button" className="editor-banner-zoom-step" aria-label="Zoom in" disabled={zoom >= MAX_COVER_ZOOM} onClick={() => setZoom((z) => Math.min(MAX_COVER_ZOOM, Math.round((z + 0.25) * 100) / 100))}>
                <MagnifyingGlassPlus size={14} aria-hidden="true" />
              </button>
              <output className="editor-banner-zoom-value">{Math.round(zoom * 100)}%</output>
            </div>
            <button type="button" className="admin-chip" onClick={() => setMoving(null)}>
              Cancel
            </button>
            <button type="button" className="admin-chip admin-chip-primary" onClick={save} autoFocus>
              Save position
            </button>
          </div>
        </>
      ) : (
        <>
          <CoverActions cover={cover} onChange={onChange} onPick={onPick} onBrowseAll={onBrowseAll} onReposition={() => {
              setZoom(coverZoom(cover));
              setMoving(coverPosition(cover));
            }} />
          <div className="editor-banner-alt-row">
            <input
              className="editor-banner-alt"
              value={cover.alt}
              onChange={(e) => onChange({ ...cover, alt: e.target.value })}
              placeholder="Alt text: what the image shows"
              aria-label="Cover alt text"
              data-missing={!cover.alt.trim() || undefined}
            />
            <AltAssist className="alt-assist-banner" src={cover.src} value={cover.alt} onAlt={(alt) => onChange({ ...cover, alt })}
              context={() => ({ caption: cover.caption })} />
          </div>
        </>
      )}
    </figure>
  );
}
