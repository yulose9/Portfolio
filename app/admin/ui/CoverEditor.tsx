"use client";

import { ImageSquare, X } from "@phosphor-icons/react";

import type { Cover } from "../../../cms/format";
import { coverStyle, withCoverStyle, type CoverStyle } from "../../../cms/cover";

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
}: {
  cover: Cover;
  onChange: (cover: Cover | null) => void;
  onPick: () => void;
}) {
  const style = coverStyle(cover);
  return (
    <div className="editor-cover-actions">
      <button type="button" className="admin-chip" onClick={onPick}>
        <ImageSquare size={13} aria-hidden="true" /> Change cover
      </button>
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

/** The banner: edge to edge of the pane, its tools and alt text on hover. */
export function EditorBanner({
  cover,
  onChange,
  onPick,
}: {
  cover: Cover;
  onChange: (cover: Cover | null) => void;
  onPick: () => void;
}) {
  return (
    <figure className="article-banner editor-cover editor-banner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} />
      <CoverActions cover={cover} onChange={onChange} onPick={onPick} />
      <input
        className="editor-banner-alt"
        value={cover.alt}
        onChange={(e) => onChange({ ...cover, alt: e.target.value })}
        placeholder="Alt text: what the image shows"
        aria-label="Cover alt text"
        data-missing={!cover.alt.trim() || undefined}
      />
    </figure>
  );
}
