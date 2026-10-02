"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { At, CalendarBlank, ChartBar, ChartBarHorizontal, FileText, Quotes, Table, Tabs } from "@phosphor-icons/react";

import { DEFAULT_CHART_CSV, newPollId } from "../../../cms/blocks";
import { BLOCKS, inserts, turnInto, type BlockKind } from "./commands";
import { DEFAULT_TABS } from "./extensions/blocks-schema";
import BlockExample from "./BlockExample";
import { filterSlashItems, orderSlashItems, slashGroupOf, type SlashGroup } from "./slash-groups";
import { mountSuggestion, revealOption } from "./suggestion-surface";

/*
 * "/" at the start of a line (or after a space) opens the block menu: type to
 * filter, arrows to move, Enter to insert, Escape to close. Tiptap's
 * Suggestion utility tracks the query and the range; this file only says what
 * the items are and how the list looks.
 *
 * The items are grouped as Notion groups them (Basic blocks, Media, Advanced,
 * Inline; see slash-groups.ts), each with a short line under its title and,
 * on the right, what you'd type to get it without the menu.
 */

export type SlashItem = {
  id: string;
  example?: BlockKind;
  shortcut?: string;
  title: string;
  hint: string;
  keywords: string[];
  icon: React.ReactNode;
  group: SlashGroup;
  run: (editor: Editor, range: Range) => void;
};

/**
 * Remove the "/query", and if the line still has words on it, start a new
 * line: "/heading" at the end of a sentence adds a heading under it rather
 * than turning the sentence into one.
 */
function fresh(e: Editor, r: Range) {
  e.chain().focus().deleteRange(r).run();
  if (e.state.selection.$from.parent.textContent.trim())
    e.chain().splitBlock().run();
}

export function slashItems(
  pickImage: () => void,
  pickEmoji: () => void,
  pickVoice: () => void,
): SlashItem[] {
  return orderSlashItems([
    ...BLOCKS.map(
      (b): SlashItem => ({
        id: b.kind,
        title: b.title,
        hint: b.hint,
        shortcut: b.md,
        example: b.kind,
        keywords: b.keywords,
        icon: b.icon,
        group: slashGroupOf(b.kind),
        run: (e, r) => {
          fresh(e, r);
          turnInto(e, b.kind);
        },
      }),
    ),
    ...inserts(pickImage, pickEmoji, pickVoice).map(
      (i): SlashItem => ({
        id: i.id,
        title: i.title,
        hint: i.hint,
        shortcut: i.md,
        keywords: i.keywords,
        icon: i.icon,
        group: slashGroupOf(i.id),
        run: (e, r) => {
          if (i.id === "inline-logo") e.chain().focus().deleteRange(r).run();
          else fresh(e, r);
          i.run(e);
        },
      }),
    ),
    ...EXTRA_ITEMS,
  ]);
}

/**
 * Inline items type the trigger of a menu that already exists ("@" for
 * mentions and dates, "[[" for a link to another page), which then opens
 * where the "/" was, as if you'd typed it.
 */
const typeTrigger = (trigger: string) => (e: Editor, r: Range) => {
  e.chain().focus().deleteRange(r).insertContent(trigger).run();
};

/* The newer blocks (extensions/blocks-schema.ts and their views). */
const EI = { size: 15 } as const;
const EXTRA_ITEMS: SlashItem[] = [
  {
    id: "code-tabs", group: slashGroupOf("code-tabs"), title: "Code tabs", hint: "npm / pnpm / yarn, or several files",
    keywords: ["code", "tabs", "install", "npm", "pnpm", "yarn", "bun", "files", "snippet"], icon: <Tabs {...EI} />,
    run: (e, r) => { fresh(e, r); e.chain().focus().insertContent({ type: "codeTabs", attrs: { tabs: DEFAULT_TABS } }).run(); },
  },
  {
    id: "data-table", group: slashGroupOf("data-table"), title: "Data table", hint: "Sortable columns, numbers aligned",
    keywords: ["table", "data", "sort", "crm", "grid", "spreadsheet"], icon: <Table {...EI} />,
    run: (e, r) => {
      fresh(e, r);
      e.chain().focus().insertTable({ rows: 4, cols: 3, withHeaderRow: true }).updateAttributes("table", { tableStyle: "data" }).run();
    },
  },
  {
    id: "chart", group: slashGroupOf("chart"), title: "Chart", hint: "Bar, line, area, pie or donut",
    keywords: ["chart", "graph", "plot", "bar", "line", "area", "pie", "donut", "data"], icon: <ChartBar {...EI} />,
    run: (e, r) => { fresh(e, r); e.chain().focus().insertContent({ type: "chart", attrs: { chartType: "bar", title: "", data: DEFAULT_CHART_CSV } }).run(); },
  },
  {
    id: "poll", group: slashGroupOf("poll"), title: "Poll", hint: "Readers vote on one option",
    keywords: ["poll", "vote", "survey", "choice", "question"], icon: <ChartBarHorizontal {...EI} />,
    run: (e, r) => { fresh(e, r); e.chain().focus().insertContent({ type: "poll", attrs: { pollId: newPollId(), question: "", options: ["", ""] } }).run(); },
  },
  {
    id: "citation", group: slashGroupOf("citation"), title: "Citation", hint: "A numbered source, listed at the end",
    keywords: ["cite", "citation", "source", "reference", "footnote"], icon: <Quotes {...EI} />,
    run: (e, r) => { e.chain().focus().deleteRange(r).insertContent({ type: "citation", attrs: { href: "" } }).run(); },
  },
  {
    id: "page-link", group: slashGroupOf("page-link"), title: "Link to page", hint: "Another post or page, by its title", shortcut: "[[",
    keywords: ["page", "link", "subpage", "internal", "post", "wiki"], icon: <FileText {...EI} />,
    run: typeTrigger("[["),
  },
  {
    id: "mention", group: slashGroupOf("mention"), title: "Mention a page", hint: "An inline chip linking to a page", shortcut: "@",
    keywords: ["mention", "page", "at", "person", "link"], icon: <At {...EI} />,
    run: typeTrigger("@"),
  },
  {
    id: "date", group: slashGroupOf("date"), title: "Date or reminder", hint: "Today, tomorrow or any date and time", shortcut: "@",
    keywords: ["date", "time", "today", "tomorrow", "reminder", "when", "day"], icon: <CalendarBlank {...EI} />,
    run: typeTrigger("@"),
  },
];

/** The runs of same-section items in the (already grouped) list, for the headings. */
function sections(items: SlashItem[]) {
  const runs: { group: SlashGroup; start: number; end: number }[] = [];
  items.forEach((item, i) => {
    const last = runs[runs.length - 1];
    if (last && last.group === item.group) last.end = i + 1;
    else runs.push({ group: item.group, start: i, end: i + 1 });
  });
  return runs;
}
const slug = (group: string) => group.toLowerCase().replace(/\W+/g, "-");

type ListProps = SuggestionProps<SlashItem>;
type ListHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

const SlashList = forwardRef<ListHandle, ListProps>(function SlashList(
  { items, command, editor },
  ref,
) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const keyboardSelection = useRef(false);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [items]);
  useEffect(() => {
    const element = editor.view.dom;
    const previousControls = element.getAttribute("aria-controls"),
      previousActive = element.getAttribute("aria-activedescendant");
    const previousAutocomplete = element.getAttribute("aria-autocomplete");
    element.setAttribute("aria-controls", listId);
    // The text field now drives a list of suggestions; say so.
    element.setAttribute("aria-autocomplete", "list");
    if (items[index])
      element.setAttribute("aria-activedescendant", `${listId}-${index}`);
    else element.removeAttribute("aria-activedescendant");
    return () => {
      if (element.getAttribute("aria-controls") !== listId) return;
      if (previousAutocomplete) element.setAttribute("aria-autocomplete", previousAutocomplete);
      else element.removeAttribute("aria-autocomplete");
      if (previousControls)
        element.setAttribute("aria-controls", previousControls);
      else element.removeAttribute("aria-controls");
      if (previousActive)
        element.setAttribute("aria-activedescendant", previousActive);
      else element.removeAttribute("aria-activedescendant");
    };
  }, [editor, index, items, listId]);

  // A new query is a new list: start from the top of it.
  const [shownItems, setShownItems] = useState(items);
  if (items !== shownItems) {
    setShownItems(items);
    setIndex(0);
  }
  useEffect(() => {
    if (keyboardSelection.current) revealOption(listRef.current, index);
    keyboardSelection.current = false;
  }, [index]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      keyboardSelection.current = true;
      if (event.key === "Home" || event.key === "End") {
        setIndex(event.key === "Home" ? 0 : items.length - 1);
        return true;
      }
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
    <div className="slash-menu block-suggestion" data-lenis-prevent>
      <div
        ref={listRef}
        id={listId}
        className="slash-options"
        role="listbox"
        aria-label="Insert block"
      >
        {items.length ? (
          sections(items).map(({ group, start, end }) => (
            <div key={group} role="group" className="slash-section" aria-labelledby={`${listId}-${slug(group)}`}>
              <p className="slash-group" id={`${listId}-${slug(group)}`} role="presentation">{group}</p>
              {items.slice(start, end).map((item, offset) => {
                const i = start + offset;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    id={`${listId}-${i}`}
                    tabIndex={-1}
                    aria-selected={i === index}
                    data-index={i}
                    className="slash-item"
                    onPointerMove={(e) => {
                      if (e.pointerType === "mouse") {
                        keyboardSelection.current = false;
                        setIndex(i);
                      }
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => command(item)}
                  >
                    <span className="slash-icon">{item.icon}</span>
                    <span className="slash-title">
                      {item.title}
                      {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                    </span>
                    <span className="slash-hint">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <p className="slash-empty" role="option" aria-disabled="true" aria-selected="false">No blocks match</p>
        )}
      </div>
      {items[index] ? (
        <aside className="slash-preview" aria-label="Block preview">
          <div>
            <strong>{items[index].title}</strong>
            <p>{items[index].hint}</p>
          </div>
          {items[index].example ? (
            <BlockExample kind={items[index].example} />
          ) : (
            <div
              className="block-example block-example-icon"
              aria-hidden="true"
            >
              {items[index].icon}
            </div>
          )}
          <small>↑ ↓ to browse · Enter to insert · Esc to close</small>
        </aside>
      ) : null}
    </div>
  );
});

export function SlashCommand(getItems: () => SlashItem[]) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem>({
          editor: this.editor,
          char: "/",
          placement: "bottom-start",
          offset: { mainAxis: 8 },
          floatingUi: { strategy: "fixed" },
          pluginKey: new PluginKey("slashCommand"),
          startOfLine: false,
          allowSpaces: false,
          // Only where a block could start: not in code, not mid-word.
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            if ($from.parent.type.name === "codeBlock") return false;
            const before = state.doc.textBetween(
              Math.max(0, range.from - 1),
              range.from,
            );
            return before === "" || /\s/.test(before);
          },
          // Matching items only, best match first; empty sections drop out.
          items: ({ query }) => filterSlashItems(getItems(), query),
          command: ({ editor, range, props }) => props.run(editor, range),
          render: () => {
            let renderer: ReactRenderer<ListHandle, ListProps> | null = null;
            let unmount: (() => void) | undefined;
            const close = () => {
              unmount?.();
              unmount = undefined;
              renderer?.destroy();
              renderer = null;
            };
            return {
              onStart: (props) => {
                renderer = new ReactRenderer(SlashList, {
                  props,
                  editor: props.editor,
                });
                unmount = mountSuggestion(
                  props,
                  renderer.element as HTMLElement,
                );
              },
              onUpdate: (props) => {
                renderer?.updateProps(props);
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  close();
                  return true;
                }
                return renderer?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                close();
              },
            };
          },
        }),
      ];
    },
  });
}
