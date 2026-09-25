"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsInLineVertical,
  ArrowUUpLeft,
  ArrowUUpRight,
  BookOpenText,
  CalendarBlank,
  Check,
  ClockCounterClockwise,
  CopySimple,
  CursorText,
  Eye,
  FloppyDisk,
  ImageSquare,
  LinkSimple,
  MagnifyingGlass,
  MarkdownLogo,
  PaperPlaneTilt,
  PencilSimple,
  PushPin,
  SelectionPlus,
  SlidersHorizontal,
  Swap,
  TextAlignCenter,
  TextColumns,
  TextOutdent,
  Textbox,
  Trash,
  X,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { Extension } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";

import { fontVars } from "../../../cms/fonts";
import { draftToPost, readingMinutes, serializePost, slugify, type Cover } from "../../../cms/format";
import { copy } from "../../components/menu/actions";
import { useFinePointer } from "../../components/menu/useFinePointer";
import { toast } from "../../lib/toast";
import { altFromName, api, ApiError, type Draft } from "./api";
import { exactTime, StatusDot, statusLabel } from "./bits";
import { ImageBubble, TextBubble } from "./Bubble";
import { BLOCKS, currentBlock, duplicateBlock, inserts, moveBlock, selectBlock, turnInto } from "./commands";
import DateTimePicker from "./DateTimePicker";
import { useCommands, type Command } from "./registry";
import DetailsSheet from "./DetailsSheet";
import { BlockHandle, EditorContextMenu, FindBar, MobileToolbar } from "./EditorChrome";
import { Callout, CurrentBlock, DetailsContent, DetailsSummary, Find, FluentEmoji, Toggle } from "./extensions/blocks";
import { EmojiPicker, EmojiSuggest } from "./extensions/emoji";
import { announceSave, usePulse, type Pulse } from "./live";
import { keys, MenuSurface, MItem, MLabel } from "./menu";
import { Outline } from "./Outline";
import { Embed } from "./extensions/EmbedView";
import { Media } from "./extensions/MediaView";
import { kindOf, uploadAudio, uploadMedia, type Uploaded } from "./media";
import { cleanPastedHtml, htmlIsWrappedMarkdown, looksLikeMarkdown, proseToParagraphs } from "./paste";
import VoiceRecorder from "./VoiceRecorder";
import { forgetLinkTargets, PostLinks } from "./extensions/links";
import { AuthorsEditor, IconPicker, loadFont } from "./MetaEditors";
import PublishDialog from "./PublishDialog";
import RevisionsSheet from "./RevisionsSheet";
import SaveState, { type SaveStatus } from "./SaveState";
import SmoothCaret from "./SmoothCaret";
import DeployPill, { recallDeploy, rememberDeploy, type Deploy } from "./DeployPill";
import PreviewSheet, { PageView } from "./PreviewSheet";
import TagsInline from "./TagsInline";
import Sheet from "./Sheet";
import { SlashCommand, slashItems, type SlashItem } from "./slash";

/*
 * The editor is the article page, editable. Title, standfirst, byline, cover
 * and body use the published page's own classes (.article-title, .article-dek,
 * .article-body …), so what you see while writing is what goes live, down to
 * the measure, the figure breakouts and the post's own fonts.
 *
 * Around it: Notion's affordances — "/" for blocks, ":" for emoji, a handle on
 * every block, a right-click menu, find in page — and on a phone, a toolbar
 * on top of the keyboard instead of the floating one.
 *
 * Saving is continuous: edits settle for 900ms, then go to R2. Nothing here
 * touches git until Publish.
 */

export type Meta = Pick<Draft, "title" | "slug" | "dek" | "tags" | "cover" | "icon" | "authors" | "fonts" | "page" | "ogImage" | "publishedAt">;

const metaOf = (d: Draft): Meta => ({
  title: d.title,
  slug: d.slug,
  dek: d.dek,
  tags: d.tags,
  cover: d.cover,
  icon: d.icon,
  authors: d.authors,
  fonts: d.fonts,
  page: d.page,
  ogImage: d.ogImage,
  publishedAt: d.publishedAt,
});

export type Panel = null | "details" | "revisions" | "publish" | "preview";

export type OpenOptions = { q?: string; n?: number; panel?: Panel };

export default function EditorScreen({ id, onBack, options }: { id: string; onBack: () => void; options?: OpenOptions }) {
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
  return draft ? <Composer initial={draft} onBack={onBack} options={options} /> : <div className="admin-loading" aria-busy="true" />;
}

/**
 * A textarea as tall as its text. Remeasured when the text changes, when the
 * width does, and once the fonts have loaded: measured against a fallback
 * font, a headline wraps differently and leaves a gap under itself.
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

/* The pickers are reached by id and a window event, so the slash items can
   be built once, outside the component. */
const BODY_PICK = "editor-body-pick";
const EMOJI_EVENT = "admin:pick-emoji";
const VOICE_EVENT = "admin:record-voice";
const openBodyPicker = () => document.getElementById(BODY_PICK)?.click();
const openEmojiPicker = () => window.dispatchEvent(new Event(EMOJI_EVENT));
const openRecorder = () => window.dispatchEvent(new Event(VOICE_EVENT));
const SLASH_ITEMS: SlashItem[] = slashItems(openBodyPicker, openEmojiPicker, openRecorder);

const ACCEPT = "image/*,video/*,audio/*,.heic,.heif";
/** Photos, GIFs, video and audio: anything the uploader can compress. */
const mediaFiles = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => kindOf(f) !== null);
const imageFiles = (list: FileList | null | undefined) => mediaFiles(list).filter((f) => kindOf(f) === "image");

/** An upload with a toast that shows how far along it is, then what happened. */
async function withProgress(label: string, run: (progress: (f: number, text: string) => void) => Promise<Uploaded>): Promise<Uploaded | null> {
  const id = toast.add({ type: "loading", title: label, description: "Preparing…", timeout: 0 });
  try {
    const result = await run((f, text) => toast.update(id, { description: `${text} · ${Math.round(f * 100)}%` }));
    toast.update(id, { type: "success", title: result.kind === "image" ? "Image added" : result.kind === "video" ? "Video added" : "Audio added", description: "Compressed and stripped of metadata.", timeout: 2200 });
    return result;
  } catch (error) {
    toast.update(id, { type: "error", title: "Upload failed", description: error instanceof Error ? error.message : undefined, timeout: 5000 });
    return null;
  }
}

/** Where an upload lands in the document. */
function mediaNode(up: Uploaded, name: string) {
  if (up.kind === "image") return { type: "image", attrs: { src: up.src, alt: altFromName(name), title: "" } };
  if (up.kind === "video") return { type: "media", attrs: { kind: "video", src: up.src, poster: up.poster, loop: up.loop, caption: "" } };
  return { type: "media", attrs: { kind: "audio", src: up.src, caption: "" } };
}

const HEADING_PLACEHOLDER: Record<number, string> = { 2: "Heading 1", 3: "Heading 2", 4: "Heading 3" };

/* The open post, for the [[ link menu (so it doesn't offer the post itself). */
const OPEN_POST = { id: "" };

/*
 * Writing settings, remembered per browser:
 *  - focus: everything but the paragraph you're in fades back (iA Writer);
 *  - typewriter: the line you're typing stays at the same height on screen;
 *  - outline: the headings, in the left margin (Obsidian);
 *  - smoothCaret: the caret glides between positions;
 *  - spellcheck: the browser's squiggles.
 */
type Modes = { focus: boolean; typewriter: boolean; outline: boolean; smoothCaret: boolean; spellcheck: boolean };
const MODES_KEY = "admin-writing-modes";
const DEFAULT_MODES: Modes = { focus: false, typewriter: false, outline: true, smoothCaret: true, spellcheck: true };
function readModes(): Modes {
  try {
    return { ...DEFAULT_MODES, ...(JSON.parse(localStorage.getItem(MODES_KEY) ?? "{}") as Partial<Modes>) };
  } catch {
    return DEFAULT_MODES;
  }
}

const MODE_TITLES: Record<keyof Modes, { title: string; icon: React.ReactNode; keywords: string[] }> = {
  focus: { title: "Focus mode", icon: <TextAlignCenter size={16} aria-hidden />, keywords: ["zen", "dim", "ia writer", "distraction"] },
  typewriter: { title: "Typewriter scrolling", icon: <TextColumns size={16} aria-hidden />, keywords: ["center", "scroll", "caret"] },
  outline: { title: "Outline", icon: <TextOutdent size={16} aria-hidden />, keywords: ["headings", "toc", "contents", "sidebar"] },
  smoothCaret: { title: "Smooth caret", icon: <CursorText size={16} aria-hidden />, keywords: ["cursor", "animation", "caret"] },
  spellcheck: { title: "Spellcheck", icon: <Textbox size={16} aria-hidden />, keywords: ["spelling", "typos", "squiggles"] },
};

const SITE = "https://nazarene.dev";
const CI = { size: 16, "aria-hidden": true } as const;

/** Edit, or read it as the page (the site's renderer, in place). */
type View = "edit" | "page";

function Composer({ initial, onBack, options }: { initial: Draft; onBack: () => void; options?: OpenOptions }) {
  const fine = useFinePointer();
  const [doc, setDoc] = useState<Draft>(initial);
  const [meta, setMeta] = useState<Meta>(() => metaOf(initial));
  const [slugTouched, setSlugTouched] = useState(() => Boolean(initial.slug) && initial.slug !== slugify(initial.title));
  const [save, setSave] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [panel, setPanel] = useState<Panel>(options?.panel ?? null);
  const [linkRequest, setLinkRequest] = useState(0);
  const [words, setWords] = useState(0);
  const [typing, setTyping] = useState(false);
  const [find, setFind] = useState<{ query: string; index: number; replace?: boolean } | null>(options?.q ? { query: options.q, index: options.n ?? 0 } : null);
  const [view, setView] = useState<View>("edit");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const plainPaste = useRef(false);
  const [modes, setModes] = useState<Modes>(readModes);
  const [deploy, setDeploy] = useState<Deploy | null>(() => recallDeploy(initial.id));
  const toggleMode = useCallback((mode: keyof Modes) => {
    setModes((m) => {
      const next = { ...m, [mode]: !m[mode] };
      try {
        localStorage.setItem(MODES_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

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
  const openFind = useRef<(query?: string, replace?: boolean) => void>(() => {});

  const insertImages = useRef<(files: File[], pos?: number) => Promise<void>>(async () => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        dropcursor: { color: "#2563eb", width: 2 },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return HEADING_PLACEHOLDER[node.attrs.level as number] ?? "Heading";
          if (node.type.name === "detailsSummary") return "Toggle";
          if (node.type.name === "codeBlock") return "";
          return "Write, or press / for blocks and : for emoji";
        },
      }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Highlight,
      Typography,
      Callout,
      Toggle,
      DetailsSummary,
      DetailsContent,
      Embed,
      Media,
      FluentEmoji,
      Find,
      CurrentBlock,
      EmojiSuggest,
      PostLinks(() => OPEN_POST.id),
      SlashCommand(() => SLASH_ITEMS),
      Extension.create({
        name: "adminKeys",
        addKeyboardShortcuts: () => ({
          "Mod-k": ({ editor: e }) => {
            if (e.state.selection.empty) window.dispatchEvent(new Event("admin:palette"));
            else setLinkRequest((n) => n + 1);
            return true;
          },
          // Paste without formatting; the browser does the paste, this only notes the intent.
          "Mod-Shift-v": () => {
            plainPaste.current = true;
            window.setTimeout(() => (plainPaste.current = false), 400);
            return false;
          },
          "Mod-f": () => {
            openFind.current();
            return true;
          },
          "Mod-Alt-f": () => {
            openFind.current(undefined, true);
            return true;
          },
          // Once: the block you're in. Twice: everything.
          "Mod-a": ({ editor: e }) => selectBlock(e),
          "Mod-d": ({ editor: e }) => {
            const b = currentBlock(e);
            if (b) duplicateBlock(e, b.pos);
            return true;
          },
          "Mod-Shift-ArrowUp": ({ editor: e }) => {
            const b = currentBlock(e);
            if (b) moveBlock(e, b.pos, -1);
            return true;
          },
          "Mod-Shift-ArrowDown": ({ editor: e }) => {
            const b = currentBlock(e);
            if (b) moveBlock(e, b.pos, 1);
            return true;
          },
        }),
      }),
    ],
    content: initial.body,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "article-body editor-body", "aria-label": "Body", "data-cursor": "text" },
      transformPastedHTML: cleanPastedHtml,
      handlePaste: (view, event) => {
        const data = event.clipboardData;
        const files = mediaFiles(data?.files);
        if (files.length) {
          void insertImages.current(files);
          return true;
        }
        const text = data?.getData("text/plain") ?? "";
        const html = data?.getData("text/html") ?? "";
        const inCode = view.state.selection.$from.parent.type.name === "codeBlock";
        if (!text || inCode) return false;
        const e = (view.dom as HTMLElement & { editor?: import("@tiptap/core").Editor }).editor;
        if (!e) return false;
        // ⌘⇧V: exactly the words, no formatting of any kind.
        if (plainPaste.current) {
          plainPaste.current = false;
          e.chain().focus().insertContent(proseToParagraphs(text).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))).run();
          return true;
        }
        // Markdown source, bare or wrapped in <p>s: parse it as Markdown.
        if ((!html || htmlIsWrappedMarkdown(html, text)) && looksLikeMarkdown(text)) {
          e.chain().focus().insertContent(text, { contentType: "markdown" } as never).run();
          return true;
        }
        // Plain prose with paragraphs: paragraphs, not one long line.
        if (!html && /\n\s*\n/.test(text)) {
          e.chain().focus().insertContent(proseToParagraphs(text).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }))).run();
          return true;
        }
        return false; // rich HTML: Tiptap parses it, after cleanPastedHtml
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = mediaFiles(event.dataTransfer?.files);
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
        const kind = kindOf(file);
        const up = await withProgress(kind === "video" ? "Adding video" : kind === "audio" ? "Adding audio" : file.type === "image/gif" ? "Adding GIF" : "Adding image", (p) => uploadMedia(file, p));
        if (up) editor.chain().focus().insertContentAt(pos ?? editor.state.selection.to, mediaNode(up, file.name)).run();
      }
    };
  }, [editor]);

  useEffect(() => {
    openFind.current = (query, replace) => {
      const selected = editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ").trim() : "";
      setView("edit");
      setFind({ query: query ?? (selected.length < 80 ? selected : ""), index: 0, replace });
    };
  }, [editor]);

  useEffect(() => {
    OPEN_POST.id = initial.id;
  }, [initial.id]);

  useEffect(() => {
    editor?.view.dom.setAttribute("spellcheck", String(modes.spellcheck));
    document.querySelectorAll(".editor-field").forEach((el) => el.setAttribute("spellcheck", String(modes.spellcheck)));
  }, [editor, modes.spellcheck]);

  // Typewriter scrolling: keep the caret's line at ~42% of the window.
  useEffect(() => {
    if (!editor || !modes.typewriter) return;
    let frame = 0;
    const keep = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!editor.isFocused) return;
        const top = editor.view.coordsAtPos(editor.state.selection.head).top;
        const delta = top - window.innerHeight * 0.42;
        if (Math.abs(delta) > 18) window.scrollBy({ top: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    };
    editor.on("selectionUpdate", keep);
    editor.on("update", keep);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", keep);
      editor.off("update", keep);
    };
  }, [editor, modes.typewriter]);

  useEffect(() => {
    const onPick = () => setEmojiOpen(true);
    const onVoice = () => setRecording(true);
    window.addEventListener(EMOJI_EVENT, onPick);
    window.addEventListener(VOICE_EVENT, onVoice);
    return () => {
      window.removeEventListener(EMOJI_EVENT, onPick);
      window.removeEventListener(VOICE_EVENT, onVoice);
    };
  }, []);

  // The post's own typefaces, loaded into the admin as they're chosen.
  useEffect(() => {
    loadFont(meta.fonts?.heading);
    loadFont(meta.fonts?.body);
  }, [meta.fonts]);

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
          announceSave(post.id, post.updatedAt);
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
  const applyingRemote = useRef(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // A change that came from another device is already saved.
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    scheduleSave();
  }, [meta]);

  /* ── Live: another device saved this post ───────────────────────────── */

  const saveStatus = useRef(save);
  useEffect(() => {
    saveStatus.current = save;
  }, [save]);

  const onPulse = useCallback(
    async (p: Pulse) => {
      if (!editor || !p.version || p.version === server.current.updatedAt) return;
      // Unsaved words here win; if both sides edited, the next save reports the conflict.
      if (inflight.current || saveStatus.current !== "saved") return;
      try {
        const { post } = await api.get(server.current.id);
        if (post.updatedAt === server.current.updatedAt || saveStatus.current !== "saved") return;
        server.current = post;
        setDoc(post);
        setSavedAt(post.updatedAt);
        applyingRemote.current = true;
        setMeta(metaOf(post));
        if (post.body !== editor.getMarkdown()) {
          const { from, to } = editor.state.selection;
          editor.commands.setContent(post.body, { contentType: "markdown", emitUpdate: false } as never);
          const max = editor.state.doc.content.size;
          editor.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) });
          setWords(countWords(editor.getText()));
        }
        toast.add({ id: "remote-update", type: "info", title: "Updated from another device", timeout: 1800 });
      } catch {
        /* next pulse */
      }
    },
    [editor]
  );
  usePulse(onPulse, initial.id);

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
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setView((v) => (v === "edit" ? "page" : "edit"));
      } else if (mod && e.key.toLowerCase() === "f" && !editor?.isFocused) {
        e.preventDefault();
        openFind.current(undefined, e.altKey);
      }
    };
    const wake = () => setTyping(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", wake, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", wake);
    };
  }, [flush, editor]);

  /* ── Fields ─────────────────────────────────────────────────────────── */

  const setTitle = (title: string) =>
    setMeta((m) => ({ ...m, title, slug: !doc.liveSlug && !slugTouched ? slugify(title) : m.slug }));

  const titleRef = useAutosize(meta.title);
  const dekRef = useAutosize(meta.dek);

  const setCover = async (file: File) => {
    const up = await withProgress("Adding cover", (p) => uploadMedia(file, p));
    if (up?.kind !== "image") return;
    setMeta((m) => ({ ...m, cover: { src: up.src, width: up.width, height: up.height, alt: m.cover?.alt || altFromName(file.name), caption: m.cover?.caption ?? "" } }));
  };
  const patchCover = (patch: Partial<Cover>) => setMeta((m) => (m.cover ? { ...m, cover: { ...m.cover, ...patch } } : m));

  const back = async () => {
    if (save !== "saved") await flush();
    onBack();
  };

  /** The server's word on this post, after a publish, schedule or pin. */
  const adopt = (post: Draft) => {
    server.current = post;
    setDoc(post);
    setSavedAt(post.updatedAt);
    setSave("saved");
  };

  const reschedule = async (at: Date) => {
    if (!(await flush())) return;
    try {
      const { post } = await api.publish(doc.id, at.toISOString());
      adopt(post);
      toast.add({ type: "success", title: "Rescheduled", description: `Goes live ${exactTime(post.publishAt ?? at.toISOString())}.` });
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t reschedule", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  const liveUrl = doc.liveSlug ? `${SITE}/writing/${doc.liveSlug}` : null;
  const toTrash = async () => {
    try {
      await flush();
      await api.remove(doc.id);
      const t = toast.add({
        type: "success",
        title: "Moved to Trash",
        description: doc.liveSlug ? "Taken off the site with the next build." : "Kept for 60 days.",
        timeout: 6000,
        actionProps: { children: "Undo", onClick: () => void api.untrash(doc.id).then(() => toast.close(t)) },
      });
      onBack();
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t move it to Trash", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  useCommands((): Command[] => {
    if (!editor) return [];
    const post: Command[] = [
      { id: "publish", group: "Post", title: doc.liveSlug ? "Publish changes…" : "Publish…", keys: "⌘⇧P", icon: <PaperPlaneTilt {...CI} />, keywords: ["schedule", "live", "ship"], run: () => setPanel("publish") },
      { id: "preview", group: "Post", title: "Preview page and share cards", icon: <Eye {...CI} />, keywords: ["og", "social", "twitter", "card", "phone"], run: () => setPanel("preview") },
      { id: "save", group: "Post", title: "Keep a revision", keys: "⌘S", icon: <FloppyDisk {...CI} />, keywords: ["save", "snapshot", "version"], run: () => void flush(true) },
      { id: "history", group: "Post", title: "History", icon: <ClockCounterClockwise {...CI} />, keywords: ["revisions", "versions", "restore", "undo"], run: () => setPanel("revisions") },
      { id: "details", group: "Post", title: "Details", keys: "⌘.", icon: <SlidersHorizontal {...CI} />, keywords: ["slug", "url", "cover", "fonts", "seo", "settings"], run: () => setPanel("details") },
      {
        id: "page",
        group: "Post",
        title: "Own page at /writing/…",
        icon: <BookOpenText {...CI} />,
        keywords: ["listed", "note", "setting"],
        checked: meta.page,
        run: () => setMeta((m) => ({ ...m, page: !m.page })),
      },
      {
        id: "pin",
        group: "Post",
        title: "Pinned to the top",
        icon: <PushPin {...CI} />,
        keywords: ["pin", "unpin", "favorite", "setting"],
        checked: Boolean(doc.pinned),
        run: () =>
          void flush()
            .then(() => api.save(doc.id, { pinned: !doc.pinned, base: server.current.updatedAt }))
            .then(({ post: p }) => adopt(p))
            .catch(() => toast.add({ type: "error", title: "Couldn’t pin it" })),
      },
      {
        id: "duplicate",
        group: "Post",
        title: "Duplicate post",
        icon: <CopySimple {...CI} />,
        keywords: ["copy", "clone"],
        run: () =>
          void flush()
            .then(() => api.duplicate(doc.id))
            .then(({ post: p }) => toast.add({ type: "success", title: "Duplicated", actionProps: { children: "Open", onClick: () => window.open(`/admin?post=${p.id}`, "_self") } })),
      },
      {
        id: "copy-md",
        group: "Post",
        title: "Copy post as Markdown",
        icon: <MarkdownLogo {...CI} />,
        keywords: ["export", "md", "clipboard"],
        run: () => void copy(serializePost(draftToPost({ ...doc, ...meta, body: editor.getMarkdown() }, doc.updatedAt)), "Markdown copied"),
      },
      ...(liveUrl
        ? [
            { id: "open-live", group: "Post" as const, title: "Open on the site", icon: <ArrowSquareOut {...CI} />, keywords: ["view", "live"], run: () => window.open(liveUrl, "_blank", "noopener") },
            { id: "copy-link", group: "Post" as const, title: "Copy link", icon: <LinkSimple {...CI} />, keywords: ["url", "share"], run: () => void copy(liveUrl, "Link copied") },
            {
              id: "unpublish",
              group: "Post" as const,
              title: doc.status === "scheduled" ? "Cancel schedule" : "Unpublish",
              icon: <ArrowUUpLeft {...CI} />,
              keywords: ["take down", "draft", "hide"],
              run: () => void api.unpublish(doc.id).then(({ post: p }) => (adopt(p), toast.add({ type: "success", title: "Unpublished", description: "It leaves the site with the next build." }))),
            },
          ]
        : doc.status === "scheduled"
          ? [{ id: "unpublish", group: "Post" as const, title: "Cancel schedule", icon: <ArrowUUpLeft {...CI} />, keywords: ["unschedule", "draft"], run: () => void api.unpublish(doc.id).then(({ post: p }) => (adopt(p), toast.add({ type: "success", title: "Schedule cancelled" }))) }]
          : []),
      { id: "trash", group: "Post", title: "Move to Trash", icon: <Trash {...CI} />, keywords: ["delete", "remove"], run: () => void toTrash() },
    ];
    const viewCmds: Command[] = [
      {
        id: "view",
        group: "View",
        title: view === "edit" ? "Read as the page" : "Back to editing",
        keys: "⌘⇧E",
        icon: view === "edit" ? <BookOpenText {...CI} /> : <PencilSimple {...CI} />,
        keywords: ["view", "page", "read", "edit", "mode", "toggle"],
        run: () => setView((v) => (v === "edit" ? "page" : "edit")),
      },
      ...(Object.keys(MODE_TITLES) as (keyof Modes)[]).map((k) => ({ id: `mode:${k}`, group: "View" as const, ...MODE_TITLES[k], keywords: [...MODE_TITLES[k].keywords, "setting", "toggle"], checked: modes[k], run: () => toggleMode(k) })),
    ];
    const edit: Command[] = [
      { id: "find", group: "Edit", title: "Find in this post", keys: "⌘F", icon: <MagnifyingGlass {...CI} />, keywords: ["search"], run: () => openFind.current() },
      { id: "replace", group: "Edit", title: "Find and replace", keys: "⌥⌘F", icon: <Swap {...CI} />, keywords: ["substitute", "change all"], run: () => openFind.current(undefined, true) },
      { id: "select-block", group: "Edit", title: "Select block", keys: "⌘A", icon: <SelectionPlus {...CI} />, keywords: ["paragraph", "highlight"], run: () => (setView("edit"), selectBlock(editor) || editor.commands.focus()) },
      { id: "select-all", group: "Edit", title: "Select all", keys: "⌘A ⌘A", icon: <ArrowsInLineVertical {...CI} />, keywords: ["everything", "body"], run: () => (setView("edit"), editor.chain().focus().selectAll().run()) },
      { id: "undo", group: "Edit", title: "Undo", keys: "⌘Z", icon: <ArrowUUpLeft {...CI} />, disabled: editor.can().undo() ? undefined : "Nothing to undo", run: () => editor.chain().focus().undo().run() },
      { id: "redo", group: "Edit", title: "Redo", keys: "⌘⇧Z", icon: <ArrowUUpRight {...CI} />, disabled: editor.can().redo() ? undefined : "Nothing to redo", run: () => editor.chain().focus().redo().run() },
    ];
    const insert: Command[] = inserts(openBodyPicker, openEmojiPicker, openRecorder).map((i) => ({
      id: `insert:${i.id}`,
      group: "Insert",
      title: i.title,
      icon: i.icon,
      keywords: [...i.keywords, "insert", "add"],
      run: () => (setView("edit"), i.run(editor)),
    }));
    const turn: Command[] = BLOCKS.map((b) => ({
      id: `turn:${b.kind}`,
      group: "Turn into",
      title: `Turn into ${b.title.toLowerCase()}`,
      icon: b.icon,
      keywords: [...b.keywords, "turn", "convert", "block"],
      run: () => (setView("edit"), turnInto(editor, b.kind)),
    }));
    return [...post, ...viewCmds, ...edit, ...insert, ...turn];
  });

  const minutes = readingMinutes(editor?.getText() ?? "");
  const live = doc.liveSlug !== null;
  const publishLabel = doc.status === "scheduled" ? "Scheduled" : live ? (doc.dirty ? "Publish changes" : "Published") : "Publish";
  const pickers = {
    pickImage: openBodyPicker,
    pickEmoji: openEmojiPicker,
    pickVoice: openRecorder,
    onLink: () => setLinkRequest((n) => n + 1),
    onFind: (q?: string) => openFind.current(q),
    onReplace: (q?: string) => openFind.current(q, true),
  };

  return (
    <div
      className="editor-root"
      data-typing={typing || undefined}
      data-touch={!fine || undefined}
      data-focus-mode={modes.focus || undefined}
      data-typewriter={modes.typewriter || undefined}
      data-view={view}
    >
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
          {deploy ? <DeployPill key={deploy.updatedAt} deploy={deploy} onDismiss={() => setDeploy(null)} /> : null}
        </div>
        <div className="editor-bar-side">
          <div className="admin-segments view-switch" role="radiogroup" aria-label="View">
            <button type="button" role="radio" aria-checked={view === "edit"} className="admin-segment" onClick={() => setView("edit")} title={`Edit  ${keys("⌘⇧E")}`}>
              <PencilSimple size={14} aria-hidden="true" />
              <span className="admin-hide-sm">Edit</span>
            </button>
            <button type="button" role="radio" aria-checked={view === "page"} className="admin-segment" onClick={() => setView("page")} title={`Read as the page  ${keys("⌘⇧E")}`}>
              <BookOpenText size={14} aria-hidden="true" />
              <span className="admin-hide-sm">Page</span>
            </button>
          </div>
          <button type="button" className="admin-icon-button" aria-label="Find in this post" title="Find  ⌘F" onClick={() => openFind.current()}>
            <MagnifyingGlass size={16} weight="bold" />
          </button>
          <Menu.Root>
            <Menu.Trigger className="admin-icon-button" aria-label="View" title="View">
              <Eye size={16} weight="bold" />
            </Menu.Trigger>
            <MenuSurface align="end">
              <MLabel>View</MLabel>
              <MItem icon={modes.focus ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => toggleMode("focus")} closeOnClick={false}>
                Focus mode
              </MItem>
              <MItem icon={modes.typewriter ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => toggleMode("typewriter")} closeOnClick={false}>
                Typewriter scrolling
              </MItem>
              <MItem icon={modes.outline ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => toggleMode("outline")} closeOnClick={false}>
                Outline
              </MItem>
              <MItem icon={modes.smoothCaret ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => toggleMode("smoothCaret")} closeOnClick={false}>
                Smooth caret
              </MItem>
              <MItem icon={modes.spellcheck ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => toggleMode("spellcheck")} closeOnClick={false}>
                Spellcheck
              </MItem>
              <MItem icon={<Eye size={15} />} onSelect={() => setPanel("preview")}>
                Preview page and share cards
              </MItem>
              <MItem icon={<span className="menu-check-space" />} keys={keys("⌘K")} onSelect={() => window.dispatchEvent(new Event("admin:palette"))}>
                Command palette
              </MItem>
            </MenuSurface>
          </Menu.Root>
          <button type="button" className="admin-icon-button" aria-label="History" title="History" onClick={() => setPanel("revisions")}>
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

      {find && editor && view === "edit" ? (
        <FindBar
          key={`${find.query}:${find.index}:${find.replace ? 1 : 0}`}
          editor={editor}
          initial={find.query}
          initialIndex={find.index}
          initialReplace={find.replace}
          onClose={() => setFind(null)}
        />
      ) : null}

      {view === "page" ? <PageView meta={meta} body={editor?.getMarkdown() ?? doc.body} doc={doc} /> : null}

      <main hidden={view === "page"} className="page-shell editor-canvas article-shell w-full max-w-[672px]" style={fontVars(meta.fonts) as React.CSSProperties}>
        <article className="article">
          <header className="article-header">
            <div className="editor-page-tools" data-has-icon={meta.icon ? "" : undefined}>
              <IconPicker icon={meta.icon} onChange={(icon) => setMeta((m) => ({ ...m, icon }))} />
              {!meta.cover ? (
                <button type="button" className="admin-chip page-icon-add" onClick={() => coverPick.current?.click()}>
                  <ImageSquare size={14} aria-hidden="true" /> Add cover
                </button>
              ) : null}
            </div>
            <p className="article-eyebrow">
              <EyebrowDate doc={doc} publishedAt={meta.publishedAt} onDate={(publishedAt) => setMeta((m) => ({ ...m, publishedAt }))} onReschedule={reschedule} />
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
            <TagsInline tags={meta.tags} onChange={(tags) => setMeta((m) => ({ ...m, tags }))} />
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
            <AuthorsEditor authors={meta.authors} minutes={minutes} onChange={(authors) => setMeta((m) => ({ ...m, authors }))} />
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
          ) : null}

          {editor ? (
            <>
              <EditorContextMenu editor={editor} {...pickers}>
                <EditorContent editor={editor} />
              </EditorContextMenu>
              {fine ? (
                <>
                  {modes.smoothCaret && view === "edit" ? <SmoothCaret editor={editor} /> : null}
                  {modes.outline ? <Outline editor={editor} /> : null}
                  <BlockHandle editor={editor} />
                  <TextBubble editor={editor} linkRequest={linkRequest} />
                </>
              ) : (
                <MobileToolbar editor={editor} {...pickers} />
              )}
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
          <kbd className="admin-kbd">/</kbd> blocks <kbd className="admin-kbd">:</kbd> emoji <kbd className="admin-kbd">⌘K</kbd> search <kbd className="admin-kbd">⌘⇧P</kbd> publish
        </span>
      </footer>

      <input
        ref={bodyPick}
        id={BODY_PICK}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = mediaFiles(e.target.files);
          e.target.value = "";
          void insertImages.current(files);
        }}
      />
      <input
        ref={coverPick}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          const file = imageFiles(e.target.files)[0];
          e.target.value = "";
          if (file) void setCover(file);
        }}
      />

      <VoiceRecorder
        open={recording}
        onClose={() => setRecording(false)}
        onDone={async (blob) => {
          const up = await withProgress("Adding voice note", (p) => uploadAudio(blob, p, true));
          if (up && editor) editor.chain().focus().insertContent(mediaNode(up, "Voice note")).run();
        }}
      />

      <Sheet open={emojiOpen} onClose={() => setEmojiOpen(false)} title="Emoji" variant="center">
        <EmojiPicker
          onPick={(emoji) => {
            setEmojiOpen(false);
            editor?.chain().focus().insertContent(emoji).run();
          }}
        />
      </Sheet>

      <PreviewSheet
        open={panel === "preview"}
        onClose={() => setPanel(null)}
        meta={meta}
        body={editor?.getMarkdown() ?? doc.body}
        doc={doc}
        onPublish={() => setPanel("publish")}
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
        doc={doc}
        currentBody={editor?.getMarkdown() ?? doc.body}
        onRestored={() => window.location.reload()}
      />
      <PublishDialog
        open={panel === "publish"}
        onClose={() => setPanel(null)}
        doc={doc}
        meta={meta}
        body={editor?.getMarkdown() ?? ""}
        beforePublish={() => flush()}
        onPreview={() => setPanel("preview")}
        onDone={(post) => {
          forgetLinkTargets();
          if (post.status === "published" && post.liveSlug) {
            const d: Deploy = {
              id: post.id,
              url: `/writing/${post.liveSlug}`,
              updatedAt: post.updatedAt,
              startedAt: Date.now(),
              page: post.page !== false,
              title: post.title,
            };
            rememberDeploy(d);
            setDeploy(d);
          }
          adopt(post);
        }}
        onSlugChange={(slug) => {
          setSlugTouched(true);
          setMeta((m) => ({ ...m, slug }));
        }}
        onPageChange={(page) => setMeta((m) => ({ ...m, page }))}
      />
    </div>
  );
}

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;
}

/**
 * The date over the title, clickable: pick the date a post shows (backdate
 * an essay, fix a year), or move when a scheduled post goes live.
 */
function EyebrowDate({
  doc,
  publishedAt,
  onDate,
  onReschedule,
}: {
  doc: Draft;
  publishedAt: string | null;
  onDate: (iso: string | null) => void;
  onReschedule: (at: Date) => Promise<void>;
}) {
  const scheduled = doc.status === "scheduled" && doc.publishAt;
  const [pending, setPending] = useState<Date | null>(null);

  if (scheduled) {
    const value = pending ?? new Date(doc.publishAt as string);
    return (
      <DateTimePicker
        value={value}
        min={new Date()}
        onChange={setPending}
        className="eyebrow-date"
        label="Change when this goes live"
        footer={(close) => (
          <>
            <button type="button" className="admin-button admin-button-quiet" onClick={() => (setPending(null), close())}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-button admin-button-primary"
              data-keycap
              disabled={!pending}
              onClick={() => {
                if (pending) void onReschedule(pending).then(() => setPending(null));
                close();
              }}
            >
              Reschedule
            </button>
          </>
        )}
      >
        <CalendarBlank size={13} aria-hidden="true" />
        Goes live {exactTime(value.toISOString())}
      </DateTimePicker>
    );
  }

  const value = publishedAt ? new Date(publishedAt) : null;
  return (
    <DateTimePicker
      value={value ?? new Date()}
      onChange={(d) => onDate(d.toISOString())}
      className="eyebrow-date"
      label="Change the date this post shows"
      footer={(close) =>
        value && !doc.liveSlug ? (
          <button type="button" className="admin-button admin-button-quiet" onClick={() => (onDate(null), close())}>
            Use the time I publish
          </button>
        ) : (
          <span className="field-help">The date readers see on the post.</span>
        )
      }
    >
      <CalendarBlank size={13} aria-hidden="true" />
      {value ? exactTime(value.toISOString()) : "Not published · set a date"}
    </DateTimePicker>
  );
}
