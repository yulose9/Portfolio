"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { EditorNode } from "../../../cms/editor-document";
import type { SelectionBookmark, Transaction } from "@tiptap/pm/state";
import { FileArrowUp } from "@phosphor-icons/react";
import { Button } from "../../components/kit/button";
import { Checkbox } from "../../components/kit/checkbox";
import { toast } from "../../lib/toast";
import Sheet from "./Sheet";
import {
  DOCUMENT_IMPORT_ACCEPT, DOCUMENT_IMPORT_EVENT, importPreview, insertDocumentImport, readDocumentImportFile,
  type DocumentImport as ImportedDocument, type ImportMetadata,
} from "./document-import";

type Review = {
  document: ImportedDocument;
  filename?: string;
  bookmark?: SelectionBookmark;
  selectionContent?: string;
  replacesSelection?: boolean;
};
const labels = { title: "Title", dek: "Subtitle", tags: "Tags" };
const display = (value: string | string[] | undefined) => Array.isArray(value) ? value.join(", ") : value || "Empty";

export default function DocumentImport({ editor, open, onClose, metadata, onMetadata }: {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
  metadata: ImportMetadata;
  onMetadata: (patch: ImportMetadata) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [review, setReview] = useState<Review | null>(null);
  const [selected, setSelected] = useState<ImportMetadata>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const close = () => {
    request.current++;
    setReview(null);
    setSelected({});
    setError("");
    setLoading(false);
    onClose();
  };
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (!editor) return;
    const receive = (event: Event) => {
      request.current++;
      setLoading(false);
      setError("");
      setSelected({});
      setReview({
        document: (event as CustomEvent<ImportedDocument>).detail,
        bookmark: editor.state.selection.getBookmark(),
        selectionContent: JSON.stringify(editor.state.selection.content().toJSON()),
        replacesSelection: !editor.state.selection.empty,
      });
    };
    const map = ({ transaction }: { transaction: Transaction }) => setReview(value => value?.bookmark
      ? { ...value, bookmark: value.bookmark.map(transaction.mapping) } : value);
    editor.view.dom.addEventListener(DOCUMENT_IMPORT_EVENT, receive);
    editor.on("transaction", map);
    return () => {
      editor.view.dom.removeEventListener(DOCUMENT_IMPORT_EVENT, receive);
      editor.off("transaction", map);
    };
  }, [editor]);

  const chooseFile = async (file: File) => {
    if (!editor?.markdown) return;
    const current = ++request.current;
    setLoading(true);
    setReview(null);
    setSelected({});
    setError("");
    try {
      const document = await readDocumentImportFile(file, text => editor.markdown!.parse(text) as EditorNode);
      if (current === request.current && !editor.isDestroyed) setReview({ document, filename: file.name });
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : "This document could not be read.");
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  return (
    <Sheet open={open || !!review} onClose={close} title={review?.bookmark ? "Review pasted document" : "Import document"}
      description={review?.bookmark ? "Review the content and optional metadata before inserting." : "Markdown, text, or JSON · UTF-8 · up to 1 MB"}
      finalFocus={() => editor && !editor.isDestroyed ? editor.view.dom : false}>
      <div className="space-y-5">
        {!review?.bookmark ? <>
          <p className="text-sm text-[color:var(--a-ink-2)]">Imported content is appended to the end of this page. Existing content and selections are kept.</p>
          <input ref={input} type="file" accept={DOCUMENT_IMPORT_ACCEPT} hidden aria-label="Import document file" onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void chooseFile(file);
          }} />
          <Button variant="outline" loading={loading} disabled={!editor} onClick={() => input.current?.click()}>
            <FileArrowUp size={16} aria-hidden />{review ? "Choose another file" : "Choose file"}
          </Button>
        </> : null}
        {review ? <>
          <div className="space-y-2 text-sm">
            {review.filename ? <p className="break-all font-medium">{review.filename}</p> : null}
            <p>{review.document.content.length} blocks · {review.document.format === "blocks" ? "Editor JSON" : review.document.format === "json" ? "JSON code" : review.document.format === "markdown" ? "Markdown" : "Plain text"}</p>
            {review.bookmark ? <p>{review.replacesSelection ? "This paste will replace the selected content." : "This paste will be inserted at your caret."}</p> : null}
            <p className="text-[color:var(--a-ink-2)]">External media addresses stay external. HTML source is kept as text.</p>
          </div>
          <pre className="import-preview whitespace-pre-wrap break-words" aria-label="Import preview">{importPreview(review.document)}</pre>
          {review.document.frontmatter ? <div className="space-y-3">
            <p className="text-sm text-[color:var(--a-ink-2)]">Frontmatter is excluded from the body. Select any supported metadata to apply; unchecked fields keep their current values.</p>
            {(Object.keys(review.document.metadata) as (keyof ImportMetadata)[]).map(key => <label key={key} className="flex items-start gap-3 text-sm">
              <Checkbox checked={key in selected} onCheckedChange={checked => setSelected(previous => {
                const next = { ...previous };
                if (checked) Object.assign(next, { [key]: review.document.metadata[key] });
                else delete next[key];
                return next;
              })} aria-label={`Import ${labels[key].toLowerCase()}`} />
              <span className="min-w-0 break-words"><strong>{labels[key]}:</strong> {display(review.document.metadata[key])}
                <span className="mt-1 block text-[color:var(--a-ink-2)]">Current: {display(metadata[key])}</span>
              </span>
            </label>)}
          </div> : null}
        </> : null}
        {error ? <p role="alert" className="text-sm text-[color:var(--a-ink)]">{error}</p> : null}
        <div className="research-actions">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          {review ? <Button onClick={() => {
            if (!editor || editor.isDestroyed) return;
            try {
              if (review.bookmark) {
                const selection = review.bookmark.resolve(editor.state.doc);
                if (JSON.stringify(selection.content().toJSON()) !== review.selectionContent) throw new Error("The selected content changed. Cancel and paste again at the intended position.");
                editor.view.dispatch(editor.state.tr.setSelection(selection));
              }
              insertDocumentImport(editor, review.document, !review.bookmark);
              if (Object.keys(selected).length) onMetadata(selected);
              close();
              toast.add({ type: "success", title: review.bookmark ? "Document pasted" : "Document appended", description: "Undo in the editor to remove the inserted content.", timeout: 3000 });
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "This content cannot be inserted here. Choose a different position.");
            }
          }}>{review.bookmark ? "Insert content" : "Append to page"}</Button> : null}
        </div>
      </div>
    </Sheet>
  );
}
