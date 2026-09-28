/** Structured editing data stays private. Markdown is the publication checkpoint. */
export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: EditorNode[];
};
export type EditorDocument = { version: 1; markdown: string; doc: EditorNode };
export const BLOCK_ID = /^[a-zA-Z0-9_-]{8,80}$/;
const NODES = new Set([
  "doc",
  "text",
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "image",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "callout",
  "details",
  "detailsSummary",
  "detailsContent",
  "embed",
  "media",
  "mention",
  "inlineLogo",
  "headingIcon",
  "fluentEmoji",
]);
const MARKS = new Set([
  "bold",
  "italic",
  "strike",
  "underline",
  "code",
  "link",
  "highlight",
  "textColor",
]);

export function cleanEditorDocument(
  value: unknown,
  markdown: string,
): EditorDocument | null {
  if (value == null) return null;
  const v = value as EditorDocument;
  if (v.version !== 1 || v.markdown !== markdown || v.doc?.type !== "doc")
    throw new Error(
      "The editor document does not match its Markdown checkpoint.",
    );
  let count = 0;
  const ids = new Set<string>();
  function visit(n: EditorNode, depth: number) {
    if (
      !n ||
      typeof n !== "object" ||
      typeof n.type !== "string" ||
      depth > 40 ||
      ++count > 30000
    )
      throw new Error("Invalid editor document.");
    if (!NODES.has(n.type))
      throw new Error(
        `Unsupported editor node: ${n.type.slice(0, 40)}. Save as Markdown to import it.`,
      );
    if (
      n.attrs !== undefined &&
      (!n.attrs || typeof n.attrs !== "object" || Array.isArray(n.attrs))
    )
      throw new Error("Invalid block attributes.");
    if (
      n.marks !== undefined &&
      (!Array.isArray(n.marks) || n.marks.some((m) => !m || !MARKS.has(m.type)))
    )
      throw new Error("Unsupported text formatting.");
    if (n.text !== undefined && typeof n.text !== "string")
      throw new Error("Invalid editor text.");
    if (n.attrs?.blockId != null) {
      const id = n.attrs.blockId;
      if (typeof id !== "string" || !BLOCK_ID.test(id) || ids.has(id))
        throw new Error("Invalid or duplicate block identity.");
      ids.add(id);
    }
    if (n.content !== undefined) {
      if (!Array.isArray(n.content)) throw new Error("Invalid editor content.");
      n.content.forEach((child) => visit(child, depth + 1));
    }
  }
  visit(v.doc, 0);
  if (JSON.stringify(v).length > 1_200_000)
    throw new Error("The editor document is too large.");
  return { version: 1, markdown, doc: v.doc };
}

export function editorContent(draft: {
  body: string;
  editorDocument?: EditorDocument | null;
}) {
  return draft.editorDocument?.version === 1 &&
    draft.editorDocument.markdown === draft.body
    ? draft.editorDocument.doc
    : null;
}

/** Copies never inherit the source block's identity, including nested children. */
export function copyEditorDocument(
  value: EditorDocument | null | undefined,
): EditorDocument | null {
  if (!value) return null;
  const copy = JSON.parse(JSON.stringify(value)) as EditorDocument;
  const visit = (n: EditorNode) => {
    if (n.attrs?.blockId) n.attrs.blockId = crypto.randomUUID();
    n.content?.forEach(visit);
  };
  visit(copy.doc);
  return copy;
}
