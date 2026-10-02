"use client";

import { Popover } from "@base-ui/react/popover";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";

import { siteOf } from "../../../../cms/blocks";
import { safeInlineUrl } from "../../../../cms/inline";
import { CitationBase } from "./blocks-schema";

/*
 * An inline citation, in the editor: the numbered pill readers will see.
 * Click it to set the source's link, title, site and a snippet. A new one
 * (from / or ⌘⇧C) opens straight into that form.
 */

function numberOf(editor: NodeViewProps["editor"], pos: number | undefined, href: string): number {
  if (pos === undefined) return 0;
  const seen: string[] = [];
  let n = 0;
  editor.state.doc.descendants((node, at) => {
    if (n) return false;
    if (node.type.name !== "citation") return;
    const key = String(node.attrs.href || `#${at}`);
    if (!seen.includes(key)) seen.push(key);
    if (at === pos) n = seen.indexOf(href || `#${at}`) + 1;
  });
  return n;
}

function CitationView({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) {
  const href = String(node.attrs.href ?? "");
  const [draft, setDraft] = useState({ href, title: String(node.attrs.title ?? ""), site: String(node.attrs.site ?? ""), snippet: String(node.attrs.snippet ?? "") });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!href && editor.isEditable);
  const n = numberOf(editor, typeof getPos === "function" ? getPos() : undefined, href);
  const site = String(node.attrs.site || siteOf(href) || "Source");

  const apply = () => {
    const url = safeInlineUrl(draft.href.trim());
    if (!url || !/^https?:\/\//.test(url)) {
      setError("Enter a full https:// address.");
      return false;
    }
    updateAttributes({ href: url, title: draft.title.trim(), site: draft.site.trim() || siteOf(url), snippet: draft.snippet.trim() });
    setError("");
    return true;
  };

  return (
    <NodeViewWrapper as="span" className="citation-editor" contentEditable={false}>
      <Popover.Root open={open} onOpenChange={(next) => {
        if (!next && !href && !draft.href.trim()) deleteNode();
        setOpen(next);
      }}>
        <Popover.Trigger className="citation" aria-label={`Citation ${n || ""}: ${node.attrs.title || site}. Edit`} title={String(node.attrs.title || site)}>
          {n || "?"}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner">
            <Popover.Popup className="menu-popup admin-popover citation-panel">
              <Popover.Title>Citation</Popover.Title>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (apply()) setOpen(false);
              }}>
                <label>Link<input autoFocus value={draft.href} placeholder="https://" onChange={(e) => setDraft({ ...draft, href: e.target.value })} /></label>
                <label>Title<input value={draft.title} maxLength={200} placeholder="Title of the page" onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                <label>Site<input value={draft.site} maxLength={60} placeholder={siteOf(draft.href) || "Wikipedia"} onChange={(e) => setDraft({ ...draft, site: e.target.value })} /></label>
                <label>Snippet<textarea value={draft.snippet} maxLength={400} rows={3} placeholder="A line from the source (optional)" onChange={(e) => setDraft({ ...draft, snippet: e.target.value })} /></label>
                <p role="status" className="citation-panel-note">{error || "Numbered in order; listed under Sources at the end."}</p>
                <div className="session-actions">
                  <button type="button" className="admin-button" onClick={() => deleteNode()}>Remove</button>
                  <button type="submit" className="admin-button admin-button-primary">Save</button>
                </div>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </NodeViewWrapper>
  );
}

export const CitationNode = CitationBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.chain().focus().insertContent({ type: this.name, attrs: { href: "" } }).run(),
    };
  },
});
