"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { BLOCKS, inserts, turnInto } from "./commands";

/*
 * "/" at the start of a line (or after a space) opens the block menu: type to
 * filter, arrows to move, Enter to insert, Escape to close. Tiptap's
 * Suggestion utility tracks the query and the range; this file only says what
 * the items are and how the list looks.
 */

export type SlashItem = {
  title: string;
  hint: string;
  keywords: string[];
  icon: React.ReactNode;
  group: "Blocks" | "Insert";
  run: (editor: Editor, range: Range) => void;
};

/**
 * Remove the "/query", and if the line still has words on it, start a new
 * line: "/heading" at the end of a sentence adds a heading under it rather
 * than turning the sentence into one.
 */
function fresh(e: Editor, r: Range) {
  e.chain().focus().deleteRange(r).run();
  if (e.state.selection.$from.parent.textContent.trim()) e.chain().splitBlock().run();
}

export function slashItems(pickImage: () => void, pickEmoji: () => void, pickVoice: () => void): SlashItem[] {
  return [
    ...BLOCKS.map((b): SlashItem => ({
      title: b.title,
      hint: b.md || b.hint,
      keywords: b.keywords,
      icon: b.icon,
      group: "Blocks",
      run: (e, r) => {
        fresh(e, r);
        turnInto(e, b.kind);
      },
    })),
    ...inserts(pickImage, pickEmoji, pickVoice).map((i): SlashItem => ({
      title: i.title,
      hint: i.hint,
      keywords: i.keywords,
      icon: i.icon,
      group: "Insert",
      run: (e, r) => {
        fresh(e, r);
        i.run(e);
      },
    })),
  ];
}

type ListProps = SuggestionProps<SlashItem>;
type ListHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

const SlashList = forwardRef<ListHandle, ListProps>(function SlashList({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // A new query is a new list: start from the top of it.
  const [shownItems, setShownItems] = useState(items);
  if (items !== shownItems) {
    setShownItems(items);
    setIndex(0);
  }
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[index]);
        return true;
      }
      return false;
    },
  }));

  return (
    <div ref={listRef} className="slash-menu" role="listbox" aria-label="Insert block">
      {items.length ? (
        items.map((item, i) => (
          <Fragment key={item.title}>
          {i === 0 || items[i - 1].group !== item.group ? <p className="slash-group">{item.group}</p> : null}
          <button
            type="button"
            role="option"
            aria-selected={i === index}
            data-index={i}
            className="slash-item"
            onMouseEnter={() => setIndex(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(item)}
          >
            <span className="slash-icon">{item.icon}</span>
            <span className="slash-title">{item.title}</span>
            <span className="slash-hint">{item.hint}</span>
          </button>
          </Fragment>
        ))
      ) : (
        <p className="slash-empty">No blocks match</p>
      )}
    </div>
  );
});

/** Keep the menu under the caret, flipping above it near the bottom of the window. */
function place(el: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const gap = 8;
  const height = el.offsetHeight || 320;
  const below = rect.bottom + gap + height < window.innerHeight;
  el.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - el.offsetWidth - 12))}px`;
  el.style.top = `${below ? rect.bottom + gap : rect.top - gap - height}px`;
  el.dataset.side = below ? "bottom" : "top";
}

export function SlashCommand(getItems: () => SlashItem[]) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem>({
          editor: this.editor,
          char: "/",
          pluginKey: new PluginKey("slashCommand"),
          startOfLine: false,
          allowSpaces: false,
          // Only where a block could start: not in code, not mid-word.
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            if ($from.parent.type.name === "codeBlock") return false;
            const before = state.doc.textBetween(Math.max(0, range.from - 1), range.from);
            return before === "" || /\s/.test(before);
          },
          items: ({ query }) => {
            const q = query.toLowerCase();
            return getItems().filter((i) => !q || i.title.toLowerCase().includes(q) || i.keywords.some((k) => k.startsWith(q)));
          },
          command: ({ editor, range, props }) => props.run(editor, range),
          render: () => {
            let renderer: ReactRenderer<ListHandle, ListProps> | null = null;
            return {
              onStart: (props) => {
                renderer = new ReactRenderer(SlashList, { props, editor: props.editor });
                const el = renderer.element as HTMLElement;
                el.classList.add("slash-layer");
                document.body.appendChild(el);
                requestAnimationFrame(() => place(el, props.clientRect?.()));
              },
              onUpdate: (props) => {
                renderer?.updateProps(props);
                if (renderer) place(renderer.element as HTMLElement, props.clientRect?.());
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  renderer?.destroy();
                  (renderer?.element as HTMLElement | undefined)?.remove();
                  renderer = null;
                  return true;
                }
                return renderer?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                (renderer?.element as HTMLElement | undefined)?.remove();
                renderer?.destroy();
                renderer = null;
              },
            };
          },
        }),
      ];
    },
  });
}
