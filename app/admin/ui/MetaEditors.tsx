"use client";
import FontPicker from "./FontPicker";
import { beginPendingWork } from "./session";

import { ArrowCounterClockwise, Camera, Plus, Shuffle, Smiley, Trash, UserPlus } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";


import { DEFAULT_AUTHOR, type Author, type FontChoice, type Fonts } from "../../../cms/format";
import Avatar, { AVATAR_STYLES, parseGenerated, randomAvatar } from "../../components/writing/Avatar";
import { Avatars, joinNames, named } from "../../components/writing/Byline";
import { toast } from "../../lib/toast";
import { mediaName, newMediaId } from "../../../cms/media";
import { fontsOrNull } from "../../../cms/subtitle";
import { api, ApiError } from "./api";
import { onRadioKeys } from "./bits";
import { shareImage, squareImage, uploadInlineLogo } from "./media";
import { EmojiPicker, Fluent } from "./extensions/emoji";

/* ── Page icon ───────────────────────────────────────────────────────── */

/** Notion's page icon: a big emoji above the title, picked from Fluent 3D. */
export function IconPicker({ icon, onChange }: { icon: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    const finish = beginPendingWork();
    setBusy(true);
    try {
      onChange(await uploadInlineLogo(file));
      setOpen(false);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t add the icon", description: error instanceof Error ? error.message : undefined });
    } finally { finish(); setBusy(false); }
  };
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
            <div className="page-icon-upload">
              <button type="button" className="admin-chip" disabled={busy} onClick={() => fileInput.current?.click()}><Camera size={16} />{busy ? "Uploading…" : "Upload an icon"}</button>
              <small>SVG, PNG or WebP · fits a square</small>
              <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
            </div>
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

function AuthorRow({ author, onChange, onRemove }: { author: Author; onChange: (a: Author) => void; onRemove?: () => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    const finish = beginPendingWork();
    setBusy(true);
    try {
      const blob = await squareImage(file, AVATAR);
      const { src } = await api.uploadNamed(blob, mediaName(newMediaId(), { width: AVATAR, height: AVATAR }));
      onChange({ ...author, avatar: src });
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t use that photo", description: error instanceof ApiError ? error.message : undefined });
    } finally {
      finish();
      setBusy(false);
    }
  };
  return (
    <div className="author-row">
      <div className="author-photo-wrap">
        <button type="button" className="author-photo" onClick={() => pick.current?.click()} aria-label="Upload a photo" title="Upload a photo" data-busy={busy || undefined}>
          <Avatar author={author} size={44} className="author-photo-img" />
          <span className="author-photo-edit" aria-hidden="true">
            <Camera size={14} weight="bold" />
          </span>
        </button>
        <button
          type="button"
          className="author-shuffle"
          onClick={() => {
            const gen = parseGenerated(author.avatar);
            // Same style, new seed; a second click on a photo starts a generated one.
            onChange({ ...author, avatar: randomAvatar(gen?.style) });
          }}
          aria-label="Generate an avatar"
          title="Generate an avatar"
        >
          <Shuffle size={11} weight="bold" />
        </button>
      </div>
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
        <input value={author.name} onChange={(e) => onChange({ ...author, name: e.target.value })} placeholder="Name (optional)" aria-label="Author name" />
        {parseGenerated(author.avatar) ? (
          <div className="avatar-styles" onKeyDown={onRadioKeys} role="radiogroup" aria-label="Avatar style">
            {AVATAR_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={parseGenerated(author.avatar)?.style === style}
                tabIndex={parseGenerated(author.avatar)?.style === style ? 0 : -1}
                aria-label={style}
                title={style}
                className="avatar-style"
                onClick={() => onChange({ ...author, avatar: `gen:${style}:${parseGenerated(author.avatar)!.seed}` })}
              >
                <Avatar author={{ name: "", avatar: `gen:${style}:${parseGenerated(author.avatar)!.seed}` }} size={20} className="avatar-style-img" />
              </button>
            ))}
          </div>
        ) : null}
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
        <Avatars authors={authors} still />
        <span className="article-author">{named(authors).length ? joinNames(named(authors).map((a, i) => <span key={i}>{a.name}</span>)) : "Add authors"}</span>
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
              <button type="button" className="admin-chip" onClick={() => onChange([...authors, { name: "", avatar: randomAvatar() }])} disabled={authors.length >= 6}>
                <UserPlus size={13} /> Add co-author
              </button>
              {!isDefault ? (
                <button type="button" className="admin-chip" onClick={() => onChange([DEFAULT_AUTHOR])}>
                  <ArrowCounterClockwise size={13} /> Just me
                </button>
              ) : null}
            </div>
            <p className="field-help">Upload a photo (cropped square and resized for you) or shuffle a generated avatar. Name and email are optional; an email makes the name a mailto link.</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ── Fonts ───────────────────────────────────────────────────────────── */

export {loadFont} from "./font-loader";

function FontSelect({ label, value, onChange }: { label: string; value: FontChoice | null | undefined; onChange: (f: FontChoice | null) => void }) {
  return <FontPicker label={label} value={value?.family??""} onChange={onChange}/>;
}

export function FontsEditor({ fonts, onChange }: { fonts: Fonts | null; onChange: (f: Fonts | null) => void }) {
  const set = (patch: Fonts) => {
    const next = { ...(fonts ?? {}), ...patch };
    onChange(fontsOrNull(next));
  };
  return (
    <>
      <FontSelect label="Headings" value={fonts?.heading} onChange={(heading) => set({ heading })} />
      <FontSelect label="Body" value={fonts?.body} onChange={(body) => set({ body })} />
    </>
  );
}

/* ── Share image ─────────────────────────────────────────────────────── */

/**
 * What a link to the page shows when shared: its title, icon and available cover,
 * the cover by itself, or an image of your own,
 * cropped to 1200×630 in the browser.
 */
export function ShareImageField({ ogImage, hasCover, onChange }: { ogImage: string | null; hasCover: boolean; onChange: (v: string | null) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const mode = !ogImage ? "card" : ogImage === "cover" ? "cover" : "custom";
  const upload = async (file: File) => {
    const finish = beginPendingWork();
    setBusy(true);
    try {
      const blob = await shareImage(file);
      const { src } = await api.uploadNamed(blob, mediaName(newMediaId(), { width: 1200, height: 630 }, "jpg"));
      onChange(src);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t use that image", description: error instanceof ApiError ? error.message : undefined });
    } finally {
      finish();
      setBusy(false);
    }
  };
  return (
    <div className="share-choice" role="radiogroup" aria-label="Share image">
      <button type="button" role="radio" aria-checked={mode === "card"} className="share-option" onClick={() => onChange(null)}>
        <span className="share-option-title">Generated card</span>
        <span className="field-help">Title, icon and available cover, drawn for this page.</span>
      </button>
      <button type="button" role="radio" aria-checked={mode === "cover"} className="share-option" onClick={() => onChange("cover")} disabled={!hasCover}>
        <span className="share-option-title">Cover image</span>
        <span className="field-help">{hasCover ? "The full cover, fitted to 1200×630." : "Add a cover first."}</span>
      </button>
      <button type="button" role="radio" aria-checked={mode === "custom"} className="share-option" onClick={() => pick.current?.click()} disabled={busy}>
        <span className="share-option-title">{busy ? "Uploading…" : mode === "custom" ? "Custom image, click to replace" : "Upload an image"}</span>
        <span className="field-help">Cropped to 1200×630 for you.</span>
        {mode === "custom" && ogImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ogImage} alt="" className="share-option-img" />
        ) : null}
      </button>
      <input
        ref={pick}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
    </div>
  );
}
