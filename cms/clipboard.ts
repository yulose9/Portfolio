import {
  cleanEditorDocument,
  copyEditorDocument,
  type EditorNode,
} from "./editor-document";
import { safeInlineUrl } from "./inline";
export const CLIPBOARD_TYPE = "application/x-nazarene-writing+json";
const ATTRS = new Set(
  "blockId level start checked src alt title width height href target rel color font opacity language kind url caption poster loop date time id label icon open colspan rowspan colwidth align tableStyle lineNumbers highlight tabs chartType data pollId question options site snippet captions".split(
    " ",
  ),
);
/** Internal clipboard is still untrusted. Validate bounds/types and strip private/unknown attributes. */
export function readClipboard(
  raw: string,
): { content: EditorNode[]; openStart: number; openEnd: number } | null {
  if (raw.length > 1_200_000) return null;
  try {
    const v = JSON.parse(raw);
    if (
      v.version !== 1 ||
      !Array.isArray(v.content) ||
      !Number.isInteger(v.openStart) ||
      !Number.isInteger(v.openEnd) ||
      v.openStart < 0 ||
      v.openEnd < 0 ||
      v.openStart > 40 ||
      v.openEnd > 40
    )
      return null;
    const doc = cleanEditorDocument(
      { version: 1, markdown: "", doc: { type: "doc", content: v.content } },
      "",
    );
    if (!doc) return null;
    const clean = (n: EditorNode) => {
      if (n.attrs)
        n.attrs = Object.fromEntries(
          Object.entries(n.attrs).filter(([key]) => ATTRS.has(key)),
        );
      for (const attrs of [n.attrs, ...(n.marks ?? []).map((m) => m.attrs)]) {
        if (!attrs) continue;
        for (const key of ["src", "href", "url", "poster"])
          if (attrs[key] != null && !safeInlineUrl(attrs[key], key !== "href"))
            throw new Error("Unsafe clipboard URL");
      }
      n.content?.forEach(clean);
    };
    clean(doc.doc);
    return {
      content: copyEditorDocument(doc)!.doc.content ?? [],
      openStart: v.openStart,
      openEnd: v.openEnd,
    };
  } catch {
    return null;
  }
}
