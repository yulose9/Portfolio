"use client";

import { SoundToggle } from "../../components/ui/sound";
import { ThemeToggle } from "../../components/ui/theme";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsInLineVertical,
  ArrowUUpLeft,
  ArrowUUpRight,
  BookOpenText,
  CalendarBlank,
  Check,
  Code,
  HighlighterCircle,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  ClockCounterClockwise,
  CopySimple,
  CursorText,
  DotsThree,
  Eye,
  EyeSlash,
  FloppyDisk,
  ImageSquare,
  LinkSimple,
  MagnifyingGlass,
  MarkdownLogo,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  PushPin,
  SelectionPlus,
  SlidersHorizontal,
  Subtitles,
  Swap,
  TextAlignCenter,
  TextColumns,
  TextOutdent,
  Textbox,
  Trash,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import AdminSelect from "./AdminSelect";
import { Extension } from "@tiptap/core";
import UniqueID from "@tiptap/extension-unique-id";
import { editorContent, type EditorDocument } from "../../../cms/editor-document";
import { journalWrite, journalRead, journalClear, journalFlush, journalOwnKey, JOURNAL_EVENT, type LocalState } from "./draft-journal";
import Highlight from "@tiptap/extension-highlight";
import { NodeRange } from "@tiptap/extension-node-range";
import { ResizableImage } from "./extensions/resizable-image";
import { Mentions } from "./extensions/mentions";
import { InlineLogo } from "./extensions/inline-logo";
import { TextColor } from "./extensions/text-color";
import LinkHover from "./LinkHover";
import BlockMarquee from "./BlockMarquee";
import { HeadingIcon } from "./extensions/heading-icon";
import { Kbd } from "../../components/kit/kbd";
import UpdatedAt from "../../components/UpdatedAt";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { beginPendingWork, clearRecovery, keepRecovery, readRecovery, registerProtection, leavingForSignIn } from "./session";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { imageInfo } from "../../../cms/media";

import { fontVars } from "../../../cms/fonts";
import { draftToPost, readingMinutes, serializePost, slugify, type Cover } from "../../../cms/format";
import { suggestSlug } from "../../../cms/slug";
import { copy } from "../../components/menu/actions";
import { useFinePointer } from "../../components/menu/useFinePointer";
import { toast } from "../../lib/toast";
import { trashToast } from "./trash-toast";
import { altFromName, api, ApiError, type Draft } from "./api";
import { exactTime, StatusDot, statusLabel, statusShort } from "./bits";
import { ImageBubble, TextBubble } from "./Bubble";
import { BLOCKS, currentBlock, duplicateSelection, inserts, MARKS, moveBlock, selectBlock, selectionMarkdown, turnInto } from "./commands";
import DateTimePicker from "./DateTimePicker";
import { useCommands, type Command } from "./registry";
import DetailsSheet from "./DetailsSheet";
import { BlockHandle, EditorContextMenu, FindBar, MobileToolbar } from "./EditorChrome";
import { CurrentBlock, DetailsContent, DetailsSummary, Find, FluentEmoji, Toggle } from "./extensions/blocks";
import { EmojiPicker, EmojiSuggest } from "./extensions/emoji";
import { announceSave, usePulse, type Pulse } from "./live";
import { keys, MenuSurface, MItem, MLabel } from "./menu";
import { Outline } from "./Outline";
import { Embed } from "./extensions/EmbedView";
import { MediaPlus as Media } from "./extensions/media-plus";
import { CalloutIconPicker, CalloutWithPicker as Callout } from "./extensions/callout-view";
import { CoverActions, CoverPicker, EditorBanner } from "./CoverEditor";
import MediaPicker, { type MediaPick } from "./MediaPicker";
import { coverStyle, withCoverStyle } from "../../../cms/cover";
import { showsSubtitle, withSubtitle } from "../../../cms/subtitle";
import { CodeTabsBlock } from "./extensions/code-tabs";
import { ChartBlock } from "./extensions/chart";
import { PollBlock } from "./extensions/poll";
import { CitationNode } from "./extensions/citation";
import { TablePlus } from "./extensions/table-plus";
import { selectedLine } from "./extensions/table-lines";
import { TableCellColors, TableStyleMarkdown } from "./extensions/blocks-schema";
import { kindOf, uploadAudio, uploadMedia, type Uploaded, ACCEPT } from "./media";
import { cleanPastedHtml, htmlIsWrappedMarkdown, looksLikeMarkdown, proseToParagraphs } from "./paste";
import VoiceRecorder from "./VoiceRecorder";
import { forgetLinkTargets, PostLinks } from "./extensions/links";
import { AuthorsEditor, IconPicker, loadFont } from "./MetaEditors";
import PublishDialog from "./PublishDialog";
import RevisionsSheet from "./RevisionsSheet";
import SaveState, { type SaveStatus } from "./SaveState";
import { BarOverflowItems, readBarOverflow, type BarOverflow } from "./BarOverflow";
import SmoothCaret from "./SmoothCaret";
import DeployPill, { recallDeploy, rememberDeploy, type Deploy } from "./DeployPill";
import PreviewSheet, { PageView } from "./PreviewSheet";
import TagsInline from "./TagsInline";
import Sheet from "./Sheet";
import ResearchPanel from "./ResearchPanel";
import MediaJobs, { reportUpload } from "./MediaJobs";
import MediaLibrary from "./MediaLibrary";
import {useShortcuts, shortcutLabel } from "./shortcuts";
import PageLocation from "./PageLocation";
import PageNavigator from "./PageNavigator";
import { CLIPBOARD_TYPE, readClipboard } from "../../../cms/clipboard";
import ImportReview from "./ImportReview";
import { WritingClipboard, pasteWritingClipboard } from "./extensions/clipboard";
import { WritingCodeBlockPro as WritingCodeBlock } from "./extensions/code-pro";
import { saveMediaJob, pendingMediaLabel } from "./media-journal";
import { InteractionHighlight } from "./extensions/interaction-highlight";
import { SlashCommand, slashItems, type SlashItem } from "./slash";
import { ListEnter, TabKeys } from "./extensions/tab-keys";
import { HeadingShortcuts } from "./extensions/heading-rules";
import { useClickBelowToWrite, useGrabbingCursor } from "./editor-gestures";
import { Tabs, TabsList, TabsTrigger } from "../../components/kit/tabs";
import { SlidingNumber } from "../../components/kit/inputs/counter";
import { CopyButton } from "../../components/kit/inputs/copy-button";
import { createTooltipHandle, GlidingTooltip, TooltipTrigger } from "../../components/kit/tooltip";
import { Skeleton } from "../../components/kit/skeleton";
import { DownloadButton } from "../../components/kit/inputs/download-button";
import { AltAssist } from "./AltAssist";
import { altPage, altTextAvailable, generateAltText, suggestAltForUpload } from "./alt-text";
import { needsAltText } from "../../../cms/alt-text";

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

export type Meta = Pick<Draft, "title" | "slug" | "dek" | "tags" | "cover" | "icon" | "authors" | "fonts" | "page" | "ogImage" | "publishedAt" | "editorial">;

const metaOf = (d: Draft): Meta => ({
  editorial:d.editorial??{stage:"drafting",reviewAt:null,timezone:"UTC"},
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

export type Panel = null | "details" | "revisions" | "publish" | "preview" | "research" | "media";

export type OpenOptions = { q?: string; n?: number; panel?: Panel; block?:string };

export default function EditorScreen({ id, onBack, onOpen, options }: { id: string; onBack: () => void; onOpen: (id: string) => void; options?: OpenOptions }) {
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
  return draft ? <Composer initial={draft} onBack={onBack} onOpen={onOpen} options={options} /> : <EditorSkeleton />;
}

/**
 * A textarea as tall as its text. Remeasured when the text changes, when the
 * width does, and once the fonts have loaded: measured against a fallback
 * font, a headline wraps differently and leaves a gap under itself.
 */
function useAutosize(value: string, mounted = true) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
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
  }, [value, mounted]);
  return ref;
}

/* The pickers are reached by id and a window event, so the slash items can
   be built once, outside the component. */
const BODY_PICK = "editor-body-pick";
const EMOJI_EVENT = "admin:pick-emoji";
const VOICE_EVENT = "admin:record-voice";
const MEDIA_EVENT = "admin:pick-media";
/** Opens the media picker at the caret (Gallery, Upload, Link). */
const openBodyPicker = () => window.dispatchEvent(new Event(MEDIA_EVENT));
const openEmojiPicker = () => window.dispatchEvent(new Event(EMOJI_EVENT));
const openRecorder = () => window.dispatchEvent(new Event(VOICE_EVENT));
const SLASH_ITEMS: SlashItem[] = slashItems(openBodyPicker, openEmojiPicker, openRecorder);
/** The editor bar's shared tooltip. */
const barTips = createTooltipHandle();

/** Photos, GIFs, video and audio: anything the uploader can compress. */
const mediaFiles = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => kindOf(f) !== null);
const imageFiles = (list: FileList | null | undefined) => mediaFiles(list).filter((f) => kindOf(f) === "image");

/**
 * A direct upload (cover, voice note). Its progress shows in the Media uploads
 * panel beside body media, so every upload reports in one place; what
 * happened is a toast.
 */
async function withProgress(label: string, run: (progress: (f: number, text: string) => void) => Promise<Uploaded>): Promise<Uploaded | null> {
  const finish = beginPendingWork();
  const id = `direct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  reportUpload({ id, name: label });
  try {
    const result = await run((f, text) => reportUpload({ id, name: label, label: `${text} · ${Math.round(f * 100)}%` }));
    toast.add({ type: "success", title: result.kind === "image" ? "Image added" : result.kind === "video" ? "Video added" : "Audio added", description: "Compressed and stripped of metadata.", timeout: 2200 });
    return result;
  } catch (error) {
    toast.add({ type: "error", title: "Upload failed", description: error instanceof Error ? error.message : undefined });
    return null;
  } finally {
    reportUpload({ id, name: label, done: true });
    finish();
  }
}

/** Where something chosen in the media picker lands in the document. */
function pickedNode(p: MediaPick) {
  if (p.kind === "image") return { type: "image", attrs: { src: p.src, alt: p.alt ?? "", title: "" } };
  if (p.kind === "video") return { type: "media", attrs: { kind: "video", src: p.src, poster: p.poster ?? null, loop: p.loop ?? false, caption: "" } };
  return { type: "media", attrs: { kind: "audio", src: p.src, caption: "" } };
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
const MODES_KEY = "admin-writing-modes-v2";
const DEFAULT_MODES: Modes = { focus: false, typewriter: false, outline: true, smoothCaret: false, spellcheck: true };
function readModes(): Modes {
  try {
    const raw = localStorage.getItem(MODES_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem("admin-writing-modes");
      if (oldRaw) {
        const parsed = JSON.parse(oldRaw) as Partial<Modes>;
        const migrated: Modes = { ...DEFAULT_MODES, ...parsed, smoothCaret: false };
        localStorage.setItem(MODES_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return DEFAULT_MODES;
    }
    return { ...DEFAULT_MODES, ...(JSON.parse(raw) as Partial<Modes>) };
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
const MARK_ICONS: Record<string, React.ReactNode> = {
  bold: <TextB {...CI} weight="bold" />,
  italic: <TextItalic {...CI} />,
  underline: <TextUnderline {...CI} />,
  strike: <TextStrikethrough {...CI} />,
  highlight: <HighlighterCircle {...CI} />,
  code: <Code {...CI} />,
};

/** Edit, or read it as the page (the site's renderer, in place). */
type View = "edit" | "page" | "markdown";

function Composer({ initial, onBack, onOpen, options }: { initial: Draft; onBack: () => void; onOpen: (id: string) => void; options?: OpenOptions }) {
  type EditCopy = Meta & { body:string; editorDocument?:EditorDocument|null };
  const [recovery, setRecovery] = useState(() => readRecovery<EditCopy>(initial.id));
  const [recoveryCopies,setRecoveryCopies]=useState<import("./session").Recovery<EditCopy>[]>([]);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [localState,setLocalState] = useState<LocalState>("writing");
  useEffect(()=> {
    let alive=true;
    void journalRead<EditCopy>(initial.id).then(entries=> {
      if(!alive) return;
      const saved=JSON.stringify({...metaOf(initial),body:initial.body,editorDocument:initial.editorDocument??null});
      const copies:import("./session").Recovery<EditCopy>[]=entries.filter(e=>JSON.stringify(e.edit)!==saved);
      const session=readRecovery<EditCopy>(initial.id);
      if(session&&JSON.stringify(session.edit)!==saved&&!copies.some(e=>JSON.stringify(e.edit)===JSON.stringify(session.edit)))copies.push(session);
      copies.sort((a,b)=>b.at-a.at);
      setRecoveryCopies(copies);setRecovery(copies[0]??null);
      setRecoveryReady(true);
    });
    const status=(event:Event)=>{const detail=(event as CustomEvent<{id:string;state:LocalState}>).detail;if(detail.id===initial.id)setLocalState(detail.state);};
    window.addEventListener(JOURNAL_EVENT,status);
    return ()=>{alive=false;window.removeEventListener(JOURNAL_EVENT,status);};
  },[initial]);
  const fine = useFinePointer();
  const [doc, setDoc] = useState<Draft>(initial);
  const [meta, setMeta] = useState<Meta>(() => metaOf(initial));
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  useEffect(() => {
    const previous = document.title;
    document.title = `${meta.icon ? `${meta.icon} ` : ""}${meta.title.trim() || "Untitled"} · Writing admin`;
    altPage.title = meta.title.trim();
    return () => { document.title = previous; altPage.title = ""; };
  }, [meta.title, meta.icon]);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (!event.defaultPrevented && (event.ctrlKey || event.metaKey) && event.key === "\\" && !event.shiftKey && !event.altKey) {
        event.preventDefault(); setNavigatorOpen(value => !value);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);
  const [slugTouched, setSlugTouched] = useState(() => Boolean(initial.slug) && initial.slug !== slugify(initial.title) && initial.slug !== suggestSlug(initial.title));
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
  useEffect(() => { if (recording) return beginPendingWork(); }, [recording]);
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
  const saveRef = useRef<(snapshot?: boolean) => Promise<boolean>>(async () => true);
  const bodyPick = useRef<HTMLInputElement>(null);
  const coverPick = useRef<HTMLInputElement>(null);
  const openFind = useRef<(query?: string, replace?: boolean) => void>(() => {});

  const insertImages = useRef<(files: File[], pos?: number) => Promise<void>>(async () => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      UniqueID.configure({attributeName:"blockId",types:["paragraph","heading","blockquote","codeBlock","bulletList","orderedList","listItem","taskList","taskItem","image","horizontalRule","table","tableRow","tableCell","tableHeader","callout","details","detailsSummary","detailsContent","embed","media","codeTabs","chart","poll"]}),
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        // The theme blue: #2563eb is 3.4:1 on the dark page, var(--blue) 6.7:1.
        dropcursor: { color: "var(--blue)", width: 3, class: "editor-dropcursor" },
      }),
      ResizableImage,
      // Tab indents code by two spaces; Shift+Tab takes them back (see tab-keys.ts).
      WritingCodeBlock.configure({ enableTabIndentation: true, tabSize: 2 }),
      InlineLogo,
      HeadingIcon,
      TextColor,
      Mentions(() => OPEN_POST.id),
      NodeRange.configure({ depth: 0, key: null }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ editor: e, node, pos }) => {
          // A table is a grid of empty cells at first; a hint in each reads as noise.
          const $pos = e.state.doc.resolve(Math.min(pos, e.state.doc.content.size));
          for (let d = $pos.depth; d > 0; d--) {
            const name = $pos.node(d).type.name;
            if (name === "tableCell" || name === "tableHeader") return "";
          }
          if (node.type.name === "heading") return HEADING_PLACEHOLDER[node.attrs.level as number] ?? "Heading";
          if (node.type.name === "detailsSummary") return HEADING_PLACEHOLDER[node.attrs.level as number] ?? "Toggle";
          if (node.type.name === "codeBlock") return "";
          return "Write, / for blocks, @ for dates and pages, : for emoji";
        },
      }),
      Markdown,
      WritingClipboard,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: false }),
      TablePlus,
      TableStyleMarkdown,
      TableCellColors,
      Highlight,
      Typography,
      Callout,
      Toggle,
      DetailsSummary,
      DetailsContent,
      Embed,
      Media,
      CodeTabsBlock,
      ChartBlock,
      PollBlock,
      CitationNode,
      FluentEmoji,
      Find,
      CurrentBlock,
      InteractionHighlight,
      EmojiSuggest,
      PostLinks(() => OPEN_POST.id),
      SlashCommand(() => SLASH_ITEMS),
      TabKeys,
      // Enter on an empty list item steps out a level, like Shift+Tab.
      ListEnter,
      // "# " is Heading 1, as in Notion (see heading-rules.ts).
      HeadingShortcuts,
      Extension.create({
        name: "adminKeys",
        addKeyboardShortcuts: () => ({
          // The palette, always. With text selected it leads with what can be
          // done to the selection, "Add link" first, so ⌘K ↵ still makes a link.
          "Mod-k": () => {
            window.dispatchEvent(new Event("admin:palette"));
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
          // The block, or every selected block as a group. A table row or
          // column picked by its handle is left to TablePlus's own ⌘D (and
          // ⌘⇧↑↓): this keymap, added later, runs before the table's.
          "Mod-d": ({ editor: e }) => {
            if (selectedLine(e.state)) return false;
            duplicateSelection(e);
            return true;
          },
          "Mod-Shift-ArrowUp": ({ editor: e }) => {
            if (selectedLine(e.state)) return false;
            const b = currentBlock(e);
            if (b) moveBlock(e, b.pos, -1);
            return true;
          },
          "Mod-Shift-ArrowDown": ({ editor: e }) => {
            if (selectedLine(e.state)) return false;
            const b = currentBlock(e);
            if (b) moveBlock(e, b.pos, 1);
            return true;
          },
        }),
      }),
    ],
    content: editorContent(initial) ?? initial.body,
    contentType: editorContent(initial) ? "json" : "markdown",
    editorProps: {
      attributes: { class: "article-body editor-body", role:"textbox", "aria-multiline":"true", "aria-label": "Body", "data-cursor": "text" },
      transformPastedHTML: cleanPastedHtml,
      handlePaste: (view, event) => {
        const data = event.clipboardData;
        const internal=data?.getData(CLIPBOARD_TYPE);
        if(!plainPaste.current&&internal){const parsed=readClipboard(internal);if(parsed&&parsed.content.length>12){view.dom.dispatchEvent(new CustomEvent("writing:review-import",{detail:internal}));return true;}}
        if(!plainPaste.current&&internal&&pasteWritingClipboard(view,internal))return true;
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

  // A closed hand while anything drags; a click under the last block writes there.
  useGrabbingCursor();
  useClickBelowToWrite(editor);

  useEffect(() => {
    insertImages.current = async (files, pos) => {
      if (!editor) return;
      let insertion=pos??editor.state.selection.to;
      const map=({transaction}:{transaction:import("@tiptap/pm/state").Transaction})=>{insertion=transaction.mapping.map(insertion,1);};
      editor.on("transaction",map);
      try {for (const file of files) {
        const blockId=crypto.randomUUID(), jobId=crypto.randomUUID();
        try {
          if(file.size>128*1024*1024)throw new Error("Choose a file below 128 MB for recoverable uploads.");
          await saveMediaJob({version:1,id:jobId,documentId:initial.id,blockId,name:file.name,mime:file.type,file,state:"queued",attempts:0,updatedAt:Date.now()});
          if(editor.isDestroyed)return;
          editor.chain().focus().insertContentAt(insertion,{type:"paragraph",attrs:{blockId},content:[{type:"text",text:pendingMediaLabel(file.name)}]}).run();
        } catch(error) {toast.add({type:"error",title:"Couldn’t keep this upload",description:error instanceof Error?error.message:"This browser won’t store it. Choose the file again."});}
      }}finally{editor.off("transaction",map);}
    };
  }, [editor,initial.id]);

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

  useEffect(()=> {
    if(!editor||!options?.block||!recoveryReady)return;
    let found=false;
    editor.state.doc.descendants((node,pos)=>{if(node.attrs.blockId===options.block){found=true;editor.chain().setTextSelection(Math.min(pos+1,editor.state.doc.content.size)).scrollIntoView().run();return false;}});
    if(!found)toast.add({type:"info",title:"That block isn’t on the page any more",description:"It was moved or deleted."});
  },[editor,options?.block,recoveryReady]);

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

  // "Photo, video or audio" (slash menu, palette, phone bar) opens the media
  // picker under the caret; what's chosen lands where the caret was.
  const [bodyMedia, setBodyMedia] = useState<number | null>(null);
  useEffect(() => {
    const onMedia = () => {
      if (editor && !editor.isDestroyed) setBodyMedia(editor.state.selection.to);
    };
    window.addEventListener(MEDIA_EVENT, onMedia);
    return () => window.removeEventListener(MEDIA_EVENT, onMedia);
  }, [editor]);
  const caretAnchor = useMemo(() => {
    if (!editor || bodyMedia === null) return undefined;
    return {
      getBoundingClientRect: () => {
        const c = editor.view.coordsAtPos(Math.min(bodyMedia, editor.state.doc.content.size));
        return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
      },
    };
  }, [editor, bodyMedia]);
  // The full library, from a picker's "Browse all": the body's, or the cover's.
  const libraryFor = useRef<"body" | "cover">("body");

  // The post's own typefaces, loaded into the admin as they're chosen.
  useEffect(() => {
    loadFont(meta.fonts?.heading);
    loadFont(meta.fonts?.body);
  }, [meta.fonts]);

  /* ── Saving ─────────────────────────────────────────────────────────── */

  const payload = useCallback(() => {
    const body=editor?.getMarkdown() ?? server.current.body;
    return {...metaRef.current,body,editorDocument:editor ? {version:1 as const,markdown:body,doc:editor.getJSON() as import("../../../cms/editor-document").EditorNode} : server.current.editorDocument??null};
  }, [editor]);

  const persistCopy = useCallback((base:string,edit:EditCopy) => {
    const immediate=keepRecovery(initial.id,base,edit);
    void journalWrite(initial.id,base,edit);
    return immediate;
  },[initial.id]);
  const removeCopy = useCallback(()=>{clearRecovery(initial.id);void journalClear(initial.id);},[initial.id]);
  useEffect(()=>{editor?.setEditable(recoveryReady&&!recovery);},[editor,recoveryReady,recovery]);

  const flush = useCallback(
    async (snapshot = false): Promise<boolean> => {
      window.clearTimeout(timer.current);
      while (inflight.current) await inflight.current;
      const sent = payload();
      if (recovery || !recoveryReady) return false;
      persistCopy(server.current.updatedAt, sent);
      setSave("saving");
      const run = api
        .save(server.current.id, { ...sent, base: server.current.updatedAt, snapshot })
        .then(({ post, snapshotted }) => {
          announceSave(post.id, post.updatedAt);
          server.current = post;
          setDoc(post);
          setSavedAt(post.updatedAt);
          setSave(JSON.stringify(payload()) === JSON.stringify(sent) ? "saved" : "unsaved");
          if (JSON.stringify(payload()) === JSON.stringify(sent)) removeCopy();
          else persistCopy(post.updatedAt, payload());
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
        });
      inflight.current = run;
      const succeeded = await run;
      if (succeeded && JSON.stringify(payload()) !== JSON.stringify(sent)) return saveRef.current(snapshot);
      return succeeded;
    },
    [payload, recovery, recoveryReady, persistCopy, removeCopy]
  );
  useEffect(() => {
    saveRef.current = flush;
  }, [flush]);

  function scheduleSave() {
    setSave((s) => (s === "offline" || s === "error" ? s : "unsaved"));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), 900);
  }

  useEffect(() => {
    if (!editor || recovery || !recoveryReady) return;
    const persist = () => {
      if (JSON.stringify(payload()) === JSON.stringify({...metaOf(server.current), body:server.current.body,editorDocument:server.current.editorDocument??null})) removeCopy();
      else persistCopy(server.current.updatedAt, payload());
    };
    editor.on("update", persist);
    window.addEventListener("pagehide", persist);
    return () => { editor.off("update", persist); window.removeEventListener("pagehide", persist); };
  }, [editor, payload, recovery, recoveryReady, persistCopy, removeCopy]);

  useEffect(() => registerProtection(async () => {
    if (recovery) return { saved: false, recoverable: true };
    if(!recoveryReady) return {saved:false,recoverable:false};
    persistCopy(server.current.updatedAt, payload());
    const saved = await saveRef.current();
    const durable=await journalFlush(initial.id);
    return { saved, recoverable: saved || durable || keepRecovery(server.current.id, server.current.updatedAt, payload()) };
  }), [payload, recovery, recoveryReady, persistCopy, initial.id]);

  const lastMeta = useRef(meta);
  const applyingRemote = useRef(false);
  useEffect(() => {
    if (lastMeta.current === meta) return;
    lastMeta.current = meta;
    // A change that came from another device is already saved.
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    if (!recovery && recoveryReady) persistCopy(server.current.updatedAt, payload());
    scheduleSave();
  }, [meta, payload, recovery, recoveryReady, persistCopy]);

  /* ── Live: another device saved this post ───────────────────────────── */

  const saveStatus = useRef(save);
  useEffect(() => {
    saveStatus.current = save;
  }, [save]);

  const onPulse = useCallback(
    async (p: Pulse) => {
      if (!editor || recovery || !p.version || p.version === server.current.updatedAt) return;
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
          editor.commands.setContent(editorContent(post) ?? post.body, { contentType: editorContent(post)?"json":"markdown", emitUpdate: false } as never);
          const max = editor.state.doc.content.size;
          editor.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) });
          setWords(countWords(editor.getText()));
        }
        toast.add({ id: "remote-update", type: "info", title: "Updated from another device", timeout: 1800 });
      } catch {
        /* next pulse */
      }
    },
    [editor, recovery]
  );
  usePulse(onPulse, initial.id);

  // Leaving with unsaved words asks first.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (save !== "saved" && !leavingForSignIn) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [save]);

  /* ── Keys and focus mode ────────────────────────────────────────────── */
  useShortcuts({
    save:()=>{void flush(true);},find:()=>openFind.current(),replace:()=>openFind.current(undefined,true),
    palette:()=>window.dispatchEvent(new Event("admin:palette")),details:()=>setPanel(p=>p==="details"?null:"details"),
    preview:()=>setView(v=>v==="edit"?"page":"edit"),publish:()=>setPanel("publish"),
    bold:()=>{editor?.chain().focus().toggleBold().run();},italic:()=>{editor?.chain().focus().toggleItalic().run();},underline:()=>{editor?.chain().focus().toggleUnderline().run();},strike:()=>{editor?.chain().focus().toggleStrike().run();},code:()=>{editor?.chain().focus().toggleCode().run();},undo:()=>{editor?.commands.undo();},redo:()=>{editor?.commands.redo();},
    /* The page title is the H1, so the body's headings are levels 2–4: "Heading 1" is the first of those. */heading1:()=>{editor?.chain().focus().toggleHeading({level:2}).run();},heading2:()=>{editor?.chain().focus().toggleHeading({level:3}).run();},heading3:()=>{editor?.chain().focus().toggleHeading({level:4}).run();},paragraph:()=>{editor?.chain().focus().setParagraph().run();},bullet:()=>{editor?.chain().focus().toggleBulletList().run();},ordered:()=>{editor?.chain().focus().toggleOrderedList().run();},duplicate:()=>{if(editor)duplicateSelection(editor);},moveUp:()=>{if(editor){const b=currentBlock(editor);if(b)moveBlock(editor,b.pos,-1);}},moveDown:()=>{if(editor){const b=currentBlock(editor);if(b)moveBlock(editor,b.pos,1);}},
  },()=>Boolean(editor?.isFocused));

  useEffect(() => {
    // Save, publish, details, preview and find are the customizable layer's
    // (useShortcuts, above); repeating them here kept the old keys working
    // after they were rebound. Only find-and-replace's fixed ⌥⌘F is left.
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.altKey && e.code === "KeyF" && !editor?.isFocused) {
        e.preventDefault();
        openFind.current(undefined, true);
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
    setMeta((m) => ({ ...m, title, slug: !doc.liveSlug && !slugTouched ? suggestSlug(title) : m.slug }));

  const titleRef = useAutosize(meta.title);
  const subtitleShown = showsSubtitle(meta.fonts);
  const dekRef = useAutosize(meta.dek, subtitleShown);
  /** The quiet "Add subtitle" row that stands in for a hidden subtitle. */
  const dekAddRef = useRef<HTMLButtonElement>(null);
  /**
   * Hiding keeps the text: it still serves as the meta description. A hide
   * says so in a toast with Undo, since the field (and its button) is gone.
   * `focus` says where focus goes: the field (or, on a hide, the row that
   * brings it back), the body, or nowhere (from the Details sheet).
   */
  const setSubtitle = (shown: boolean, focus: "field" | "body" | "none" = shown ? "field" : "body") => {
    setMeta((m) => ({ ...m, fonts: withSubtitle(m.fonts, shown) }));
    if (shown) toast.close("subtitle-hidden");
    if (focus === "field") requestAnimationFrame(() => (shown ? dekRef.current : dekAddRef.current)?.focus());
    else if (focus === "body") editor?.commands.focus("start");
    if (shown) return;
    toast.add({
      id: "subtitle-hidden",
      type: "success",
      title: "Subtitle hidden",
      timeout: 5000,
      actionProps: { children: "Undo", onClick: () => setSubtitle(true) },
    });
  };

  const setCover = async (file: File) => {
    const up = await withProgress("Adding cover", (p) => uploadMedia(file, p));
    if (up?.kind !== "image") return;
    // A new picture keeps the cover's style (classic or banner).
    const placeholder = altFromName(file.name);
    setMeta((m) => ({ ...m, cover: withCoverStyle({ src: up.src, width: up.width, height: up.height, alt: m.cover?.alt || placeholder, caption: m.cover?.caption ?? "" }, coverStyle(m.cover)) }));
    void suggestCoverAlt(up.src, placeholder, file.name);
  };
  /**
   * A new cover whose alt is empty or only its file name: ask for a suggestion
   * in the background, and keep it only if the cover and its alt haven't
   * changed meanwhile.
   */
  const suggestCoverAlt = async (src: string, placeholder: string, fileName?: string) => {
    if (!(await altTextAvailable())) return;
    let alt: string;
    try {
      alt = await generateAltText(src, { caption: meta.cover?.caption, fileName });
    } catch {
      return;
    }
    setMeta((m) => (m.cover?.src === src && needsAltText(m.cover.alt, placeholder) ? { ...m, cover: { ...m.cover, alt } } : m));
  };
  /** A cover from the picker: a new picture keeps the cover's style and alt text. */
  const pickCover = (pick: MediaPick) => {
    setMeta((m) => ({ ...m, cover: withCoverStyle({ src: pick.src, width: pick.width, height: pick.height, alt: m.cover?.alt || pick.alt || "", caption: m.cover?.caption ?? "" }, coverStyle(m.cover)) }));
    if (pick.kind === "image" && pick.fileName && !meta.cover?.alt) void suggestCoverAlt(pick.src, pick.alt ?? "", pick.fileName);
  };
  const browseForCover = () => {
    libraryFor.current = "cover";
    setPanel("media");
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

  const liveUrl = doc.liveSlug ? `${SITE}/${doc.kind === "project" ? "projects" : "writing"}/${doc.liveSlug}` : null;
  const toTrash = async () => {
    try {
      await flush();
      await api.remove(doc.id);
      trashToast({ name: meta.title, live: Boolean(doc.liveSlug), restore: () => api.untrash(doc.id) });
      onBack();
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t move it to Trash", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  useCommands((): Command[] => {
    if (!editor) return [];
    const post: Command[] = [
      {id:"page-navigator",group:"Post",title:"Browse pages",icon:<BookOpenText {...CI}/>,keywords:["navigator","tree","pinned","recent","subpage"],run:()=>setNavigatorOpen(true)},
      {id:"research",group:"Post",title:"Research, backlinks and review notes",icon:<BookOpenText {...CI}/>,keywords:["references","peek","template","excerpt","capture","block link"],run:()=>setPanel("research")},
      { id: "publish", group: "Post", title: doc.liveSlug ? "Publish changes…" : "Publish…", keys: "⌘⇧P", icon: <PaperPlaneTilt {...CI} />, keywords: ["schedule", "live", "ship"], run: () => setPanel("publish") },
      { id: "preview", group: "Post", title: "Preview page and share cards", icon: <Eye {...CI} />, keywords: ["og", "social", "twitter", "card", "phone"], run: () => setPanel("preview") },
      { id: "save", group: "Post", title: "Keep a revision", keys: "⌘S", icon: <FloppyDisk {...CI} />, keywords: ["save", "snapshot", "version"], run: () => void flush(true) },
      { id: "history", group: "Post", title: "History", icon: <ClockCounterClockwise {...CI} />, keywords: ["revisions", "versions", "restore", "undo"], run: () => setPanel("revisions") },
      { id: "details", group: "Post", title: "Details", keys: "⌘.", icon: <SlidersHorizontal {...CI} />, keywords: ["slug", "url", "cover", "fonts", "seo", "settings"], run: () => setPanel("details") },
      { id: "media-library", group: "Post", title: "Media library", icon: <ImageSquare {...CI} />, keywords: ["assets", "images", "uploads"], run: () => setPanel("media") },
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
            .catch(() => toast.add({ type: "error", title: "Couldn’t pin it", description: "Try again in a moment." })),
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
            .then(({ post: p }) => toast.add({ type: "success", title: "Duplicated", actionProps: { children: "Open", onClick: () => window.open(`/admin?section=${doc.kind === "project" ? "projects" : "writing"}&post=${p.id}`, "_self") } })),
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
              run: () => void api.unpublish(doc.id).then(({ post: p }) => (adopt(p), toast.add({ type: "success", title: "Unpublished", description: "Leaves the site in about 3 minutes." }))),
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
      { id: "subtitle", group: "View", title: "Show subtitle", icon: <Subtitles {...CI} />, keywords: ["dek", "standfirst", "description", "hide", "toggle"], checked: subtitleShown, run: () => setSubtitle(!subtitleShown) },
    ];
    const edit: Command[] = [
      {id:"shortcut-settings",group:"Edit",title:"Keyboard shortcuts",icon:<SlidersHorizontal {...CI}/>,keywords:["keys","customize","bindings"],run:()=>{window.open("/admin/shortcuts","_blank","noopener");}},
      { id: "find", group: "Edit", title: "Find in this post", keys: "⌘F", icon: <MagnifyingGlass {...CI} />, keywords: ["search"], run: () => openFind.current() },
      { id: "replace", group: "Edit", title: "Find and replace", keys: shortcutLabel("replace"), icon: <Swap {...CI} />, keywords: ["substitute", "change all"], run: () => openFind.current(undefined, true) },
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
    const { from, to, empty } = editor.state.selection;
    const picked = empty || view !== "edit" ? "" : editor.state.doc.textBetween(from, to, " ").trim();
    const short = picked.length > 28 ? `${picked.slice(0, 27)}…` : picked;
    const selection: Command[] = picked
      ? [
          {
            id: "sel:link",
            group: "Selection",
            title: editor.isActive("link") ? "Edit link…" : "Add link…",
            icon: <LinkSimple {...CI} />,
            keywords: ["url", "href", "anchor"],
            run: () => window.setTimeout(() => setLinkRequest((n) => n + 1), 60),
          },
          ...MARKS.map((m) => ({
            id: `sel:${m.id}`,
            group: "Selection" as const,
            title: m.active(editor) ? `Remove ${m.title.toLowerCase()}` : m.title,
            keys: m.keys,
            icon: MARK_ICONS[m.id],
            keywords: ["format", "style", m.id],
            run: () => m.run(editor),
          })),
          { id: "sel:copy-md", group: "Selection", title: "Copy as Markdown", icon: <MarkdownLogo {...CI} />, keywords: ["copy", "md", "clipboard"], run: () => void copy(selectionMarkdown(editor), "Copied as Markdown") },
          { id: "sel:find", group: "Selection", title: `Find “${short}” in this post`, icon: <MagnifyingGlass {...CI} />, keywords: ["search", "occurrences"], run: () => openFind.current(picked) },
          { id: "sel:replace", group: "Selection", title: `Replace “${short}”…`, icon: <Swap {...CI} />, keywords: ["substitute", "change"], run: () => openFind.current(picked, true) },
          { id: "sel:google", group: "Selection", title: `Search Google for “${short}”`, icon: <ArrowSquareOut {...CI} />, keywords: ["web", "look up"], run: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(picked)}`, "_blank", "noopener") },
          { id: "sel:delete", group: "Selection", title: "Delete selection", icon: <Trash {...CI} />, keywords: ["remove", "erase"], run: () => editor.chain().focus().deleteSelection().run() },
        ]
      : [];
    return [...selection, ...post, ...viewCmds, ...edit, ...insert, ...turn];
  });

  const barRef = useRef<HTMLElement>(null);
  const [barOverflow, setBarOverflow] = useState<BarOverflow>({ details: false, extras: false });
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
      <header className="editor-bar" ref={barRef}>
        {/* One tip for the bar's icon buttons: it glides from one to the next (Kobra's navtip). */}
        <GlidingTooltip handle={barTips} side="bottom" />
        {/* The bar folds by its own width (container queries in admin.css), since
            the workspace sidebar takes room the window size doesn't show. In
            order: the status shortens, the save state keeps its glyph, the view
            tabs keep their icons, the secondary buttons move into More. */}
        <div className="editor-bar-side editor-bar-start">
          <button type="button" className="admin-icon-button" onClick={back} aria-label="All writing" title="All writing">
            <ArrowLeft size={16} weight="bold" />
          </button>
          <span className="editor-status" title={statusLabel(doc)}>
            <StatusDot status={doc.status} dirty={doc.dirty} />
            <span className="editor-status-full">{statusLabel(doc)}</span>
            <span className="editor-status-short" aria-hidden="true">{statusShort(doc)}</span>
          </span>
          <SaveState status={save} at={savedAt} local={localState} />
          {doc.parentId ? <a className="editor-parent-link" href={`/admin?section=${doc.kind === "project" ? "projects" : "writing"}&post=${doc.parentId}`} target="_blank" rel="noreferrer">Parent page ↗</a> : null}
          {deploy ? <DeployPill key={deploy.updatedAt} deploy={deploy} onDismiss={() => setDeploy(null)} /> : null}
        </div>
        <div className="editor-bar-side editor-bar-end">
          {/* Kobra's sliding tabs. Markdown is the source as it will be saved
              (PrimeUI's text editor keeps its Markdown a tab away too). */}
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="view-switch">
            <TabsList aria-label="View">
              <TabsTrigger value="edit" title={`Edit  ${keys(shortcutLabel("preview"))}`}>
                <PencilSimple size={14} aria-hidden="true" />
                <span className="view-switch-label">Edit</span>
              </TabsTrigger>
              <TabsTrigger value="page" title={`Read as the page  ${keys(shortcutLabel("preview"))}`}>
                <BookOpenText size={14} aria-hidden="true" />
                <span className="view-switch-label">Page</span>
              </TabsTrigger>
              <TabsTrigger value="markdown" title="The Markdown this post saves as">
                <MarkdownLogo size={14} aria-hidden="true" />
                <span className="view-switch-label">Markdown</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="editor-bar-extra">
            <TooltipTrigger handle={barTips} payload={`Find  ${keys(shortcutLabel("find"))}`} render={<button type="button" className="admin-icon-button" aria-label="Find in this post" onClick={() => openFind.current()} />}>
              <MagnifyingGlass size={16} weight="bold" />
            </TooltipTrigger>
            <SoundToggle className="editor-bar-toggle size-8 rounded-full text-[color:var(--a-ink-2)]" />
            <ThemeToggle className="editor-bar-toggle size-8 rounded-full text-[color:var(--a-ink-2)]" />
            <TooltipTrigger handle={barTips} payload="Research and references" render={<button type="button" className="admin-icon-button" aria-label="Research and references" onClick={() => setPanel("research")} />}>
              <BookOpenText size={16} />
            </TooltipTrigger>
            <TooltipTrigger handle={barTips} payload="History" render={<button type="button" className="admin-icon-button" aria-label="History" onClick={() => setPanel("revisions")} />}>
              <ClockCounterClockwise size={16} weight="bold" />
            </TooltipTrigger>
          </div>
          {/* View settings; also "More" once the bar has folded buttons into it. */}
          <Menu.Root onOpenChange={(open) => { if (open) setBarOverflow(readBarOverflow(barRef.current)); }}>
            <Menu.Trigger className="admin-icon-button editor-bar-more" title="View and more">
              <Eye className="editor-bar-more-wide" size={16} weight="bold" aria-hidden="true" />
              <DotsThree className="editor-bar-more-narrow" size={18} weight="bold" aria-hidden="true" />
              <span className="editor-bar-more-wide sr-only">View</span>
              <span className="editor-bar-more-narrow sr-only">More</span>
            </Menu.Trigger>
            <MenuSurface align="end">
              <BarOverflowItems
                overflow={barOverflow}
                onDetails={() => setPanel("details")}
                onFind={() => openFind.current()}
                onResearch={() => setPanel("research")}
                onHistory={() => setPanel("revisions")}
              />
              <MLabel>View</MLabel>
              <MItem icon={<BookOpenText size={15} />} onSelect={() => setNavigatorOpen(true)}>Browse pages</MItem>
              <MItem onSelect={()=>setPanel("media")}>Media library</MItem>
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
              <MItem icon={subtitleShown ? <Check size={15} weight="bold" /> : <span className="menu-check-space" />} onSelect={() => setSubtitle(!subtitleShown)}>
                Subtitle
              </MItem>
              <MItem icon={<Eye size={15} />} onSelect={() => setPanel("preview")}>
                Preview page and share cards
              </MItem>
              <MItem icon={<span className="menu-check-space" />} keys={keys(shortcutLabel("palette"))} onSelect={() => window.dispatchEvent(new Event("admin:palette"))}>
                Search and actions
              </MItem>
            </MenuSurface>
          </Menu.Root>
          <TooltipTrigger handle={barTips} payload={`Details  ${keys(shortcutLabel("details"))}`} render={<button type="button" className="admin-icon-button editor-bar-details" aria-label="Details" onClick={() => setPanel("details")} />}>
            <SlidersHorizontal size={16} weight="bold" />
          </TooltipTrigger>
          <button
            type="button"
            className="admin-button admin-button-primary editor-bar-publish"
            data-keycap
            onClick={() => setPanel("publish")}
            data-done={live && !doc.dirty ? "" : undefined}
            data-short={publishLabel === "Publish changes" ? "" : undefined}
          >
            {/* Narrow bars say "Publish"; the full label stays the button's name. */}
            <span className="editor-bar-publish-full">{publishLabel}</span>
            {publishLabel === "Publish changes" ? <span className="editor-bar-publish-short" aria-hidden="true">Publish</span> : null}
          </button>
        </div>
      </header>
      <PageLocation id={initial.id} editor={editor} beforeSave={()=>flush()}/>

      {editor ? <FindBar editor={editor} request={view === "edit" ? find : null} onClose={() => setFind(null)} /> : null}

      {view === "page" ? <PageView meta={meta} body={editor?.getMarkdown() ?? doc.body} doc={doc} /> : null}
      {view === "markdown" ? <MarkdownView slug={meta.slug} source={serializePost(draftToPost({ ...doc, ...meta, body: editor?.getMarkdown() ?? doc.body }, doc.updatedAt))} /> : null}

      {meta.cover && coverStyle(meta.cover) === "banner" && view === "edit" ? (
        <EditorBanner cover={meta.cover} onChange={(cover) => setMeta((m) => ({ ...m, cover }))} onPick={pickCover} onBrowseAll={browseForCover} />
      ) : null}
      <main hidden={view !== "edit"} className="page-shell editor-canvas article-shell w-full max-w-[672px]" data-cover={meta.cover && coverStyle(meta.cover) === "banner" ? "banner" : undefined} style={fontVars(meta.fonts) as React.CSSProperties}>
        <article className="article" inert={!recoveryReady||Boolean(recovery)}>
          <header className="article-header">
            <div className="editor-page-tools" data-has-icon={meta.icon ? "" : undefined}>
              <IconPicker icon={meta.icon} onChange={(icon) => setMeta((m) => ({ ...m, icon }))} />
              {!meta.cover ? (
                <CoverPicker
                  trigger={
                    <button type="button" className="admin-chip page-icon-add">
                      <ImageSquare size={14} aria-hidden="true" /> Add cover
                    </button>
                  }
                  onPick={pickCover}
                  onBrowseAll={browseForCover}
                />
              ) : null}
            </div>
            <p className="article-eyebrow">
              <EyebrowDate doc={doc} publishedAt={meta.publishedAt} onDate={(publishedAt) => setMeta((m) => ({ ...m, publishedAt }))} onReschedule={reschedule} />
              {savedAt ? <UpdatedAt at={savedAt}/> : null}
            </p>
            <textarea
              ref={titleRef}
              className="article-title editor-field"
              value={meta.title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (subtitleShown) dekRef.current?.focus();
                  else editor?.commands.focus("start");
                  return;
                }
                // From the end of the title, ArrowDown goes to the subtitle;
                // when it is hidden, Tab does too, to the row that brings it
                // back (the tags sit between them in the tab order).
                const t = e.currentTarget;
                const atEnd = t.selectionStart === t.value.length && t.selectionEnd === t.value.length;
                const down = e.key === "ArrowDown" || (!subtitleShown && e.key === "Tab" && !e.shiftKey);
                if (atEnd && down && !e.altKey && !e.metaKey && !e.ctrlKey) {
                  const next = subtitleShown ? dekRef.current : dekAddRef.current;
                  if (next) {
                    e.preventDefault();
                    next.focus();
                  }
                }
              }}
              placeholder="Title"
              rows={1}
              aria-label="Title"
              autoFocus={!initial.title}
            />
            <TagsInline tags={meta.tags} onChange={(tags) => setMeta((m) => ({ ...m, tags }))} />
            {subtitleShown ? (
              <div className="editor-dek">
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
                <button type="button" className="editor-dek-hide" aria-label="Hide subtitle" title="Hide subtitle" onClick={() => setSubtitle(false, "field")}>
                  <EyeSlash size={15} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button ref={dekAddRef} type="button" className="editor-dek-add" onClick={() => setSubtitle(true)}>
                <Plus size={13} weight="bold" aria-hidden="true" />
                Add subtitle
              </button>
            )}
            <AuthorsEditor authors={meta.authors} minutes={minutes} onChange={(authors) => setMeta((m) => ({ ...m, authors }))} />
          </header>

          {meta.cover && coverStyle(meta.cover) === "classic" ? (
            <figure className="article-cover editor-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.cover.src} alt={meta.cover.alt} width={meta.cover.width} height={meta.cover.height} />
              <CoverActions cover={meta.cover} onChange={(cover) => setMeta((m) => ({ ...m, cover }))} onPick={pickCover} onBrowseAll={browseForCover} />
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
              <AltAssist className="alt-assist-cover" src={meta.cover.src} value={meta.cover.alt} onAlt={(alt) => patchCover({ alt })}
                context={() => ({ caption: meta.cover?.caption })} />
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
              <LinkHover editor={editor} />
              <BlockMarquee editor={editor} />
            </>
          ) : null}
        </article>
      </main>

      <footer className="editor-foot">
        <span>
          {/* The count rolls as you type, digit by digit. */}
          <SlidingNumber value={words} group /> {words === 1 ? "word" : "words"} · <SlidingNumber value={minutes} /> min read
        </span>
        <span className="editor-foot-keys">
          <Kbd size="sm">/</Kbd> blocks <Kbd size="sm">:</Kbd> emoji <Kbd size="sm">{keys(shortcutLabel("palette"))}</Kbd> search and actions <Kbd size="sm">{keys(shortcutLabel("publish"))}</Kbd> publish
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

      <Sheet open={Boolean(recovery)} onClose={() => {}} dismissible={false} title="Restore your unsaved changes?" description="Choose which version to keep editing." variant="center">
        {recoveryCopies.length>1?<AdminSelect label="Recovery copy" value={String(recoveryCopies.indexOf(recovery!))} onValueChange={value=>setRecovery(recoveryCopies[Number(value)])} options={recoveryCopies.map((entry,i)=>({value:String(i),label:`${new Date(entry.at).toLocaleString()} — ${entry.edit.title||"Untitled"}`}))}/>:null}
        <p>A recovery copy is available on this device.{recovery?.base !== initial.updatedAt ? " The server also has a different version. Review both before restoring; restoring changes the draft, not the published page." : " Restore it to continue where you left off."}</p>
        <details><summary>Compare recovery and server text</summary><h3>Recovery</h3><pre className="research-compare">{recovery?.edit.body}</pre><h3>Server</h3><pre className="research-compare">{initial.body}</pre></details>
        <div className="session-actions">
          <button type="button" className="admin-button" onClick={() => { removeCopy();if(recovery?.key) void journalClear(initial.id,recovery.key,recovery.token); setRecovery(null); }}>Use server version</button>
          <button type="button" className="admin-button admin-button-primary" onClick={() => {
            if (!recovery || !editor) return;
            setMeta(metaOf({...initial,...recovery.edit}));
            editor.commands.setContent(editorContent(recovery.edit) ?? recovery.edit.body, {contentType:editorContent(recovery.edit)?"json":"markdown",emitUpdate:false} as never);
            void journalWrite(initial.id,initial.updatedAt,recovery.edit).then(ok=>{if(ok&&recovery.key&&recovery.key!==journalOwnKey(initial.id))void journalClear(initial.id,recovery.key,recovery.token);});
            setWords(countWords(editor.getText()));
            setSave("unsaved"); setRecovery(null); scheduleSave();
          }}>Restore changes</button>
        </div>
      </Sheet>
      <ResearchPanel open={panel==="research"} onClose={()=>setPanel(null)} doc={doc} editor={editor} beforeSave={()=>flush()}/>
      <PageNavigator open={navigatorOpen} onClose={()=>setNavigatorOpen(false)} currentId={initial.id} onOpen={onOpen} beforeNavigate={async()=>recoveryReady&&!recovery&&await flush()} onPinCurrent={async()=>{
        if (!recoveryReady || recovery || !await flush()) throw new Error("Save or recover this page before pinning it.");
        const {post}=await api.save(initial.id,{pinned:!server.current.pinned,base:server.current.updatedAt});adopt(post);
      }}/>
      <CalloutIconPicker />
      <MediaJobs documentId={initial.id} editor={editor} beforeSave={()=>flush()} enabled={recoveryReady&&!recovery}/>
      <ImportReview editor={editor}/>
      {editor ? (
        <MediaPicker
          accept="any"
          title="Add a photo, video or audio"
          open={bodyMedia !== null}
          onOpenChange={(open) => { if (!open) setBodyMedia(null); }}
          anchor={caretAnchor}
          finalFocus={() => editor.view.dom}
          onPick={(pick) => {
            if (bodyMedia === null) return;
            editor.chain().focus().insertContentAt(Math.min(bodyMedia, editor.state.doc.content.size), pickedNode(pick)).run();
            // A fresh upload carries only its file name as alt: ask for a real one.
            if (pick.kind === "image" && pick.fileName) void suggestAltForUpload(editor, pick.src, pick.alt ?? "", pick.fileName);
          }}
          onFiles={(files) => void insertImages.current(files, bodyMedia ?? undefined)}
          onBrowseAll={() => { libraryFor.current = "body"; setPanel("media"); }}
        />
      ) : null}
      <MediaLibrary open={panel==="media"} onClose={()=>{libraryFor.current="body";setPanel(null);}} onInsert={asset=>{
        if(libraryFor.current==="cover"){
          if(!asset.type.startsWith("image/"))return;
          const size=imageInfo(asset.src);
          pickCover({kind:"image",src:asset.src,width:size?.width,height:size?.height,alt:asset.alt??""});
          libraryFor.current="body";setPanel(null);return;
        }
        if(!editor)return;
        editor.chain().focus().insertContent(asset.type.startsWith("image/")?{type:"image",attrs:{src:asset.src,alt:asset.alt??""}}:{type:"media",attrs:{src:asset.src,kind:asset.type.startsWith("video/")?"video":"audio",caption:""}}).run();setPanel(null);
      }}/>

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
        onSubtitle={(shown) => setSubtitle(shown, "none")}
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
              url: `/${doc.kind === "project" ? "projects" : "writing"}/${post.liveSlug}`,
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
  // Set by Reschedule, so closing the picker after it does not throw the new date away.
  const committing = useRef(false);

  if (scheduled) {
    const value = pending ?? new Date(doc.publishAt as string);
    return (
      <DateTimePicker
        value={value}
        min={new Date()}
        onChange={setPending}
        // Closed any way but Reschedule (Escape, a click away, Cancel): the
        // eyebrow goes back to the date that is actually scheduled.
        onOpenChange={(isOpen) => {
          if (!isOpen && !committing.current) setPending(null);
          committing.current = false;
        }}
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
                if (pending) {
                  committing.current = true;
                  void onReschedule(pending).finally(() => setPending(null));
                }
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
      {value ? exactTime(value.toISOString()) : "Set a date"}
    </DateTimePicker>
  );
}

/** The post as the Markdown it saves to: read-only, selectable, copyable. */
function MarkdownView({ source, slug }: { source: string; slug: string }) {
  return (
    <section className="markdown-view page-shell w-full max-w-[672px]" aria-label="Markdown source">
      <header className="markdown-view-head">
        <span>Markdown</span>
        <span className="markdown-view-actions">
          <CopyButton value={source} label="Copy Markdown" copiedLabel="Markdown copied" variant="outline" />
          <DownloadButton source={async () => new Blob([source], { type: "text/markdown;charset=utf-8" })} filename={`${slug || "post"}.md`}>
            Download .md
          </DownloadButton>
        </span>
      </header>
      <pre className="markdown-view-source" tabIndex={0}>
        <code>{source}</code>
      </pre>
    </section>
  );
}

/** While the post loads: the shape of the page it is about to be, shimmering. */
function EditorSkeleton() {
  return (
    <div className="editor-skeleton page-shell w-full max-w-[672px]" aria-busy="true" aria-label="Loading the post">
      <Skeleton className="editor-skeleton-title" />
      <Skeleton className="editor-skeleton-dek" />
      {["96%", "88%", "92%", "70%", "", "94%", "82%"].map((w, i) =>
        w ? <Skeleton key={i} className="editor-skeleton-line" style={{ width: w }} /> : <span key={i} className="editor-skeleton-gap" />,
      )}
    </div>
  );
}
