"use client";
import { Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  ReactRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { Popover } from "@base-ui/react/popover";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CalendarBlank,
  FileText,
  Plus,
  ArrowLeft,
} from "@phosphor-icons/react";
import { mountSuggestion, revealOption } from "../suggestion-surface";
import {
  dateHref,
  fullMentionDate,
  pageMentionId,
  parseDateHref,
  parseDateQuery,
  todayDate,
  validDate,
  validTime,
  type MentionDate,
} from "../../../../cms/mentions";
import { DayTimeFields, type DayPreset } from "../DayTimeFields";
import { addDays } from "../clock";
import DateMention from "../../../components/writing/DateMention";
import { toast } from "../../../lib/toast";
import { api, adminPageHref, type PostSummary } from "../api";
import { forgetLinkTargets } from "./links";

type Attrs =
  | { kind: "date"; date: string; time: string | null }
  | { kind: "page"; id: string; label: string };
function fromHref(href: string, label = "Page"): Attrs | null {
  const date = parseDateHref(href);
  if (date) return { kind: "date", ...date };
  const id = pageMentionId(href);
  return id ? { kind: "page", id, label: label.replace(/^@/, "") } : null;
}
/** Date mentions are Manila wall time; the quick picks count from Manila's today. */
const MENTION_ZONE_NOTE = "Manila time (UTC+8)";
function mentionPresets(): DayPreset[] {
  const today = todayDate();
  return [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "Next week", date: addDays(today, 7) },
    { label: "Last Monday", date: parseDateQuery("last monday")!.date },
  ];
}
const sameDate = (a: MentionDate, b: MentionDate) =>
  a.date === b.date && a.time === b.time;
const usableDate = (value: MentionDate) =>
  validDate(value.date) && (!value.time || validTime(value.time));

function DateEditor({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const value = {
    date: String(node.attrs.date),
    time: node.attrs.time as string | null,
  };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MentionDate>(value);
  const popup = useRef<HTMLDivElement>(null);
  if (!validDate(value.date))
    return <NodeViewWrapper as="span">Invalid date</NodeViewWrapper>;
  // Changes are a draft until Done, Enter or a click away; Escape drops them.
  const apply = (next: MentionDate) => {
    if (usableDate(next) && !sameDate(next, value)) updateAttributes(next);
  };
  const confirm = (next: MentionDate) => {
    apply(next);
    setOpen(false);
  };
  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <Popover.Root
        open={open}
        onOpenChange={(next, details) => {
          if (next) setDraft(value);
          else if (details.reason !== "escape-key") apply(draft);
          setOpen(next);
        }}
      >
        <Popover.Trigger
          className="mention-trigger"
          aria-label={`Edit date: ${fullMentionDate(value)}`}
        >
          <DateMention value={value} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            sideOffset={8}
            align="start"
            collisionPadding={12}
            className="menu-positioner"
          >
            <Popover.Popup
              ref={popup}
              className="menu-popup admin-popover dtp-popover day-time-popover mention-date-editor"
              // Straight onto the chosen day, so the arrow keys work at once.
              initialFocus={() =>
                popup.current?.querySelector<HTMLElement>(
                  '.rdp-day_button[tabindex="0"]',
                ) ?? true
              }
            >
              <Popover.Title className="sr-only">Edit date</Popover.Title>
              <DayTimeFields
                value={draft}
                onChange={setDraft}
                onConfirm={confirm}
                presets={mentionPresets()}
                today={todayDate()}
                zoneNote={MENTION_ZONE_NOTE}
              />
              <div className="picker-footer mention-date-footer">
                <button
                  type="button"
                  className="admin-button admin-button-quiet mention-date-remove"
                  onClick={() => {
                    setOpen(false);
                    deleteNode();
                    editor.commands.focus();
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={() => confirm(draft)}
                >
                  Done
                </button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </NodeViewWrapper>
  );
}
function MentionView(props: NodeViewProps) {
  return props.node.attrs.kind === "date" ? (
    <DateEditor {...props} />
  ) : (
    <NodeViewWrapper as="span" contentEditable={false}>
      <a
        className="page-mention"
        href={adminPageHref(props.node.attrs.id)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          window.dispatchEvent(
            new CustomEvent("writing:peek", {
              detail: { id: props.node.attrs.id },
            }),
          );
        }}
        target="_blank"
        rel="noreferrer"
      >
        ↗ {props.node.attrs.label || "Untitled"}
      </a>
    </NodeViewWrapper>
  );
}
type Item =
  | { kind: "date"; label: string; value: MentionDate }
  | { kind: "page"; label: string; id: string; status: string }
  | { kind: "create"; label: string }
  | { kind: "pick"; label: string };
type Props = SuggestionProps<Item>;
type Handle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };
const MentionList = forwardRef<Handle, Props>(function MentionList(
  { items, command, editor },
  ref,
) {
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const keyboardSelection = useRef(false);
  const listId = useId();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<MentionDate>(() => ({
    date: todayDate(),
    time: null,
  }));
  const insertPicked = (value: MentionDate) => {
    if (usableDate(value))
      command({ kind: "date", label: "Date", value });
  };
  const choose = (item: Item) => {
    if (item.kind === "pick") setPicking(true);
    else command(item);
  };
  const [seen, setSeen] = useState(items);
  if (seen !== items) {
    setSeen(items);
    setIndex(0);
  }
  useEffect(() => {
    if (list.current) list.current.scrollTop = 0;
  }, [items]);
  useEffect(() => {
    if (keyboardSelection.current) revealOption(list.current, index);
    keyboardSelection.current = false;
  }, [index]);
  useEffect(() => {
    const el = editor.view.dom;
    if (picking) return;
    // Put back whatever was there before (another menu's wiring), as the
    // slash menu does, rather than leaving the field with nothing or stale ids.
    const before = ["aria-controls", "aria-activedescendant", "aria-autocomplete"].map((name) => [name, el.getAttribute(name)] as const);
    el.setAttribute("aria-controls", listId);
    el.setAttribute("aria-autocomplete", "list");
    if (items[index])
      el.setAttribute("aria-activedescendant", `${listId}-${index}`);
    else el.removeAttribute("aria-activedescendant");
    return () => {
      if (el.getAttribute("aria-controls") !== listId) return;
      for (const [name, value] of before) {
        if (value === null) el.removeAttribute(name);
        else el.setAttribute(name, value);
      }
    };
  }, [editor, index, items, listId, picking]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length || picking) return false;
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
        choose(items[index]);
        return true;
      }
      return false;
    },
  }));
  if (picking)
    return (
      <form
        data-lenis-prevent
        onKeyDown={(e) => {
          // An open time list takes Escape first, and closes only itself.
          const target = e.target as HTMLElement;
          if (
            e.key === "Escape" &&
            target.getAttribute("aria-expanded") !== "true"
          ) {
            e.preventDefault();
            e.stopPropagation();
            setPicking(false);
            editor.commands.focus();
          }
        }}
        className="slash-menu mention-date-editor mention-picker"
        aria-label="Choose date and time"
        onSubmit={(e) => {
          e.preventDefault();
          insertPicked(picked);
        }}
      >
        <DayTimeFields
          value={picked}
          onChange={setPicked}
          onConfirm={insertPicked}
          presets={mentionPresets()}
          today={todayDate()}
          zoneNote={MENTION_ZONE_NOTE}
          autoFocus
        />
        <div className="picker-footer">
          <button
            type="button"
            className="admin-button admin-button-quiet"
            onClick={() => {
              setPicking(false);
              editor.commands.focus();
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button type="submit" className="admin-button admin-button-primary">
            Insert date
          </button>
        </div>
      </form>
    );
  return (
    <div className="slash-menu mention-suggestion" data-lenis-prevent>
      <p className="slash-group">Dates & pages</p>
      <div
        ref={list}
        id={listId}
        className="suggestion-options"
        role="listbox"
        aria-label="Mention a date or page"
      >
        {items.map((item, i) => (
          <button
            key={`${item.kind}:${item.label}:${i}`}
            id={`${listId}-${i}`}
            data-index={i}
            tabIndex={-1}
            type="button"
            role="option"
            aria-selected={index === i}
            className="slash-item"
            onPointerMove={(e) => {
              if (e.pointerType === "mouse") {
                keyboardSelection.current = false;
                setIndex(i);
              }
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(item)}
          >
            <span className="slash-icon" aria-hidden>
              {item.kind === "date" || item.kind === "pick" ? (
                <CalendarBlank size={16} />
              ) : item.kind === "create" ? (
                <Plus size={16} />
              ) : (
                <FileText size={16} />
              )}
            </span>
            <span className="slash-title">{item.label}</span>
            <span className="slash-hint">
              {item.kind === "date"
                ? fullMentionDate(item.value)
                : item.kind === "create"
                  ? "Create subpage"
                  : item.kind === "pick"
                    ? "Calendar"
                    : item.status}
            </span>
          </button>
        ))}
      </div>
      <p className="slash-empty">
        Try today, last Monday, Tuesday 14:30, or a page title.
      </p>
    </div>
  );
});

export function Mentions(currentId: () => string) {
  let creating = false;
  let targets: Promise<PostSummary[]> | null = null;
  return Node.create({
    name: "mention",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: () => ({
      kind: { default: "date" },
      date: { default: null },
      time: { default: null },
      id: { default: null },
      label: { default: "Page" },
    }),
    parseHTML: () => [
      {
        tag: 'a[href^="#date="]',
        getAttrs: (el) => fromHref(el.getAttribute("href") ?? "") ?? false,
      },
      {
        tag: 'a[href^="#page="]',
        getAttrs: (el) =>
          fromHref(el.getAttribute("href") ?? "", el.textContent ?? "Page") ??
          false,
      },
    ],
    renderHTML: ({ node }) =>
      node.attrs.kind === "date"
        ? [
            "a",
            { href: dateHref(node.attrs as MentionDate) },
            `@${fullMentionDate(node.attrs as MentionDate)}`,
          ]
        : ["a", { href: `#page=${node.attrs.id}` }, `@${node.attrs.label}`],
    markdownTokenizer: {
      name: "mention",
      level: "inline",
      start: (src) => src.search(/\[@?[^\]\n]*\]\(#(?:date|page)=/),
      tokenize: (src) => {
        const match = /^\[@?([^\]\n]*)\]\((#(?:date|page)=[^)\s]+)\)/.exec(src);
        const attrs = match ? fromHref(match[2], match[1]) : null;
        return match && attrs
          ? { type: "mention", raw: match[0], mentionAttrs: attrs }
          : undefined;
      },
    },
    parseMarkdown: (token) => ({
      type: "mention",
      attrs: token.mentionAttrs as Record<string, unknown>,
    }),
    renderMarkdown: (node) =>
      node.attrs?.kind === "date"
        ? `[@${fullMentionDate(node.attrs as MentionDate)}](${dateHref(node.attrs as MentionDate)})`
        : `[@${String(node.attrs?.label ?? "Page").replace(/[\[\]\\\n\r]/g, " ")}](#page=${node.attrs?.id})`,
    addNodeView: () => ReactNodeViewRenderer(MentionView),
    addProseMirrorPlugins() {
      return [
        Suggestion<Item>({
          editor: this.editor,
          char: "@",
          allowSpaces: true,
          pluginKey: new PluginKey("mentions"),
          placement: "bottom-start",
          offset: { mainAxis: 8 },
          floatingUi: { strategy: "fixed" },
          allow: ({ state, range }) =>
            state.doc.resolve(range.from).parent.type.name !== "codeBlock",
          items: async ({ query }) => {
            const q = query.trim();
            const parsed = parseDateQuery(q);
            const dates: Item[] = parsed
              ? [{ kind: "date", label: q, value: parsed }]
              : ["Today", "Yesterday", "Tomorrow"]
                  .filter((s) => s.toLowerCase().startsWith(q.toLowerCase()))
                  .map((label) => ({
                    kind: "date",
                    label,
                    value: parseDateQuery(label)!,
                  }));
            const posts = await (targets ??= api
              .list()
              .then((result) => result.posts)
              .catch(() => {
                targets = null;
                return [];
              }));
            const pages: Item[] = posts
              .filter(
                (p) =>
                  p.id !== currentId() &&
                  !p.trashedAt &&
                  p.page !== false &&
                  (!q || p.title.toLowerCase().includes(q.toLowerCase())),
              )
              .slice(0, 6)
              .map((p) => ({
                kind: "page",
                id: p.id,
                label: p.title || "Untitled",
                status: p.status,
              }));
            return [
              ...dates,
              { kind: "pick" as const, label: "Choose date and time…" },
              ...pages,
              ...(q && !parsed
                ? [{ kind: "create" as const, label: q.slice(0, 300) }]
                : []),
            ];
          },
          command: ({ editor, range, props }) => {
            if (props.kind === "pick") return;
            const insert = (attrs: Attrs) =>
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  { type: "mention", attrs },
                  { type: "text", text: " " },
                ])
                .run();
            if (props.kind === "date") {
              insert({ kind: "date", ...props.value });
              return;
            }
            if (props.kind === "page") {
              insert({ kind: "page", id: props.id, label: props.label });
              return;
            }
            if (creating) return;
            creating = true;
            const original = editor.state.doc.textBetween(range.from, range.to);
            const track = ({
              transaction,
            }: {
              transaction: import("@tiptap/pm/state").Transaction;
            }) => {
              range = {
                from: transaction.mapping.map(range.from),
                to: transaction.mapping.map(range.to),
              };
            };
            editor.on("transaction", track);
            void api
              .create({ title: props.label, page: true, parentId: currentId() })
              .then(({ post }) => {
                targets = null;
                forgetLinkTargets();
                const inserted =
                  !editor.isDestroyed &&
                  editor.state.doc.textBetween(range.from, range.to) ===
                    original;
                if (inserted)
                  insert({ kind: "page", id: post.id, label: post.title });
                toast.add({
                  type: "success",
                  title: "Subpage created",
                  description: inserted
                    ? "Saved as a draft. Open its link to start writing."
                    : "Saved as a draft. Find it in All writing; your selection changed while it was being created.",
                });
              })
              .catch((e) =>
                toast.add({
                  type: "error",
                  title: "Couldn’t create subpage",
                  description: e instanceof Error ? e.message : "Try again.",
                }),
              )
              .finally(() => {
                creating = false;
                editor.off("transaction", track);
              });
          },
          render: () => {
            let renderer: ReactRenderer<Handle, Props> | null = null;
            let unmount: (() => void) | undefined;
            const close = () => {
              unmount?.();
              unmount = undefined;
              renderer?.destroy();
              renderer = null;
              targets = null;
            };
            return {
              onStart: (props) => {
                renderer = new ReactRenderer(MentionList, {
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
              onExit: close,
            };
          },
        }),
      ];
    },
  });
}
