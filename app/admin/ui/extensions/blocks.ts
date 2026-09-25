import {
  Extension,
  Node,
  mergeAttributes,
  type JSONContent,
  type MarkdownLexerConfiguration,
  type MarkdownParseHelpers,
  type MarkdownRendererHelpers,
  type MarkdownToken,
} from "@tiptap/core";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

import { parseEmbed } from "../../../../cms/embeds";
import { fluentUrl, splitEmoji } from "../../../../cms/emoji";

/*
 * The Notion-style blocks the editor adds to Tiptap's own, each with a
 * Markdown form that the site's renderer (app/lib/writing.ts) understands:
 *
 *   callout   > [!TIP]            GitHub's alert syntax: reads fine on GitHub
 *             > text
 *   toggle    <details>           plain HTML, which Markdown allows
 *             <summary>…</summary>
 *   embed     https://x.com/…     a link alone on its line
 */

type Lexer = MarkdownLexerConfiguration & {
  blockTokens: (src: string) => MarkdownToken[];
  inlineTokens: (src: string) => MarkdownToken[];
};

/* ── Callout ─────────────────────────────────────────────────────────── */

export const CALLOUT_TYPES = ["note", "tip", "important", "warning", "caution"] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];
export const CALLOUT_EMOJI: Record<CalloutType, string> = {
  note: "💡",
  tip: "✅",
  important: "📌",
  warning: "⚠️",
  caution: "🛑",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType;
      toggleCallout: (type?: CalloutType) => ReturnType;
    };
    embed: {
      setEmbed: (url: string) => ReturnType;
    };
    find: {
      setFind: (query: string, index?: number) => ReturnType;
      findStep: (direction: 1 | -1) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (el) => el.getAttribute("data-type") ?? "note",
        renderHTML: (attrs) => ({ "data-type": attrs.type }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "aside.callout" }, { tag: "div[data-callout]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as CalloutType) ?? "note";
    const emoji = CALLOUT_EMOJI[type] ?? CALLOUT_EMOJI.note;
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { class: "callout", "data-callout": "" }),
      [
        "span",
        { class: "callout-icon", contenteditable: "false", "data-callout-toggle": "" },
        ["span", { class: "fe", style: `--fe:url(${fluentUrl(emoji)})` }, emoji],
      ],
      ["div", { class: "callout-body" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type = "note") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type }),
      toggleCallout:
        (type = "note") =>
        ({ commands, editor }) =>
          editor.isActive(this.name) ? commands.lift(this.name) : commands.wrapIn(this.name, { type }),
    };
  },

  // Clicking the icon cycles the kind: note → tip → important → warning → caution.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos, event) => {
            if (node.type.name !== this.name) return false;
            if (!(event.target as Element).closest?.("[data-callout-toggle]")) return false;
            const i = CALLOUT_TYPES.indexOf(node.attrs.type as CalloutType);
            const next = CALLOUT_TYPES[(i + 1) % CALLOUT_TYPES.length];
            view.dispatch(view.state.tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, type: next }));
            return true;
          },
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (src: string) => src.search(/^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/im),
    tokenize: (src: string, _tokens: MarkdownToken[], config: MarkdownLexerConfiguration) => {
      const lexer = config as Lexer;
      const match = /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/i.exec(src);
      if (!match) return undefined;
      const inner = match[2].replace(/^ {0,3}> ?/gm, "");
      return { type: "callout", raw: match[0], calloutType: match[1].toLowerCase(), tokens: lexer.blockTokens(inner) };
    },
  },
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => ({
    type: "callout",
    attrs: { type: token.calloutType ?? "note" },
    content: helpers.parseChildren(token.tokens ?? []),
  }),
  renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) => {
    const body = helpers.renderChildren(node.content ?? [], "\n\n").trim();
    const quoted = body
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n");
    return `> [!${String(node.attrs?.type ?? "note").toUpperCase()}]\n${quoted}`;
  },
});

/* ── Toggle ──────────────────────────────────────────────────────────── */

export const Toggle = Details.extend({
  markdownTokenizer: {
    name: "details",
    level: "block",
    start: (src: string) => src.indexOf("<details"),
    tokenize: (src: string, _tokens: MarkdownToken[], config: MarkdownLexerConfiguration) => {
      const lexer = config as Lexer;
      const match = /^<details(?: open)?>\s*<summary>([\s\S]*?)<\/summary>\s*\n([\s\S]*?)\n?<\/details>[ \t]*(?:\n|$)/.exec(src);
      if (!match) return undefined;
      return {
        type: "details",
        raw: match[0],
        summaryTokens: lexer.inlineTokens(match[1].trim()),
        tokens: lexer.blockTokens(match[2].trim()),
      };
    },
  },
  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) => ({
    type: "details",
    content: [
      { type: "detailsSummary", content: helpers.parseInline(token.summaryTokens ?? []) },
      {
        type: "detailsContent",
        content: (token.tokens?.length ? helpers.parseChildren(token.tokens) : null) ?? [{ type: "paragraph" }],
      },
    ],
  }),
  renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) => {
    const [summary, content] = node.content ?? [];
    const title = summary ? helpers.renderChildren(summary.content ?? []).trim() : "";
    const body = content ? helpers.renderChildren(content.content ?? [], "\n\n").trim() : "";
    return `<details>\n<summary>${title || "Toggle"}</summary>\n\n${body}\n\n</details>`;
  },
}).configure({ persist: true, HTMLAttributes: { class: "toggle" } });

export { DetailsContent, DetailsSummary };

/* ── Embed ───────────────────────────────────────────────────────────── */

export const EMBED_LINE = /^(https?:\/\/[^\s<>]+)[ \t]*(?:\n|$)/;

/** The node; its view (EmbedView) is attached in the editor, since it's React. */
export const EmbedBase = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { url: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-embed]", getAttrs: (el) => ({ url: (el as HTMLElement).getAttribute("data-url") ?? "" }) }];
  },
  renderHTML({ node }) {
    return ["div", { "data-embed": "", "data-url": node.attrs.url }];
  },
  addCommands() {
    return {
      setEmbed:
        (url) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { url } }),
    };
  },

  // Paste a post's link onto an empty line and it becomes the post.
  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey("embedPaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
            if (!text || /\s/.test(text) || !parseEmbed(text)) return false;
            const { $from, empty } = view.state.selection;
            if (!empty || $from.parent.type.name !== "paragraph" || $from.parent.textContent) return false;
            const pos = $from.before();
            view.dispatch(view.state.tr.replaceWith(pos, pos + $from.parent.nodeSize, type.create({ url: text })));
            return true;
          },
        },
      }),
    ];
  },

  markdownTokenizer: {
    name: "embed",
    level: "block",
    start: (src: string) => src.search(/^https?:\/\//m),
    tokenize: (src: string) => {
      const match = EMBED_LINE.exec(src);
      if (!match || !parseEmbed(match[1])) return undefined;
      return { type: "embed", raw: match[0], url: match[1] };
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({ type: "embed", attrs: { url: token.url ?? "" } }),
  renderMarkdown: (node: JSONContent) => String(node.attrs?.url ?? ""),
});

/* ── Fluent emoji, as decorations ────────────────────────────────────── */

function emojiDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || !node.text) return;
    if (node.marks.some((m) => m.type.name === "code") || parent?.type.name === "codeBlock") return;
    let offset = 0;
    for (const run of splitEmoji(node.text)) {
      if (run.emoji) {
        decorations.push(
          Decoration.inline(pos + offset, pos + offset + run.text.length, {
            class: "fe",
            style: `--fe:url(${fluentUrl(run.text)})`,
          })
        );
      }
      offset += run.text.length;
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const FluentEmoji = Extension.create({
  name: "fluentEmoji",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("fluentEmoji"),
        state: {
          init: (_, { doc }) => emojiDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? emojiDecorations(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

/* ── Find in page ────────────────────────────────────────────────────── */

export type FindState = { query: string; index: number; matches: { from: number; to: number }[] };
export const findKey = new PluginKey<FindState>("find");

function findMatches(doc: PMNode, query: string) {
  const out: { from: number; to: number }[] = [];
  if (!query) return out;
  const needle = query.toLowerCase();
  // Search each textblock as one string, so a match can span bold → plain.
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textBetween(0, node.content.size, "\n", "￼");
    const hay = text.toLowerCase();
    for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) {
      out.push({ from: pos + 1 + at, to: pos + 1 + at + needle.length });
    }
    return false;
  });
  return out;
}

export const Find = Extension.create({
  name: "find",
  addCommands() {
    return {
      setFind:
        (query, index = 0) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(findKey, { query, index }));
          return true;
        },
      findStep:
        (direction) =>
        ({ tr, state, dispatch }) => {
          const current = findKey.getState(state);
          if (!current?.matches.length) return false;
          const n = current.matches.length;
          dispatch?.(tr.setMeta(findKey, { query: current.query, index: (current.index + direction + n) % n }));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => ({ query: "", index: 0, matches: [] }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(findKey) as { query: string; index: number } | undefined;
            if (meta) {
              const matches = findMatches(tr.doc, meta.query);
              return { query: meta.query, index: Math.min(Math.max(0, meta.index), Math.max(0, matches.length - 1)), matches };
            }
            if (tr.docChanged && prev.query) {
              const matches = findMatches(tr.doc, prev.query);
              return { ...prev, matches, index: Math.min(prev.index, Math.max(0, matches.length - 1)) };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const s = findKey.getState(state);
            if (!s?.matches.length) return null;
            return DecorationSet.create(
              state.doc,
              s.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === s.index ? "find-match find-current" : "find-match" }))
            );
          },
        },
      }),
    ];
  },
});
