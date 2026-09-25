"use client";

import {
  CaretCircleRight,
  CheckSquare,
  Code,
  CodeBlock,
  Info,
  ImageSquare,
  LinkSimple,
  Microphone,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  Smiley,
  Table,
  TextHOne,
  TextHThree,
  TextHTwo,
  TextT,
  XLogo,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";

/*
 * The editor's verbs, defined once. The slash menu, the right-click menu, the
 * block handle's menu and the phone toolbar all read from here, so "Callout"
 * means the same thing and has the same icon wherever it's offered.
 */

const I = { size: 16, "aria-hidden": true } as const;

export type BlockKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "ordered"
  | "todo"
  | "quote"
  | "callout"
  | "toggle"
  | "code";

export type BlockDef = { kind: BlockKind; title: string; hint: string; md: string; keywords: string[]; icon: React.ReactNode };

/** Blocks a line can be turned into. Headings 1–3 are h2–h4 on the page: h1 is the title. */
export const BLOCKS: BlockDef[] = [
  { kind: "paragraph", title: "Text", hint: "Plain paragraph", md: "", keywords: ["paragraph", "p", "plain"], icon: <TextT {...I} /> },
  { kind: "h1", title: "Heading 1", hint: "Section", md: "#", keywords: ["h1", "title", "section", "heading"], icon: <TextHOne {...I} /> },
  { kind: "h2", title: "Heading 2", hint: "Subsection", md: "##", keywords: ["h2", "subheading", "heading"], icon: <TextHTwo {...I} /> },
  { kind: "h3", title: "Heading 3", hint: "Small heading", md: "###", keywords: ["h3", "heading"], icon: <TextHThree {...I} /> },
  { kind: "bullet", title: "Bulleted list", hint: "Simple list", md: "-", keywords: ["ul", "unordered", "bullet", "list"], icon: <ListBullets {...I} /> },
  { kind: "ordered", title: "Numbered list", hint: "Steps in order", md: "1.", keywords: ["ol", "ordered", "number", "list"], icon: <ListNumbers {...I} /> },
  { kind: "todo", title: "To-do list", hint: "Track tasks", md: "[]", keywords: ["todo", "task", "checkbox", "check"], icon: <CheckSquare {...I} /> },
  { kind: "toggle", title: "Toggle", hint: "Hide content inside", md: ">", keywords: ["toggle", "details", "collapse", "accordion"], icon: <CaretCircleRight {...I} /> },
  { kind: "quote", title: "Quote", hint: "Pull a line out", md: '"', keywords: ["blockquote", "cite", "quote"], icon: <Quotes {...I} /> },
  { kind: "callout", title: "Callout", hint: "Make it stand out", md: "", keywords: ["callout", "note", "tip", "warning", "alert", "info"], icon: <Info {...I} /> },
  { kind: "code", title: "Code", hint: "Code block", md: "```", keywords: ["code", "snippet", "pre"], icon: <CodeBlock {...I} /> },
];

const HEADING_LEVEL = { h1: 2, h2: 3, h3: 4 } as const;

/** Turn the current block into `kind`, unwrapping whatever it was first. */
export function turnInto(editor: Editor, kind: BlockKind) {
  const chain = editor.chain().focus();
  switch (kind) {
    case "paragraph":
      return chain.clearNodes().setParagraph().run();
    case "h1":
    case "h2":
    case "h3":
      return chain.clearNodes().setHeading({ level: HEADING_LEVEL[kind] }).run();
    case "bullet":
      return chain.clearNodes().toggleBulletList().run();
    case "ordered":
      return chain.clearNodes().toggleOrderedList().run();
    case "todo":
      return chain.clearNodes().toggleTaskList().run();
    case "quote":
      return chain.clearNodes().toggleBlockquote().run();
    case "callout":
      return chain.clearNodes().setCallout("note").run();
    case "toggle":
      return chain.clearNodes().setDetails().run();
    case "code":
      return chain.clearNodes().toggleCodeBlock().run();
  }
}

export function activeBlock(editor: Editor): BlockKind {
  if (editor.isActive("codeBlock")) return "code";
  if (editor.isActive("taskList")) return "todo";
  if (editor.isActive("bulletList")) return "bullet";
  if (editor.isActive("orderedList")) return "ordered";
  if (editor.isActive("callout")) return "callout";
  if (editor.isActive("details")) return "toggle";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("heading", { level: 2 })) return "h1";
  if (editor.isActive("heading", { level: 3 })) return "h2";
  if (editor.isActive("heading", { level: 4 })) return "h3";
  return "paragraph";
}

export type InsertDef = { id: string; title: string; hint: string; keywords: string[]; icon: React.ReactNode; run: (editor: Editor) => void };

/** Things that are inserted rather than turned into. `pickImage` and `pickEmoji` come from the editor. */
export function inserts(pickImage: () => void, pickEmoji?: () => void, pickVoice?: () => void): InsertDef[] {
  return [
    {
      id: "image",
      title: "Photo, video or audio",
      hint: "HEIC, GIF, MP4… compressed for you",
      keywords: ["picture", "photo", "figure", "img", "upload", "video", "gif", "audio", "heic", "movie", "media"],
      icon: <ImageSquare {...I} />,
      run: () => pickImage(),
    },
    ...(pickVoice
      ? [{ id: "voice", title: "Voice note", hint: "Record from the microphone", keywords: ["voice", "record", "audio", "mic", "memo", "podcast"], icon: <Microphone {...I} />, run: () => pickVoice() }]
      : []),
    {
      id: "table",
      title: "Table",
      hint: "Rows and columns",
      keywords: ["table", "grid", "rows", "columns"],
      icon: <Table {...I} />,
      run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: "embed",
      title: "Embed",
      hint: "X, Threads or YouTube",
      keywords: ["embed", "tweet", "twitter", "x", "threads", "youtube", "video"],
      icon: <XLogo {...I} />,
      run: (e) => e.chain().focus().setEmbed("").run(),
    },
    { id: "divider", title: "Divider", hint: "---", keywords: ["hr", "rule", "separator", "divider", "line"], icon: <Minus {...I} />, run: (e) => e.chain().focus().setHorizontalRule().run() },
    ...(pickEmoji ? [{ id: "emoji", title: "Emoji", hint: "Fluent 3D", keywords: ["emoji", "icon", "smiley"], icon: <Smiley {...I} />, run: () => pickEmoji() }] : []),
  ];
}

export const MARKS = [
  { id: "bold", title: "Bold", keys: "⌘B", run: (e: Editor) => e.chain().focus().toggleBold().run(), active: (e: Editor) => e.isActive("bold") },
  { id: "italic", title: "Italic", keys: "⌘I", run: (e: Editor) => e.chain().focus().toggleItalic().run(), active: (e: Editor) => e.isActive("italic") },
  { id: "underline", title: "Underline", keys: "⌘U", run: (e: Editor) => e.chain().focus().toggleUnderline().run(), active: (e: Editor) => e.isActive("underline") },
  { id: "strike", title: "Strikethrough", keys: "⌘⇧S", run: (e: Editor) => e.chain().focus().toggleStrike().run(), active: (e: Editor) => e.isActive("strike") },
  { id: "highlight", title: "Highlight", keys: "⌘⇧H", run: (e: Editor) => e.chain().focus().toggleHighlight().run(), active: (e: Editor) => e.isActive("highlight") },
  { id: "code", title: "Inline code", keys: "⌘E", run: (e: Editor) => e.chain().focus().toggleCode().run(), active: (e: Editor) => e.isActive("code") },
] as const;

export const ICONS = { link: <LinkSimple {...I} />, code: <Code {...I} /> };

/** The top-level block around the selection: its position and node. */
export function currentBlock(editor: Editor) {
  const { $from } = editor.state.selection;
  if ($from.depth === 0) return null;
  const pos = $from.before(1);
  const node = editor.state.doc.nodeAt(pos);
  return node ? { pos, node } : null;
}

export function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
}

export function deleteBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
}

export function moveBlock(editor: Editor, pos: number, direction: -1 | 1) {
  const { doc } = editor.state;
  const node = doc.nodeAt(pos);
  if (!node) return;
  const $pos = doc.resolve(pos);
  const index = $pos.index(0);
  const target = index + direction;
  if (target < 0 || target >= doc.childCount) return;
  const sibling = doc.child(target);
  const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
  const insertAt = direction === 1 ? pos + sibling.nodeSize : pos - sibling.nodeSize;
  tr.insert(insertAt, node);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}

/** The selection as Markdown, via Tiptap's own serializer. */
export function selectionMarkdown(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  const doc = empty ? editor.state.doc : editor.state.doc.cut(from, to);
  const manager = (editor as unknown as { markdown?: { serialize: (json: unknown) => string } }).markdown;
  return manager ? manager.serialize(doc.toJSON()) : editor.state.doc.textBetween(from, to, "\n\n");
}

/**
 * ⌘A the Notion way: the first press selects the text of the block you're
 * in; pressed again (or in an empty block), everything. Returns false to let
 * the editor's own select-all run.
 */
export function selectBlock(editor: Editor): boolean {
  const { selection } = editor.state;
  const { $from } = selection;
  // Inside a code block or a heading or a paragraph: that textblock.
  const from = $from.start();
  const to = $from.end();
  if (from === to || !$from.sameParent(selection.$to)) return false;
  if (selection.from <= from && selection.to >= to) return false;
  editor.chain().focus().setTextSelection({ from, to }).run();
  return true;
}
