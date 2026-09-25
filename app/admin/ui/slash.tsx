"use client";

import {
  CodeBlock,
  ImageSquare,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextHOne,
  TextHTwo,
  TextT,
} from "@phosphor-icons/react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
  run: (editor: Editor, range: Range) => void;
};

/** Set by the editor: opens the file picker and inserts the upload. */
export type PickImage = () => void;

/**
 * Remove the "/query", and if the line still has words on it, start a new
 * line: "/heading" at the end of a sentence adds a heading under it rather
 * than turning the sentence into one.
 */
function fresh(e: Editor, r: Range) {
  e.chain().focus().deleteRange(r).run();
  if (e.state.selection.$from.parent.textContent.trim()) e.chain().splitBlock().run();
  return e.chain().focus();
}

export function slashItems(pickImage: PickImage): SlashItem[] {
  const I = { size: 16, "aria-hidden": true } as const;
  return [
    { title: "Text", hint: "Plain paragraph", keywords: ["paragraph", "p"], icon: <TextT {...I} />, run: (e, r) => fresh(e, r).setParagraph().run() },
    { title: "Heading", hint: "Section title", keywords: ["h2", "title", "section"], icon: <TextHOne {...I} />, run: (e, r) => fresh(e, r).setHeading({ level: 2 }).run() },
    { title: "Subheading", hint: "Smaller title", keywords: ["h3"], icon: <TextHTwo {...I} />, run: (e, r) => fresh(e, r).setHeading({ level: 3 }).run() },
    { title: "Bulleted list", hint: "- item", keywords: ["ul", "unordered", "bullet"], icon: <ListBullets {...I} />, run: (e, r) => fresh(e, r).toggleBulletList().run() },
    { title: "Numbered list", hint: "1. item", keywords: ["ol", "ordered"], icon: <ListNumbers {...I} />, run: (e, r) => fresh(e, r).toggleOrderedList().run() },
    { title: "Quote", hint: "> pull a line out", keywords: ["blockquote", "cite"], icon: <Quotes {...I} />, run: (e, r) => fresh(e, r).toggleBlockquote().run() },
    { title: "Code", hint: "``` block", keywords: ["code", "snippet", "pre"], icon: <CodeBlock {...I} />, run: (e, r) => fresh(e, r).toggleCodeBlock().run() },
    {
      title: "Image",
      hint: "Upload, or paste one",
      keywords: ["picture", "photo", "figure", "img"],
      icon: <ImageSquare {...I} />,
      run: (e, r) => {
        fresh(e, r).run();
        pickImage();
      },
    },
    { title: "Divider", hint: "---", keywords: ["hr", "rule", "separator"], icon: <Minus {...I} />, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
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
          <button
            key={item.title}
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
