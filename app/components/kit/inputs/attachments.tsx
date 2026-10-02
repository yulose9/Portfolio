"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import {
  FilePdf,
  FileText,
  FileZip,
  FilmStrip,
  Globe,
  Image as ImageIcon,
  MusicNotes,
  Paperclip,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { formatBytes } from "./magnetic-dropzone";

/*
 * Files and media as chips (shadcn.io's attachments): an icon for the kind,
 * or the picture itself when there is one, the name, the size, and a remove
 * button. Hover or focus a chip and a larger preview opens: the image, the
 * video's first frame, or the details when there is nothing to show.
 *
 * Removing animates the chip out and the rest close the gap. Focus goes to
 * the neighbour (or wherever `onEmpty` says when the last one goes), never
 * to the top of the page. Delete or Backspace on a focused chip removes it.
 */

export type AttachmentKind = "image" | "video" | "audio" | "pdf" | "document" | "archive" | "link" | "file";

export type AttachmentItem = {
  id: string;
  name: string;
  /** Preview source; for images and videos it's also the thumbnail. */
  url?: string;
  mediaType?: string;
  size?: number;
  kind?: AttachmentKind;
  /** Anything else for the preview card: dimensions, "Used in 3 pages". */
  detail?: ReactNode;
};

export function attachmentKind(item: AttachmentItem): AttachmentKind {
  if (item.kind) return item.kind;
  const t = item.mediaType ?? "";
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  if (t.startsWith("image/") || /^(png|jpe?g|gif|webp|avif|svg|heic)$/.test(ext)) return "image";
  if (t.startsWith("video/") || /^(mp4|mov|webm|m4v)$/.test(ext)) return "video";
  if (t.startsWith("audio/") || /^(mp3|wav|m4a|ogg|flac)$/.test(ext)) return "audio";
  if (t === "application/pdf" || ext === "pdf") return "pdf";
  if (/zip|x-tar|gzip|7z/.test(t) || /^(zip|gz|tgz|tar|7z|rar)$/.test(ext)) return "archive";
  if (t.startsWith("text/") || /^(md|txt|docx?|rtf|odt|pages)$/.test(ext)) return "document";
  return "file";
}

const ICONS: Record<AttachmentKind, Icon> = {
  image: ImageIcon,
  video: FilmStrip,
  audio: MusicNotes,
  pdf: FilePdf,
  document: FileText,
  archive: FileZip,
  link: Globe,
  file: Paperclip,
};

const KIND_NAME: Record<AttachmentKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  document: "Document",
  archive: "Archive",
  link: "Link",
  file: "File",
};

function Thumb({ item, kind, large }: { item: AttachmentItem; kind: AttachmentKind; large?: boolean }) {
  const Glyph = ICONS[kind];
  if (kind === "image" && item.url) {
    // eslint-disable-next-line @next/next/no-img-element -- blob: and upload URLs, which next/image can't optimise
    return <img src={item.url} alt="" className={large ? "ki-attachment-preview-media" : "ki-attachment-thumb"} loading="lazy" decoding="async" />;
  }
  if (kind === "video" && item.url && large) {
    return <video src={item.url} className="ki-attachment-preview-media" muted playsInline preload="metadata" />;
  }
  return (
    <span className={large ? "ki-attachment-preview-icon" : "ki-attachment-thumb ki-attachment-thumb-icon"}>
      <Glyph size={large ? 28 : 14} />
    </span>
  );
}

export type AttachmentsProps = {
  items: readonly AttachmentItem[];
  onRemove?: (item: AttachmentItem) => void;
  /** Click or Enter on a chip. */
  onOpen?: (item: AttachmentItem) => void;
  /** Where focus goes once the last chip is removed. */
  onEmpty?: () => void;
  variant?: "inline" | "list";
  /** The list's accessible name, e.g. "Attached media". */
  label?: string;
  /** Preview on hover/focus. */
  preview?: boolean;
  className?: string;
};

export function Attachments({
  items,
  onRemove,
  onOpen,
  onEmpty,
  variant = "inline",
  label = "Attachments",
  preview = true,
  className,
}: AttachmentsProps) {
  const still = useReducedMotion();
  const chips = useRef(new Map<string, HTMLElement>());

  const remove = (item: AttachmentItem) => {
    if (!onRemove) return;
    const i = items.findIndex((x) => x.id === item.id);
    const neighbour = items[i + 1] ?? items[i - 1];
    onRemove(item);
    requestAnimationFrame(() => {
      if (neighbour) chips.current.get(neighbour.id)?.focus();
      else onEmpty?.();
    });
  };

  const onKeys = (e: KeyboardEvent<HTMLElement>, item: AttachmentItem) => {
    if ((e.key === "Delete" || e.key === "Backspace") && onRemove) {
      e.preventDefault();
      remove(item);
    }
  };

  return (
    <ul aria-label={label} data-slot="attachments" data-variant={variant} className={cn("ki-attachments", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => {
          const kind = attachmentKind(item);
          const meta = [KIND_NAME[kind], item.size != null ? formatBytes(item.size) : null].filter(Boolean).join(" · ");
          const chip = (
            <button
              type="button"
              data-slot="attachment-item"
              className="ki-attachment-main"
              ref={(el) => {
                if (el) chips.current.set(item.id, el);
                else chips.current.delete(item.id);
              }}
              aria-label={`${item.name}, ${meta}`}
              aria-keyshortcuts={onRemove ? "Delete" : undefined}
              onClick={() => onOpen?.(item)}
              onKeyDown={(e) => onKeys(e, item)}
            >
              <Thumb item={item} kind={kind} />
              <span className="ki-attachment-text">
                <span className="ki-attachment-name">{item.name}</span>
                {variant === "list" ? <span className="ki-attachment-meta">{meta}</span> : null}
              </span>
            </button>
          );
          return (
            <motion.li
              key={item.id}
              layout={!still}
              initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(2px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(2px)" }}
              transition={{ duration: still ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="ki-attachment"
              data-kind={kind}
            >
              {preview ? (
                <PreviewCard.Root>
                  <PreviewCard.Trigger delay={250} closeDelay={100} render={chip} />
                  <PreviewCard.Portal>
                    <PreviewCard.Positioner side="top" sideOffset={8} collisionPadding={12} className="ki-positioner">
                      <PreviewCard.Popup className="ki-popup ki-attachment-preview">
                        <Thumb item={item} kind={kind} large />
                        <p className="ki-attachment-preview-name">{item.name}</p>
                        <p className="ki-attachment-meta">{meta}</p>
                        {item.detail ? <div className="ki-attachment-meta">{item.detail}</div> : null}
                      </PreviewCard.Popup>
                    </PreviewCard.Positioner>
                  </PreviewCard.Portal>
                </PreviewCard.Root>
              ) : (
                chip
              )}
              {onRemove ? (
                <button
                  type="button"
                  data-slot="attachment-remove"
                  className="ki-attachment-remove"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item)}
                >
                  <X size={11} weight="bold" aria-hidden="true" />
                </button>
              ) : null}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export default Attachments;
