"use client";

import { ArrowCounterClockwise, Camera, Plus, Smiley, Trash, UserPlus } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";

import { FONT_SHELF, fontHref, fontStack } from "../../../cms/fonts";
import { DEFAULT_AUTHOR, type Author, type FontChoice, type Fonts } from "../../../cms/format";
import { Avatars, joinNames } from "../../components/writing/Byline";
import { toast } from "../../lib/toast";
import { api, ApiError } from "./api";
import { EmojiPicker, Fluent } from "./extensions/emoji";

/* ── Page icon ───────────────────────────────────────────────────────── */

/** Notion's page icon: a big emoji above the title, picked from Fluent 3D. */
export function IconPicker({ icon, onChange }: { icon: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={icon ? "page-icon" : "admin-chip page-icon-add"} aria-label={icon ? "Change icon" : "Add icon"}>
        {icon ? (
          <Fluent emoji={icon} size={72} />
        ) : (
          <>
            <Smiley size={14} aria-hidden="true" /> Add icon
          </>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="menu-positioner">
          <Popover.Popup className="menu-popup admin-popover">
            <EmojiPicker
              onPick={(e) => {
                onChange(e);
                setOpen(false);
              }}
              onRemove={
                icon
                  ? () => {
                      onChange(null);
                      setOpen(false);
                    }
                  : undefined
              }
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ── Authors ─────────────────────────────────────────────────────────── */

const AVATAR = 256;

/** Centre-crop to a square and resize, so any photo becomes a tidy avatar. */
async function squareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR;
  canvas.height = AVATAR;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ApiError("This browser can't process images.", 0);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR, AVATAR);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (blob && blob.type === "image/webp") return blob;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!jpeg) throw new ApiError("Couldn't process that image.", 0);
  return jpeg;
}

function AuthorRow({ author, onChange, onRemove }: { author: Author; onChange: (a: Author) => void; onRemove?: () => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const blob = await squareAvatar(file);
      const { src } = await api.upload(blob, AVATAR, AVATAR);
      onChange({ ...author, avatar: src });
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t use that photo", description: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="author-row">
      <button type="button" className="author-photo" onClick={() => pick.current?.click()} aria-label="Change photo" data-busy={busy || undefined}>
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar} alt="" />
        ) : (
          <span>{author.name.trim().charAt(0).toUpperCase() || "?"}</span>
        )}
        <span className="author-photo-edit" aria-hidden="true">
          <Camera size={14} weight="bold" />
        </span>
      </button>
      <input
        ref={pick}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
      <div className="author-fields">
        <input value={author.name} onChange={(e) => onChange({ ...author, name: e.target.value })} placeholder="Name" aria-label="Author name" />
        <input
          value={author.email ?? ""}
          onChange={(e) => onChange({ ...author, email: e.target.value || undefined })}
          placeholder="Email (optional)"
          type="email"
          inputMode="email"
          aria-label="Author email"
        />
      </div>
      {onRemove ? (
        <button type="button" className="admin-icon-button" onClick={onRemove} aria-label={`Remove ${author.name || "author"}`}>
          <Trash size={14} />
        </button>
      ) : null}
    </div>
  );
}

/** The byline under the standfirst, editable in place. Me by default. */
export function AuthorsEditor({ authors, minutes, onChange }: { authors: Author[]; minutes: number; onChange: (a: Author[]) => void }) {
  const set = (i: number, a: Author) => onChange(authors.map((x, j) => (j === i ? a : x)));
  const isDefault = authors.length === 1 && authors[0].name === DEFAULT_AUTHOR.name && authors[0].avatar === DEFAULT_AUTHOR.avatar;
  return (
    <Popover.Root>
      <Popover.Trigger className="article-byline byline-trigger" aria-label="Edit authors">
        <Avatars authors={authors} />
        <span className="article-author">{joinNames(authors.map((a, i) => <span key={i}>{a.name || "Unnamed"}</span>))}</span>
        <span aria-hidden="true">·</span>
        <span>{minutes} min read</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="menu-positioner">
          <Popover.Popup className="menu-popup admin-popover authors-popover">
            <p className="popover-title">Authors</p>
            {authors.map((a, i) => (
              <AuthorRow key={i} author={a} onChange={(next) => set(i, next)} onRemove={authors.length > 1 ? () => onChange(authors.filter((_, j) => j !== i)) : undefined} />
            ))}
            <div className="popover-actions">
              <button type="button" className="admin-chip" onClick={() => onChange([...authors, { name: "" }])} disabled={authors.length >= 6}>
                <UserPlus size={13} /> Add co-author
              </button>
              {!isDefault ? (
                <button type="button" className="admin-chip" onClick={() => onChange([DEFAULT_AUTHOR])}>
                  <ArrowCounterClockwise size={13} /> Just me
                </button>
              ) : null}
            </div>
            <p className="field-help">Photos are cropped square and resized for you. The email makes the name a mailto link.</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ── Fonts ───────────────────────────────────────────────────────────── */

/** Load a font's stylesheet into the admin once, so the picker and canvas can show it. */
export function loadFont(font: FontChoice | null | undefined) {
  const href = font ? fontHref(font) : null;
  if (href && !document.querySelector(`link[data-font="${CSS.escape(href)}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.font = href;
    document.head.appendChild(link);
  }
}

function FontSelect({ label, value, onChange }: { label: string; value: FontChoice | null | undefined; onChange: (f: FontChoice | null) => void }) {
  const [custom, setCustom] = useState("");
  // The shelf previews each face in itself, so its stylesheets load with it.
  useEffect(() => FONT_SHELF.forEach(loadFont), []);
  useEffect(() => loadFont(value), [value]);
  const current = value?.family ?? "Inter";
  return (
    <div className="font-select">
      <span className="field-label">{label}</span>
      <div className="font-shelf" role="radiogroup" aria-label={label}>
        {FONT_SHELF.map((f) => (
          <button
            key={f.family}
            type="button"
            role="radio"
            aria-checked={current === f.family}
            className="font-option"
            onClick={() => onChange(f.family === "Inter" ? null : { family: f.family, source: f.source })}
            style={{ fontFamily: fontStack(f) }}
          >
            <span className="font-option-name">{f.family}</span>
            <span className="font-option-note">{f.note}</span>
          </button>
        ))}
      </div>
      <form
        className="font-custom"
        onSubmit={(e) => {
          e.preventDefault();
          const family = custom.trim();
          if (!/^[\w \-]{2,60}$/.test(family)) return;
          onChange({ family, source: "google" });
          setCustom("");
        }}
      >
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Any Google Fonts family, e.g. Crimson Pro" aria-label={`Custom ${label.toLowerCase()} font`} />
        <button type="submit" className="admin-chip" aria-label="Use this font">
          <Plus size={13} /> Use
        </button>
      </form>
      {value && !FONT_SHELF.some((f) => f.family === value.family) ? <p className="field-help">Using {value.family} from Google Fonts.</p> : null}
    </div>
  );
}

export function FontsEditor({ fonts, onChange }: { fonts: Fonts | null; onChange: (f: Fonts | null) => void }) {
  const set = (patch: Fonts) => {
    const next = { ...(fonts ?? {}), ...patch };
    onChange(next.heading || next.body ? next : null);
  };
  return (
    <>
      <FontSelect label="Headings" value={fonts?.heading} onChange={(heading) => set({ heading })} />
      <FontSelect label="Body" value={fonts?.body} onChange={(body) => set({ body })} />
    </>
  );
}
