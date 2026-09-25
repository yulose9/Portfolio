"use client";

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { fluentUrl } from "../../../../cms/emoji";

/*
 * Emoji, in Fluent 3D: a searchable picker (page icons, the toolbar) and
 * ":" autocomplete while typing — ":dog" offers 🐕 🐶 🌭. The data (1,900
 * emoji with names and search words) loads the first time either is used.
 */

export type EmojiRow = [emoji: string, label: string, words: string, group: number];

let data: Promise<EmojiRow[]> | null = null;
export const loadEmoji = () => (data ??= import("../emoji-data.json").then((m) => m.default as EmojiRow[]));

export const GROUPS = [
  { id: 0, label: "Smileys", sample: "😀" },
  { id: 1, label: "People", sample: "👋" },
  { id: 3, label: "Animals & nature", sample: "🐕" },
  { id: 4, label: "Food & drink", sample: "🍜" },
  { id: 5, label: "Travel & places", sample: "✈️" },
  { id: 6, label: "Activities", sample: "⚽" },
  { id: 7, label: "Objects", sample: "💡" },
  { id: 8, label: "Symbols", sample: "❤️" },
  { id: 9, label: "Flags", sample: "🇵🇭" },
];

const RECENT_KEY = "admin-recent-emoji";
export function recentEmoji(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
export function rememberEmoji(emoji: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...recentEmoji().filter((e) => e !== emoji)].slice(0, 16)));
  } catch {
    /* private mode */
  }
}

/** Name matches first, then word matches; a word that starts with the query beats one that contains it. */
export function searchEmoji(rows: EmojiRow[], query: string, limit = 60): EmojiRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, limit);
  const scored: [number, EmojiRow][] = [];
  for (const row of rows) {
    const label = row[1].toLowerCase();
    const words = row[2].toLowerCase();
    const score = label === q ? 0 : label.startsWith(q) ? 1 : ` ${words} `.includes(` ${q}`) ? 2 : label.includes(q) ? 3 : words.includes(q) ? 4 : -1;
    if (score >= 0) scored.push([score, row]);
  }
  return scored
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([, r]) => r);
}

export function Fluent({ emoji, size = 22 }: { emoji: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={fluentUrl(emoji)} alt={emoji} width={size} height={size} loading="lazy" draggable={false} className="fluent-img" />;
}

/** The full picker: search, recents, categories. */
export function EmojiPicker({ onPick, onRemove }: { onPick: (emoji: string) => void; onRemove?: () => void }) {
  const [rows, setRows] = useState<EmojiRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(0);
  const [recent] = useState(recentEmoji);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    void loadEmoji().then((r) => live && setRows(r));
    input.current?.focus();
    return () => {
      live = false;
    };
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    return query.trim() ? searchEmoji(rows, query, 120) : rows.filter((r) => r[3] === group);
  }, [rows, query, group]);

  const pick = (emoji: string) => {
    rememberEmoji(emoji);
    onPick(emoji);
  };

  return (
    <div className="emoji-picker">
      <div className="emoji-picker-top">
        <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search emoji" aria-label="Search emoji" />
        {onRemove ? (
          <button type="button" className="admin-chip" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      {!query && recent.length ? (
        <div className="emoji-section">
          <p className="emoji-section-title">Recent</p>
          <div className="emoji-grid">
            {recent.map((e) => (
              <button key={e} type="button" className="emoji-cell" onClick={() => pick(e)} aria-label={e}>
                <Fluent emoji={e} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="emoji-section emoji-scroll">
        {!query ? <p className="emoji-section-title">{GROUPS.find((g) => g.id === group)?.label}</p> : null}
        {rows === null ? (
          <p className="emoji-empty">Loading…</p>
        ) : shown.length ? (
          <div className="emoji-grid">
            {shown.map((r) => (
              <button key={r[0]} type="button" className="emoji-cell" title={r[1]} onClick={() => pick(r[0])} aria-label={r[1]}>
                <Fluent emoji={r[0]} />
              </button>
            ))}
          </div>
        ) : (
          <p className="emoji-empty">No emoji match “{query}”.</p>
        )}
      </div>
      {!query ? (
        <div className="emoji-groups" role="tablist" aria-label="Emoji categories">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={g.id === group} className="emoji-group" onClick={() => setGroup(g.id)} aria-label={g.label} title={g.label}>
              <Fluent emoji={g.sample} size={18} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── ":" autocomplete ────────────────────────────────────────────────── */

type ListProps = SuggestionProps<EmojiRow>;
type Handle = { onKeyDown: (p: SuggestionKeyDownProps) => boolean };

const EmojiList = forwardRef<Handle, ListProps>(function EmojiList({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(items);
  if (items !== seen) {
    setSeen(items);
    setIndex(0);
  }
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        setIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
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
  if (!items.length) return null;
  return (
    <div className="slash-menu emoji-suggest" role="listbox" aria-label="Emoji">
      {items.map((row, i) => (
        <button
          key={row[0]}
          type="button"
          role="option"
          aria-selected={i === index}
          className="slash-item emoji-suggest-item"
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(row)}
        >
          <Fluent emoji={row[0]} size={20} />
          <span className="slash-title">{row[1]}</span>
        </button>
      ))}
    </div>
  );
});

function place(el: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const height = el.offsetHeight || 240;
  const below = rect.bottom + 8 + height < window.innerHeight;
  el.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - el.offsetWidth - 12))}px`;
  el.style.top = `${below ? rect.bottom + 8 : rect.top - 8 - height}px`;
}

export const EmojiSuggest = Extension.create({
  name: "emojiSuggest",
  addProseMirrorPlugins() {
    return [
      Suggestion<EmojiRow>({
        editor: this.editor,
        char: ":",
        pluginKey: new PluginKey("emojiSuggest"),
        allowSpaces: false,
        // ":)" and "12:30" shouldn't open it: letters only, two or more.
        allow: ({ state, range }) => {
          const before = state.doc.textBetween(Math.max(0, range.from - 1), range.from);
          return (before === "" || /\s/.test(before)) && state.doc.resolve(range.from).parent.type.name !== "codeBlock";
        },
        items: async ({ query }) => (query.length < 2 || !/^[a-z_+-]+$/i.test(query) ? [] : searchEmoji(await loadEmoji(), query.replace(/_/g, " "), 8)),
        command: ({ editor, range, props }) => {
          rememberEmoji(props[0]);
          editor.chain().focus().deleteRange(range).insertContent(props[0]).run();
        },
        render: () => {
          let r: ReactRenderer<Handle, ListProps> | null = null;
          return {
            onStart: (props) => {
              r = new ReactRenderer(EmojiList, { props, editor: props.editor });
              const el = r.element as HTMLElement;
              el.classList.add("slash-layer");
              document.body.appendChild(el);
              requestAnimationFrame(() => place(el, props.clientRect?.()));
            },
            onUpdate: (props) => {
              r?.updateProps(props);
              if (r) place(r.element as HTMLElement, props.clientRect?.());
            },
            onKeyDown: (props) => (props.event.key === "Escape" ? (r?.destroy(), (r?.element as HTMLElement | undefined)?.remove(), (r = null), true) : (r?.ref?.onKeyDown(props) ?? false)),
            onExit: () => {
              (r?.element as HTMLElement | undefined)?.remove();
              r?.destroy();
              r = null;
            },
          };
        },
      }),
    ];
  },
});
