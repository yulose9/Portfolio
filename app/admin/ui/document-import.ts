import type { Editor } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { readClipboard } from "../../../cms/clipboard";
import type { EditorNode } from "../../../cms/editor-document";
import { looksLikeMarkdown, proseToParagraphs } from "./paste";

export const DOCUMENT_IMPORT_ACCEPT = ".md,.markdown,.txt,.json";
export const DOCUMENT_IMPORT_MAX_BYTES = 1_000_000;
export const DOCUMENT_IMPORT_EVENT = "writing:review-document-import";
export type ImportFormat = "auto" | "markdown" | "text" | "json";
export type ImportMetadata = { title?: string; dek?: string; tags?: string[] };
export type DocumentImport = {
  content: EditorNode[];
  openStart: number;
  openEnd: number;
  format: Exclude<ImportFormat, "auto"> | "blocks";
  metadata: ImportMetadata;
  frontmatter: boolean;
};

const markdownTree = unified().use(remarkParse).use(remarkGfm);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function checkImportSize(source: string) {
  if (source.length > DOCUMENT_IMPORT_MAX_BYTES || new TextEncoder().encode(source).length > DOCUMENT_IMPORT_MAX_BYTES)
    throw new Error("Choose a document smaller than 1 MB.");
  if (source.includes("\0")) throw new Error("This file contains binary data. Choose a UTF-8 text document.");
}

/** Bound every JSON value, including attributes, before recursive schema validation. */
function checkTree(value: unknown) {
  const stack = [{ value, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    if (++count > 60_000 || entry.depth > 100) throw new Error("This document is too complex to import.");
    if (entry.value && typeof entry.value === "object") {
      for (const [key, child] of Object.entries(entry.value)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("This document contains unsafe attributes.");
        stack.push({ value: child, depth: entry.depth + 1 });
      }
    }
  }
}

function safeMetadata(values: Record<string, unknown>): ImportMetadata {
  const result: ImportMetadata = {};
  for (const [key, limit] of [["title", 300], ["dek", 600]] as const) {
    const value = values[key];
    if (typeof value === "string" && value.trim() && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value)) result[key] = value;
  }
  if (Array.isArray(values.tags) && values.tags.length <= 8 && values.tags.every(t => typeof t === "string" && t.trim() && t.length <= 80 && !/[\u0000-\u001f\u007f]/.test(t)))
    result.tags = [...new Set(values.tags as string[])];
  return result;
}

/** The site's export is a mapping of JSON values, not executable/general YAML. */
export function splitImportFrontmatter(source: string) {
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(source);
  if (!match) return { body: source, metadata: {}, frontmatter: false };
  const lines = match[1].split("\n");
  // Do not mistake a pair of thematic breaks around ordinary prose for metadata.
  if (!lines.some(line => /^[\w-]+\s*:/.test(line)) || lines.some(line => line.trim() && !/^(?:[\w-]+\s*:|\s|#)/.test(line)))
    return { body: source, metadata: {}, frontmatter: false };
  const values: Record<string, unknown> = Object.create(null);
  for (const line of lines) {
    const field = /^(title|dek|tags):\s*(.*)$/.exec(line);
    if (!field) continue;
    try { values[field[1]] = JSON.parse(field[2]); }
    catch {
      // Simple YAML scalars are useful, but aliases, tags and folded values are not evaluated.
      if (field[1] !== "tags" && field[2] && !/^[!&*>|\[{'"]/.test(field[2])) values[field[1]] = field[2];
    }
  }
  return { body: source.slice(match[0].length), metadata: safeMetadata(values), frontmatter: true };
}

/** Escape only actual HTML tokens; fenced/inline code and autolinks keep their syntax. */
export function literalHtmlMarkdown(source: string): string {
  const tree = markdownTree.parse(source);
  const ranges: { start: number; end: number }[] = [];
  const stack: { node: typeof tree | typeof tree.children[number]; depth: number }[] = [{ node: tree, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (++count > 30_000 || depth > 40) throw new Error("This Markdown is too complex to import.");
    if (node.type === "html" && node.position) ranges.push({ start: node.position.start.offset!, end: node.position.end.offset! });
    if ("children" in node) for (const child of node.children) stack.push({ node: child as typeof tree.children[number], depth: depth + 1 });
  }
  for (const { start, end } of ranges.sort((a, b) => b.start - a.start)) {
    const literal = source.slice(start, end).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    source = source.slice(0, start) + literal + source.slice(end);
  }
  return source;
}

function validatedBlocks(value: unknown) {
  checkTree(value);
  const clean = readClipboard(JSON.stringify(value));
  if (!clean) throw new Error("This document contains unsupported blocks, unsafe links, or invalid formatting.");
  const visit = (node: EditorNode) => {
    for (const mark of node.marks ?? []) if (mark.attrs !== undefined && !object(mark.attrs)) throw new Error("Invalid text formatting.");
    node.content?.forEach(visit);
  };
  clean.content.forEach(visit);
  return clean;
}

export function prepareDocumentImport(source: string, format: ImportFormat, parseMarkdown: (source: string) => EditorNode): DocumentImport {
  checkImportSize(source);
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!text.trim()) throw new Error("This document is empty.");
  const base = { metadata: {} as ImportMetadata, frontmatter: false, openStart: 0, openEnd: 0 };
  if (format === "json" || (format === "auto" && /^[\[{]/.test(text.trim()))) {
    let value: unknown;
    let parsed = false;
    try { value = JSON.parse(text); parsed = true; }
    catch { if (format === "json") throw new Error("This JSON file is not valid JSON."); }
    if (parsed) {
      checkTree(value);
      if (object(value)) {
        let envelope: unknown;
        if (value.type === "doc") envelope = { version: 1, content: value.content, openStart: 0, openEnd: 0 };
        else if ("version" in value && ("doc" in value || "content" in value)) {
          if ("doc" in value) {
            if (value.version !== 1 || !object(value.doc) || value.doc.type !== "doc") throw new Error("Unsupported editor document format.");
            envelope = { version: 1, content: value.doc.content, openStart: 0, openEnd: 0 };
          } else envelope = value;
        }
        if (envelope) return { ...base, ...validatedBlocks(envelope), format: "blocks" };
      }
      const pretty = JSON.stringify(value, null, 2);
      checkImportSize(pretty);
      return { ...base, format: "json", content: [{ type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: pretty }] }] };
    }
  }
  const front = format === "text" ? { body: text, metadata: {}, frontmatter: false } : splitImportFrontmatter(text);
  const useMarkdown = format === "markdown" || (format === "auto" && (front.frontmatter || looksLikeMarkdown(text)));
  const content = useMarkdown
    ? parseMarkdown(literalHtmlMarkdown(front.body)).content ?? []
    : proseToParagraphs(text).map(p => ({ type: "paragraph", content: [{ type: "text", text: p }] }));
  if (!content.length) throw new Error("This document has no body content to import.");
  return { ...base, ...validatedBlocks({ version: 1, content, openStart: 0, openEnd: 0 }), metadata: front.metadata, frontmatter: front.frontmatter, format: useMarkdown ? "markdown" : "text" };
}

export async function readDocumentImportFile(file: Pick<File, "name" | "size" | "arrayBuffer">, parseMarkdown: (source: string) => EditorNode) {
  const extension = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase();
  if (!extension || !["md", "markdown", "txt", "json"].includes(extension)) throw new Error("Choose a .md, .markdown, .txt, or .json file.");
  if (file.size > DOCUMENT_IMPORT_MAX_BYTES) throw new Error("Choose a document smaller than 1 MB.");
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > DOCUMENT_IMPORT_MAX_BYTES) throw new Error("Choose a document smaller than 1 MB.");
  let source: string;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { throw new Error("Save this document as UTF-8 text before importing it."); }
  return prepareDocumentImport(source, extension === "json" ? "json" : extension === "txt" ? "text" : "markdown", parseMarkdown);
}

/** JSON-only insertion. Files append to the current document, even if a selection exists. */
export function insertDocumentImport(editor: Editor, document: DocumentImport, append = false) {
  const slice = Slice.fromJSON(editor.state.schema, document);
  slice.content.forEach(node => node.check());
  let tr = editor.state.tr;
  if (append) {
    // A copied open slice must become complete, valid top-level blocks when appended.
    const nodes = Fragment.fromArray(document.content.map(node => editor.state.schema.nodeFromJSON(node)));
    editor.state.schema.node("doc", null, nodes).check();
    tr = tr.insert(tr.doc.content.size, nodes);
    tr = tr.setSelection(Selection.atEnd(tr.doc));
  } else tr = tr.replaceSelection(slice);
  tr.doc.check();
  editor.view.dispatch(tr.scrollIntoView());
}

export function importPreview(document: DocumentImport) {
  const text = (node: EditorNode): string => node.text ?? node.content?.map(text).join(" ") ?? `[${node.type}]`;
  return document.content.map(text).join("\n\n").slice(0, 4000);
}

/** Shared by keyboard paste and the context menu; text never enters an HTML API. */
export function pasteDocumentText(editor: Editor, source: string, format: ImportFormat = "auto") {
  checkImportSize(source);
  if (!source.trim()) return;
  if (editor.isActive("codeBlock")) {
    editor.view.dispatch(editor.state.tr.insertText(source).scrollIntoView());
    return;
  }
  if (!editor.markdown) throw new Error("The Markdown editor is still loading.");
  const document = prepareDocumentImport(source, format, text => editor.markdown!.parse(text) as EditorNode);
  if (document.content.length > 12 || document.frontmatter) {
    editor.view.dom.dispatchEvent(new CustomEvent(DOCUMENT_IMPORT_EVENT, { detail: document }));
  } else insertDocumentImport(editor, document);
}
