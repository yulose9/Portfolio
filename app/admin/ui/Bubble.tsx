"use client";

import {
  Code,
  LinkSimple,
  LinkBreak,
  Quotes,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  CopySimple,
  Trash,
} from "@phosphor-icons/react";
import { isNodeRangeSelection } from "@tiptap/extension-node-range";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { memo, useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker";

/*
 * The selection toolbar. It only appears over selected text (never in code,
 * never over an image — images get their own below), and ⌘K turns it into a
 * link field in place instead of opening a prompt.
 */

function Tool({
  active,
  label,
  shortcut,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="bubble-tool"
      aria-pressed={active}
      aria-label={label}
      title={shortcut ? `${label}  ${shortcut}` : label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/*
 * Props for Tiptap's menus are module constants on purpose. BubbleMenu
 * re-registers its ProseMirror plugin whenever these change identity, and a
 * re-registration rebuilds every plugin view, which closes whatever "/" or ":"
 * menu is open. Inline objects would do that on every keystroke.
 */
const TEXT_OPTIONS = { placement: "top", offset: 10 } as const;
const IMAGE_OPTIONS = { placement: "top", offset: 16 } as const;
const showForText = ({ editor: e, state: s }: { editor: Editor; state: Editor["state"] }) =>
  !s.selection.empty && e.isEditable && (isNodeRangeSelection(s.selection) || (!e.isActive("codeBlock") && !e.isActive("image") && !e.isActive("embed")));
const showForImage = ({ editor: e }: { editor: Editor }) => e.isEditable && e.isActive("image") && !isNodeRangeSelection(e.state.selection);

const mod = typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform) ? "⌘" : "Ctrl ";

export const TextBubble = memo(function TextBubble({ editor, linkRequest }: { editor: Editor; linkRequest: number }) {
  const [editingLink, setEditingLink] = useState(false);
  const [href, setHref] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      quote: e.isActive("blockquote"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      blocks: isNodeRangeSelection(e.state.selection) ? e.state.selection.ranges.length : 0,
    }),
  });

  const startLink = () => {
    setHref(state.href);
    setEditingLink(true);
  };

  // ⌘K from the editor's keymap lands here, as a new request number.
  const [seenRequest, setSeenRequest] = useState(linkRequest);
  if (linkRequest !== seenRequest) {
    setSeenRequest(linkRequest);
    if (!editor.state.selection.empty) {
      setHref(state.href);
      setEditingLink(true);
    }
  }

  useEffect(() => {
    if (editingLink) input.current?.focus();
  }, [editingLink]);

  const applyLink = () => {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!value) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:|\/|#)/.test(value) ? value : `https://${value}` }).run();
    setEditingLink(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      className="bubble"
      options={TEXT_OPTIONS}
      shouldShow={showForText}
    >
      {editingLink ? (
        <form
          className="bubble-link"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <input
            ref={input}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingLink(false);
                editor.commands.focus();
              }
            }}
            placeholder="Paste a link, Enter to apply"
            aria-label="Link address"
          />
          {state.link ? (
            <Tool label="Remove link" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); setEditingLink(false); }}>
              <LinkBreak size={15} />
            </Tool>
          ) : null}
        </form>
      ) : (
        <>
          {state.blocks > 0 ? <span className="bubble-count">{state.blocks} selected</span> : null}
          <Tool label="Bold" shortcut={`${mod}B`} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <TextB size={15} weight="bold" />
          </Tool>
          <Tool label="Italic" shortcut={`${mod}I`} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <TextItalic size={15} weight="bold" />
          </Tool>
          <Tool label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <TextStrikethrough size={15} weight="bold" />
          </Tool>
          <Tool label="Code" shortcut={`${mod}E`} active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code size={15} weight="bold" />
          </Tool>
          <Tool label="Link" shortcut={`${mod}K`} active={state.link} onClick={startLink}>
            <LinkSimple size={15} weight="bold" />
          </Tool>
          <span className="bubble-sep" aria-hidden="true" />
          <ColorPicker editor={editor} />
          <Tool label="Heading 1" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <TextHOne size={15} weight="bold" />
          </Tool>
          <Tool label="Heading 2" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <TextHTwo size={15} weight="bold" />
          </Tool>
          <Tool label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quotes size={15} weight="bold" />
          </Tool>
          {state.blocks > 0 ? <>
            <span className="bubble-sep" aria-hidden="true" />
            <Tool label="Duplicate selected blocks" onClick={() => {
              const { from, to } = editor.state.selection;
              editor.chain().focus().insertContentAt(to, editor.state.doc.slice(from, to).content.toJSON()).run();
            }}><CopySimple size={15} /></Tool>
            <Tool label="Delete selected blocks" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash size={15} /></Tool>
          </> : null}
        </>
      )}
    </BubbleMenu>
  );
});

/** Over a selected image: its alt text and caption, edited where it sits. */
export const ImageBubble = memo(function ImageBubble({ editor }: { editor: Editor }) {
  const attrs = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e.isActive("image") ? (e.getAttributes("image") as { alt?: string; title?: string; src?: string; width?: number; height?: number }) : null,
  });

  const set = (patch: { alt?: string; title?: string; width?: number | null; height?: number | null }) =>
    editor.chain().updateAttributes("image", patch).run();

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubble"
      className="bubble bubble-image"
      options={IMAGE_OPTIONS}
      shouldShow={showForImage}
    >
      {attrs ? (
        <div className="bubble-fields">
          <label>
            <span>Width (px)</span>
            <input type="number" min="64" max="2400" key={attrs.width ?? "auto"} defaultValue={attrs.width ?? ""} placeholder="Automatic"
              onBlur={(event) => {
                const width = Math.round(Number(event.target.value));
                if (!event.target.value) { set({ width: null, height: null }); return; }
                if (width >= 64 && width <= 2400) {
                  const image = editor.view.nodeDOM(editor.state.selection.from);
                  const img = image instanceof HTMLImageElement ? image : image instanceof HTMLElement ? image.querySelector("img") : null;
                  const ratio = attrs.width && attrs.height ? attrs.height / attrs.width : img?.naturalWidth ? img.naturalHeight / img.naturalWidth : null;
                  set({ width, height: ratio ? Math.round(width * ratio) : null });
                } else event.target.value = String(attrs.width ?? "");
              }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
          </label>
          <button type="button" className="admin-button image-reset" onClick={() => set({ width: null, height: null })}>Reset size</button>
          <label>
            <span>Alt text</span>
            <input value={attrs.alt ?? ""} onChange={(e) => set({ alt: e.target.value })} placeholder="What the image shows, for screen readers" />
          </label>
          <label>
            <span>Caption</span>
            <input value={attrs.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Shown under the image (optional)" />
          </label>
        </div>
      ) : null}
    </BubbleMenu>
  );
});
