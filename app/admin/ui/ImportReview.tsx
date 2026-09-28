"use client";
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { SelectionBookmark, Transaction } from "@tiptap/pm/state";
import { readClipboard } from "../../../cms/clipboard";
import type { EditorNode } from "../../../cms/editor-document";
import { pasteWritingClipboard } from "./extensions/clipboard";
import Sheet from "./Sheet";
type Review = {
  raw: string;
  bookmark: SelectionBookmark;
  blocks: number;
  preview: string;
  originalText: string;
};
export default function ImportReview({ editor }: { editor: Editor | null }) {
  const [review, setReview] = useState<Review | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!editor) return;
    const receive = (event: Event) => {
      const raw = (event as CustomEvent<string>).detail,
        parsed = readClipboard(raw);
      if (!parsed) return;
      const text = (node: EditorNode): string =>
        node.text ?? node.content?.map(text).join(" ") ?? node.type;
      setError("");
      setReview({
        raw,
        bookmark: editor.state.selection.getBookmark(),
        blocks: parsed.content.length,
        preview: parsed.content.map(text).join("\n\n").slice(0, 4000),
        originalText: editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          "\n",
        ),
      });
    };
    const map = ({ transaction }: { transaction: Transaction }) =>
      setReview((r) =>
        r ? { ...r, bookmark: r.bookmark.map(transaction.mapping) } : r,
      );
    editor.view.dom.addEventListener("writing:review-import", receive);
    editor.on("transaction", map);
    return () => {
      editor.view.dom.removeEventListener("writing:review-import", receive);
      editor.off("transaction", map);
    };
  }, [editor]);
  return (
    <Sheet
      open={!!review}
      onClose={() => setReview(null)}
      title="Review pasted blocks"
      description="Check this larger import before changing the page."
      finalFocus={() => editor && !editor.isDestroyed ? editor.view.dom : false}
    >
      {review ? (
        <>
          <p>
            {review.blocks} top-level blocks. Supported formatting and media
            addresses are retained; copied block identities are regenerated.
            External media URLs remain external.
          </p>
          <pre className="import-preview">{review.preview}</pre>
          {error ? <p role="alert">{error}</p> : null}
          <div className="research-actions">
            <button
              type="button"
              className="admin-button"
              onClick={() => setReview(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-button admin-button-primary"
              onClick={() => {
                if (!editor || editor.isDestroyed) return;
                try {
                  const selection = review.bookmark.resolve(editor.state.doc);
                  if (
                    editor.state.doc.textBetween(
                      selection.from,
                      selection.to,
                      "\n",
                    ) !== review.originalText
                  )
                    throw new Error("Selection changed");
                  editor.view.dispatch(editor.state.tr.setSelection(selection));
                  if (!pasteWritingClipboard(editor.view, review.raw))
                    throw new Error();
                  setReview(null);
                } catch {
                  setError(
                    "This content cannot be inserted at that position. Close the preview and choose a suitable block.",
                  );
                }
              }}
            >
              Insert blocks
            </button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
