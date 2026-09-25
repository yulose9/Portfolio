"use client";

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useImperativeHandle, useState } from "react";

import { api, type PostSummary } from "../api";
import { Fluent } from "./emoji";

/*
 * Obsidian's [[ — type two brackets and the name of another post to link to
 * it. What's written is an ordinary Markdown link to /writing/<slug>, so it
 * works everywhere; the site also counts it as a backlink ("Mentioned in").
 * Posts without a page can't be linked to, so they aren't offered.
 */

let posts: Promise<PostSummary[]> | null = null;
const loadPosts = () => (posts ??= api.list().then((r) => r.posts).catch(() => ((posts = null), [])));
/** After a publish or rename the list is stale; the next [[ fetches it again. */
export const forgetLinkTargets = () => {
  posts = null;
};

type Props = SuggestionProps<PostSummary>;
type Handle = { onKeyDown: (p: SuggestionKeyDownProps) => boolean };

const LinkList = forwardRef<Handle, Props>(function LinkList({ items, command, query }, ref) {
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(items);
  if (items !== seen) {
    setSeen(items);
    setIndex(0);
  }
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
    <div className="slash-menu" role="listbox" aria-label="Link to a post">
      <p className="slash-group">Link to a post</p>
      {items.length ? (
        items.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="option"
            aria-selected={i === index}
            className="slash-item link-item"
            onMouseEnter={() => setIndex(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(p)}
          >
            <span className="slash-icon">{p.icon ? <Fluent emoji={p.icon} size={16} /> : "↗"}</span>
            <span className="slash-title">{p.title.trim() || "Untitled"}</span>
            <span className="slash-hint">
              /writing/{p.slug || "…"}
              {p.status === "published" ? "" : p.status === "scheduled" ? " · scheduled" : " · not live yet"}
            </span>
          </button>
        ))
      ) : (
        <p className="slash-empty">{query ? `No post matches “${query}”` : "No other posts yet"}</p>
      )}
    </div>
  );
});

function place(el: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const height = el.offsetHeight || 260;
  const below = rect.bottom + 8 + height < window.innerHeight;
  el.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - el.offsetWidth - 12))}px`;
  el.style.top = `${below ? rect.bottom + 8 : rect.top - 8 - height}px`;
}

export function PostLinks(currentId: () => string) {
  return Extension.create({
    name: "postLinks",
    addProseMirrorPlugins() {
      return [
        Suggestion<PostSummary>({
          editor: this.editor,
          char: "[[",
          pluginKey: new PluginKey("postLinks"),
          allowSpaces: true,
          allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "codeBlock",
          items: async ({ query }) => {
            const q = query.replace(/\]+$/, "").trim().toLowerCase();
            return (await loadPosts())
              .filter((p) => p.id !== currentId() && p.page !== false && p.slug)
              .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.includes(q))
              .slice(0, 8);
          },
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                { type: "text", text: props.title.trim() || props.slug, marks: [{ type: "link", attrs: { href: `/writing/${props.slug}` } }] },
                { type: "text", text: " " },
              ])
              .run();
          },
          render: () => {
            let r: ReactRenderer<Handle, Props> | null = null;
            return {
              onStart: (props) => {
                r = new ReactRenderer(LinkList, { props, editor: props.editor });
                const el = r.element as HTMLElement;
                el.classList.add("slash-layer");
                document.body.appendChild(el);
                requestAnimationFrame(() => place(el, props.clientRect?.()));
              },
              onUpdate: (props) => {
                r?.updateProps(props);
                if (r) place(r.element as HTMLElement, props.clientRect?.());
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  (r?.element as HTMLElement | undefined)?.remove();
                  r?.destroy();
                  r = null;
                  return true;
                }
                return r?.ref?.onKeyDown(props) ?? false;
              },
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
}
