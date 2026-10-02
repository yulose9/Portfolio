"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { HeadingIconPicker } from "./extensions/heading-icon";
import { flashBlocks } from "./extensions/interaction-highlight";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ImageSquare, Plus } from "@phosphor-icons/react";
import {
  PageOutline,
  afterScroll,
  prefersReducedMotion,
  type OutlineHeading,
} from "../../components/writing/PageOutline";

/*
 * The post's outline, Notion's way: short lines on the right edge that open
 * into the list of headings (components/writing/PageOutline.tsx, shared with
 * the published article). The section on screen is marked, a click jumps to
 * any heading, and each row keeps its icon picker. Wide screens only; it has
 * nothing to say until there are two headings.
 */

type Heading = {
  id: string;
  level: number;
  text: string;
  pos: number;
  size: number;
  icon: string;
};

/** A heading's key in the outline: its block id, or its position without one. */
const keyOf = (h: Heading) => h.id || `at-${h.pos}`;

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
      return {
        heads,
        key: heads
          .map(
            (h) => `${h.id}:${h.level}:${h.text}:${h.pos}:${h.icon}:${h.size}`,
          )
          .join("|"),
      };
    },
    equalityFn: (a, b) => Boolean(b) && a.key === b!.key,
  });

  // The section on screen: the last heading above the top third, as the
  // published article reckons it.
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const win = editor.view.dom.ownerDocument.defaultView;
    if (!win) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (editor.isDestroyed) return;
      let current: Heading | undefined = state.heads[0];
      for (const h of state.heads) {
        const dom = editor.view.nodeDOM(h.pos) as HTMLElement | null;
        if (dom?.getBoundingClientRect && dom.getBoundingClientRect().top < win.innerHeight * 0.3)
          current = h;
      }
      setActive(current ? keyOf(current) : null);
    };
    const scroll = () => {
      if (!frame) frame = win.requestAnimationFrame(update);
    };
    win.addEventListener("scroll", scroll, { capture: true, passive: true });
    win.addEventListener("resize", scroll);
    update();
    return () => {
      win.removeEventListener("scroll", scroll, true);
      win.removeEventListener("resize", scroll);
      win.cancelAnimationFrame(frame);
    };
  }, [editor, state]);

  const headings = useMemo<OutlineHeading[]>(
    () =>
      state.heads.map((h) => ({
        id: keyOf(h),
        text: h.text,
        level: h.level,
        icon: h.icon || undefined,
      })),
    [state],
  );

  const jump = useCallback(
    (id: string) => {
      const h = state.heads.find((x) => keyOf(x) === id);
      if (!h) return;
      editor
        .chain()
        .setTextSelection(h.pos + 1 + h.size)
        .focus(undefined, { scrollIntoView: false })
        .run();
      const dom = editor.view.nodeDOM(h.pos) as HTMLElement | null;
      const win = editor.view.dom.ownerDocument.defaultView;
      if (!dom || !win) return;
      dom.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion(win) ? "auto" : "smooth",
      });
      // Once it lands, a brief wash over the heading and its first block.
      afterScroll(win, () => {
        if (editor.isDestroyed) return;
        const doc = editor.state.doc;
        const node = doc.nodeAt(h.pos);
        if (node?.type.name !== "heading") return;
        const ranges = [{ from: h.pos, to: h.pos + node.nodeSize }];
        const next = doc.nodeAt(h.pos + node.nodeSize);
        if (next && next.type.name !== "heading")
          ranges.push({
            from: h.pos + node.nodeSize,
            to: h.pos + node.nodeSize + next.nodeSize,
          });
        flashBlocks(editor.view, ranges);
      });
    },
    [editor, state],
  );

  const setIcon = (h: Heading, icon: string) => {
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
      tr.insert(pos + 1, editor.schema.nodes.headingIcon.create({ icon }));
    editor.view.dispatch(tr);
  };

  return (
    <PageOutline
      headings={headings}
      activeId={active}
      onJump={jump}
      label="Outline"
      variant="editor"
      renderAction={(item, tabIndex) => {
        const h = state.heads.find((x) => keyOf(x) === item.id);
        if (!h) return null;
        return (
          <HeadingIconPicker value={h.icon} onChange={(icon) => setIcon(h, icon)}>
            <button
              type="button"
              className="outline-icon-edit"
              tabIndex={tabIndex}
              aria-label={`Customize icon for ${h.text}`}
              title={h.icon ? "Change heading icon" : "Add heading icon"}
            >
              {h.icon ? <ImageSquare size={14} /> : <Plus size={14} />}
            </button>
          </HeadingIconPicker>
        );
      }}
    />
  );
});
