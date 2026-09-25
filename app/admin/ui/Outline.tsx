"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { memo } from "react";

/*
 * Obsidian's outline, in the editor's left margin: the post's headings,
 * the one you're under marked, a click away from any of them. Wide screens
 * only; it has nothing to say until there are two headings.
 */

type Heading = { level: number; text: string; pos: number };

export const Outline = memo(function Outline({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const heads: Heading[] = [];
      e.state.doc.forEach((node, pos) => {
        if (node.type.name === "heading" && node.textContent.trim()) heads.push({ level: node.attrs.level as number, text: node.textContent.trim(), pos });
      });
      const at = e.state.selection.from;
      let active = -1;
      heads.forEach((h, i) => {
        if (h.pos <= at) active = i;
      });
      return { heads, active, key: heads.map((h) => `${h.level}:${h.text}:${h.pos}`).join("|") };
    },
    equalityFn: (a, b) => Boolean(b) && a.key === b!.key && a.active === b!.active,
  });

  if (state.heads.length < 2) return null;
  const top = Math.min(...state.heads.map((h) => h.level));

  const go = (h: Heading) => {
    editor.chain().setTextSelection(h.pos + 1 + h.text.length).focus().run();
    const dom = editor.view.nodeDOM(h.pos) as HTMLElement | null;
    dom?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <nav className="editor-outline" aria-label="Outline">
      <p className="toc-title">Outline</p>
      <ol>
        {state.heads.map((h, i) => (
          <li key={`${h.pos}`} data-depth={h.level - top}>
            <button type="button" data-active={i === state.active || undefined} onClick={() => go(h)}>
              {h.text}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
});
