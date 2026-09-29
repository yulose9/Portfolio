"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { HeadingIconPicker, HeadingGlyph } from "./extensions/heading-icon";
import { memo } from "react";
import { ImageSquare, Plus } from "@phosphor-icons/react";

/*
 * Obsidian's outline, in the editor's left margin: the post's headings,
 * the one you're under marked, a click away from any of them. Wide screens
 * only; it has nothing to say until there are two headings.
 */

type Heading = {
  id: string;
  level: number;
  text: string;
  pos: number;
  size: number;
  icon: string;
};

export const Outline = memo(function Outline({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const heads: Heading[] = [];
      e.state.doc.forEach((node, pos) => {
        if (node.type.name === "heading" && node.textContent.trim())
          heads.push({
            id: String(node.attrs.blockId || ""),
            level: node.attrs.level as number,
            text: node.textContent.trim(),
            pos,
            size: node.content.size,
            icon:
              node.firstChild?.type.name === "headingIcon"
                ? String(node.firstChild.attrs.icon)
                : "",
          });
      });
      const at = e.state.selection.from;
      let active = -1;
      heads.forEach((h, i) => {
        if (h.pos <= at) active = i;
      });
      return {
        heads,
        active,
        key: heads
          .map(
            (h) => `${h.id}:${h.level}:${h.text}:${h.pos}:${h.icon}:${h.size}`,
          )
          .join("|"),
      };
    },
    equalityFn: (a, b) =>
      Boolean(b) && a.key === b!.key && a.active === b!.active,
  });

  if (state.heads.length < 2) return null;
  const top = Math.min(...state.heads.map((h) => h.level));

  const go = (h: Heading) => {
    editor
      .chain()
      .setTextSelection(h.pos + 1 + h.size)
      .focus()
      .run();
    const dom = editor.view.nodeDOM(h.pos) as HTMLElement | null;
    dom?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <nav className="editor-outline" aria-label="Outline">
      <p className="toc-title">Outline</p>
      <ol>
        {state.heads.map((h, i) => (
          <li key={h.id || `${h.pos}`} data-depth={h.level - top}>
            <button
              type="button"
              data-active={i === state.active || undefined}
              onClick={() => go(h)}
            >
              {h.icon ? <HeadingGlyph value={h.icon} /> : null}
              {h.text}
            </button>
            <HeadingIconPicker
              value={h.icon}
              onChange={(icon) => {
                let pos = h.pos;
                if (h.id) {
                  pos = -1;
                  editor.state.doc.forEach((node, at) => {
                    if (node.attrs.blockId === h.id) pos = at;
                  });
                }
                if (pos < 0) return;
                const node = editor.state.doc.nodeAt(pos);
                if (!node || node.type.name !== "heading") return;
                const tr = editor.state.tr;
                const first = node.firstChild;
                if (first?.type.name === "headingIcon") {
                  if (icon) tr.setNodeMarkup(pos + 1, undefined, { icon });
                  else tr.delete(pos + 1, pos + 1 + first.nodeSize);
                } else if (icon)
                  tr.insert(
                    pos + 1,
                    editor.schema.nodes.headingIcon.create({ icon }),
                  );
                editor.view.dispatch(tr);
              }}
            >
              <button
                type="button"
                className="outline-icon-edit"
                aria-label={`Customize icon for ${h.text}`}
                title={h.icon ? "Change heading icon" : "Add heading icon"}
              >
                {h.icon ? <ImageSquare size={14} /> : <Plus size={14} />}
              </button>
            </HeadingIconPicker>
          </li>
        ))}
      </ol>
    </nav>
  );
});
