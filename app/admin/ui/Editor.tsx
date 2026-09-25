"use client";

import { ArrowLeft, ClockCounterClockwise, ImageSquare, SlidersHorizontal, X } from "@phosphor-icons/react";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";

import { readingMinutes, slugify, type Cover } from "../../../cms/format";
import { toast } from "../../lib/toast";
import { altFromName, api, ApiError, prepareImage, type Draft } from "./api";
import { exactTime, StatusDot, statusLabel } from "./bits";
import { ImageBubble, TextBubble } from "./Bubble";
import DetailsSheet from "./DetailsSheet";
import PublishDialog from "./PublishDialog";
import RevisionsSheet from "./RevisionsSheet";
import SaveState, { type SaveStatus } from "./SaveState";
import { SlashCommand, slashItems, type SlashItem } from "./slash";

/*
 * The editor is the article page, editable. Title, standfirst, cover and body
 * use the published page's own classes (.article-title, .article-dek,
 * .article-body …), so what you see while writing is what goes live, down to
 * the measure and the figure breakouts. The chrome — top bar, word count —
 * steps back while you type and returns when the mouse moves.
 *
 * Saving is continuous: edits settle for 900ms, then go to R2. Nothing here
 * touches git until Publish.
 */

export type Meta = Pick<Draft, "title" | "slug" | "dek" | "tags" | "cover">;

const metaOf = (d: Draft): Meta => ({ title: d.title, slug: d.slug, dek: d.dek, tags: d.tags, cover: d.cover });

export default function EditorScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(id)
      .then(({ post }) => setDraft(post))
      .catch((error: unknown) => setFailed(error instanceof ApiError ? error.message : "Couldn’t open this post."));
  }, [id]);

  if (failed) {
    return (
      <main className="admin-gate">
        <p className="admin-gate-title">Can’t open this post</p>
        <p className="admin-gate-text">{failed}</p>
        <button type="button" className="admin-button" onClick={onBack}>
          Back to all writing
        </button>
      </main>
    );
  }
  return draft ? <Composer initial={draft} onBack={onBack} /> : <div className="admin-loading" aria-busy="true" />;
}

/**
 * A textarea as tall as its text. Remeasured when the text changes, when the
 * width does, and once Inter has loaded: measured against the fallback font,
 * a headline wraps differently and leaves a gap under itself.
 */
function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    let alive = true;
    void document.fonts?.ready.then(() => alive && fit());
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [value]);
  return ref;
}

async function uploadImage(file: File) {
  const { blob, width, height } = await prepareImage(file);
  const res = await api.upload(blob, width, height);
  return { src: res.src, width, height };
}

/* The slash menu's Image item opens the body file picker, found by id so the
   item list can be built once, outside the component. */
const BODY_PICK = "editor-body-pick";
const SLASH_ITEMS: SlashItem[] = slashItems(() => document.getElementById(BODY_PICK)?.click());

const imageFiles = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

function Composer({ initial, onBack }: { initial: Draft; onBack: () => void }) {
  const [doc, setDoc] = useState<Draft>(initial);
  const [meta, setMeta] = useState<Meta>(() => metaOf(initial));
  const [slugTouched, setSlugTouched] = useState(() => Boolean(initial.slug) && initial.slug !== slugify(initial.title));
  const [save, setSave] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [panel, setPanel] = useState<null | "details" | "revisions" | "publish">(null);
  const [linkRequest, setLinkRequest] = useState(0);
  const [words, setWords] = useState(0);
  const [typing, setTyping] = useState(false);

  const server = useRef(initial);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);
  const queued = useRef(false);
  const saveRef = useRef<(snapshot?: boolean) => Promise<boolean>>(async () => true);
  const bodyPick = useRef<HTMLInputElement>(null);
  const coverPick = useRef<HTMLInputElement>(null);

  const insertImages = useRef<(files: File[], pos?: number) => Promise<void>>(async () => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Write, or press / for blocks"),
      }),
      Markdown,
      SlashCommand(() => SLASH_ITEMS),
      Extension.create({
        name: "adminKeys",
        addKeyboardShortcuts: () => ({
          "Mod-k": () => {
            setLinkRequest((n) => n + 1);
            return true;
          },
        }),
      }),
    ],
    content: initial.body,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "article-body editor-body", "aria-label": "Body", "data-cursor": "text" },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        void insertImages.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer?.files);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages.current(files, pos);
        return true;
      },
      handleKeyDown: () => {
        setTyping(true);
        return false;
      },
    },
    onCreate: ({ editor: e }) => setWords(countWords(e.getText())),
    onUpdate: ({ editor: e }) => {
      setWords(countWords(e.getText()));
      scheduleSave();
    },
  });

  useEffect(() => {
    insertImages.current = async (files, pos) => {
    if (!editor) return;
    for (const file of files) {
      try {
        const up = await toast.promise(uploadImage(file), {
          loading: "Uploading image…",
          success: "Image added",
          error: (e: unknown) => (e instanceof Error ? e.message : "Upload failed"),
        });
        editor
          .chain()
          .focus()
          .insertContentAt(pos ?? editor.state.selection.to, { type: "image", attrs: { src: up.src, alt: altFromName(file.name), title: "" } })
          .run();
      } catch {
        /* the toast said why */
      }
    }
    };
  }, [editor]);

  /* ── Saving ─────────────────────────────────────────────────────────── */

  const payload = useCallback(() => ({ ...metaRef.current, body: editor?.getMarkdown() ?? server.current.body }), [editor]);

  const flush = useCallback(
    async (snapshot = false): Promise<boolean> => {
      window.clearTimeout(timer.current);
      if (inflight.current) {
        queued.current = true;
        await inflight.current;
        if (!snapshot) return true;
      }
      const sent = payload();
      setSave("saving");
      const run = api
        .save(server.current.id, { ...sent, base: server.current.updatedAt, snapshot })
        .then(({ post, snapshotted }) => {
          server.current = post;
          setDoc(post);
          setSavedAt(post.updatedAt);
          setSave(JSON.stringify(payload()) === JSON.stringify(sent) ? "saved" : "unsaved");
          if (snapshot && snapshotted) toast.add({ type: "success", title: "Revision saved", timeout: 1800 });
          return true;
        })
        .catch((error: unknown) => {
          const e = error instanceof ApiError ? error : new ApiError("Couldn’t save.", 500);
          if (e.status === 0) {
            setSave("offline");
            timer.current = window.setTimeout(() => void saveRef.current(), 5000);
          } else if (e.status === 409) {
            setSave("error");
            toast.add({
              id: "save-conflict",
              type: "warning",
              title: "Edited in another tab",
              description: "Reload to get that version. Your text here isn’t saved.",
              timeout: 0,
              actionProps: { children: "Reload", onClick: () => window.location.reload() },
            });
          } else {
            setSave("error");
            toast.add({ id: "save-error", type: "error", title: "Couldn’t save", description: e.message });
          }
          return false;
        })
        .finally(() => {
          inflight.current = null;
          if (queued.current) {
            queued.current = false;
            void saveRef.current();
          }
        });
      inflight.current = run;
      return run;
    },
    [payload]
  );
  useEffect(() => {
    saveRef.current = flush;
  }, [flush]);

  function scheduleSave() {
    setSave((s) => (s === "offline" || s === "error" ? s : "unsaved"));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), 900);
  }

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scheduleSave();
  }, [meta]);

  // Leaving with unsaved words asks first.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (save !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [save]);

  /* ── Keys and focus mode ────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush(true);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPanel("publish");
      } else if (mod && e.key === ".") {
        e.preventDefault();
        setPanel((p) => (p === "details" ? null : "details"));
      }
    };
    const wake = () => setTyping(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", wake, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", wake);
    };
  }, [flush]);

  /* ── Fields ─────────────────────────────────────────────────────────── */

  const setTitle = (title: string) =>
    setMeta((m) => ({ ...m, title, slug: !doc.liveSlug && !slugTouched ? slugify(title) : m.slug }));

  const titleRef = useAutosize(meta.title);
  const dekRef = useAutosize(meta.dek);

  const setCover = async (file: File) => {
    try {
      const up = await toast.promise(uploadImage(file), {
        loading: "Uploading cover…",
        success: "Cover added",
        error: (e: unknown) => (e instanceof Error ? e.message : "Upload failed"),
      });
      setMeta((m) => ({ ...m, cover: { src: up.src, width: up.width, height: up.height, alt: m.cover?.alt || altFromName(file.name), caption: m.cover?.caption ?? "" } }));
    } catch {
      /* the toast said why */
    }
  };
  const patchCover = (patch: Partial<Cover>) => setMeta((m) => (m.cover ? { ...m, cover: { ...m.cover, ...patch } } : m));

  const back = async () => {
    if (save !== "saved") await flush();
    onBack();
  };

  const minutes = readingMinutes(editor?.getText() ?? "");
  const live = doc.liveSlug !== null;
  const publishLabel = doc.status === "scheduled" ? "Scheduled" : live ? (doc.dirty ? "Publish changes" : "Published") : "Publish";

  return (
    <div className="editor-root" data-typing={typing || undefined}>
      <header className="editor-bar">
        <div className="editor-bar-side">
          <button type="button" className="admin-icon-button" onClick={back} aria-label="All writing" title="All writing">
            <ArrowLeft size={16} weight="bold" />
          </button>
          <span className="editor-status">
            <StatusDot status={doc.status} dirty={doc.dirty} />
            {statusLabel(doc)}
          </span>
          <SaveState status={save} at={savedAt} />
        </div>
        <div className="editor-bar-side">
          <button type="button" className="admin-icon-button" aria-label="Revisions" title="Revisions" onClick={() => setPanel("revisions")}>
            <ClockCounterClockwise size={16} weight="bold" />
          </button>
          <button type="button" className="admin-icon-button" aria-label="Details" title="Details  ⌘." onClick={() => setPanel("details")}>
            <SlidersHorizontal size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="admin-button admin-button-primary"
            data-keycap
            onClick={() => setPanel("publish")}
            data-done={live && !doc.dirty ? "" : undefined}
          >
            {publishLabel}
          </button>
        </div>
      </header>

      <main className="page-shell editor-canvas article-shell w-full max-w-[672px]">
        <article className="article">
          <header className="article-header">
            <p className="article-eyebrow">
              {meta.tags[0] ? <span className="article-tag">{meta.tags[0]}</span> : null}
              <span>
                {doc.status === "scheduled" && doc.publishAt
                  ? `Goes live ${exactTime(doc.publishAt)}`
                  : doc.publishedAt
                    ? exactTime(doc.publishedAt)
                    : "Not published"}
              </span>
            </p>
            <textarea
              ref={titleRef}
              className="article-title editor-field"
              value={meta.title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  dekRef.current?.focus();
                }
              }}
              placeholder="Title"
              rows={1}
              aria-label="Title"
              autoFocus={!initial.title}
            />
            <textarea
              ref={dekRef}
              className="article-dek editor-field"
              value={meta.dek}
              onChange={(e) => setMeta((m) => ({ ...m, dek: e.target.value.replace(/\n/g, " ") }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              placeholder="A sentence or two that says why it’s worth reading"
              rows={1}
              aria-label="Standfirst"
            />
          </header>

          {meta.cover ? (
            <figure className="article-cover editor-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.cover.src} alt={meta.cover.alt} width={meta.cover.width} height={meta.cover.height} />
              <div className="editor-cover-actions">
                <button type="button" className="admin-chip" onClick={() => coverPick.current?.click()}>
                  Replace
                </button>
                <button type="button" className="admin-chip" onClick={() => setMeta((m) => ({ ...m, cover: null }))} aria-label="Remove cover">
                  <X size={12} weight="bold" />
                </button>
              </div>
              <input
                className="editor-caption"
                value={meta.cover.caption ?? ""}
                onChange={(e) => patchCover({ caption: e.target.value })}
                placeholder="Caption (optional)"
                aria-label="Cover caption"
              />
              <input
                className="editor-alt"
                value={meta.cover.alt}
                onChange={(e) => patchCover({ alt: e.target.value })}
                placeholder="Alt text: what the image shows"
                aria-label="Cover alt text"
                data-missing={!meta.cover.alt.trim() || undefined}
              />
            </figure>
          ) : (
            <button
              type="button"
              className="editor-cover-empty"
              onClick={() => coverPick.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = imageFiles(e.dataTransfer.files)[0];
                if (file) void setCover(file);
              }}
            >
              <ImageSquare size={16} aria-hidden="true" />
              Add a cover image
            </button>
          )}

          {editor ? (
            <>
              <EditorContent editor={editor} />
              <TextBubble editor={editor} linkRequest={linkRequest} />
              <ImageBubble editor={editor} />
            </>
          ) : null}
        </article>
      </main>

      <footer className="editor-foot">
        <span>
          {words.toLocaleString()} {words === 1 ? "word" : "words"} · {minutes} min read
        </span>
        <span className="editor-foot-keys">
          <kbd className="admin-kbd">/</kbd> blocks <kbd className="admin-kbd">⌘S</kbd> revision <kbd className="admin-kbd">⌘⇧P</kbd> publish
        </span>
      </footer>

      <input
        ref={bodyPick}
        id={BODY_PICK}
        type="file"
        accept="image/webp,image/png,image/jpeg,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => {
          const files = imageFiles(e.target.files);
          e.target.value = "";
          void insertImages.current(files);
        }}
      />
      <input
        ref={coverPick}
        type="file"
        accept="image/webp,image/png,image/jpeg,image/gif,image/avif"
        hidden
        onChange={(e) => {
          const file = imageFiles(e.target.files)[0];
          e.target.value = "";
          if (file) void setCover(file);
        }}
      />

      <DetailsSheet
        open={panel === "details"}
        onClose={() => setPanel(null)}
        meta={meta}
        doc={doc}
        onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
        onSlugEdited={() => setSlugTouched(true)}
        onPickCover={() => coverPick.current?.click()}
        onDeleted={onBack}
      />
      <RevisionsSheet
        open={panel === "revisions"}
        onClose={() => setPanel(null)}
        id={doc.id}
        onRestored={() => window.location.reload()}
      />
      <PublishDialog
        open={panel === "publish"}
        onClose={() => setPanel(null)}
        doc={doc}
        meta={meta}
        body={editor?.getMarkdown() ?? ""}
        beforePublish={() => flush()}
        onDone={(post) => {
          server.current = post;
          setDoc(post);
          setSavedAt(post.updatedAt);
          setSave("saved");
        }}
        onSlugChange={(slug) => {
          setSlugTouched(true);
          setMeta((m) => ({ ...m, slug }));
        }}
      />
    </div>
  );
}

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;
}
