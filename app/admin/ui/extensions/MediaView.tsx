"use client";

import { Trash } from "@phosphor-icons/react";
import { Node, type JSONContent, type MarkdownToken } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import AudioPlayer from "../../../components/writing/AudioPlayer";

/*
 * Video and audio blocks. In Markdown they're a plain HTML tag on its own
 * line — portable, and exactly what the site renders:
 *
 *   <video src="/media/…-1280x720.mp4" poster="…" controls playsinline preload="metadata"></video>
 *   <video src="…" autoplay loop muted playsinline></video>      a GIF, as video
 *   <audio src="/media/…-37s.m4a" controls preload="metadata"></audio>
 *
 * A title="" on the tag is the caption.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function attrs(src: string): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (const m of src.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1].toLowerCase()] = m[2] !== undefined ? m[2].replace(/&quot;/g, '"').replace(/&amp;/g, "&") : true;
  return out;
}

export function mediaMarkdown(a: { kind: string; src: string; poster?: string | null; loop?: boolean; caption?: string | null }): string {
  const title = a.caption ? ` title="${esc(a.caption)}"` : "";
  if (a.kind === "audio") return `<audio src="${esc(a.src)}" controls preload="metadata"${title}></audio>`;
  const poster = a.poster ? ` poster="${esc(a.poster)}"` : "";
  return a.loop
    ? `<video src="${esc(a.src)}"${poster} autoplay loop muted playsinline${title}></video>`
    : `<video src="${esc(a.src)}"${poster} controls playsinline preload="metadata"${title}></video>`;
}

function View({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const { kind, src, poster, loop, caption } = node.attrs as { kind: string; src: string; poster: string | null; loop: boolean; caption: string };
  return (
    <NodeViewWrapper className="media-node" data-selected={selected || undefined} data-kind={kind}>
      <figure className={kind === "audio" ? "article-audio" : "article-figure article-video"} contentEditable={false}>
        <div className="embed-tools">
          <button type="button" className="embed-tool" onClick={() => deleteNode()} aria-label={`Remove ${kind}`}>
            <Trash size={14} weight="bold" />
          </button>
        </div>
        {kind === "audio" ? (
          <AudioPlayer src={src} title={caption} />
        ) : loop ? (
          <video src={src} poster={poster ?? undefined} autoPlay loop muted playsInline />
        ) : (
          <video src={src} poster={poster ?? undefined} controls playsInline preload="metadata" />
        )}
        <input
          className="editor-caption"
          value={caption ?? ""}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="Caption (optional)"
          aria-label="Caption"
        />
      </figure>
    </NodeViewWrapper>
  );
}

export const Media = Node.create({
  name: "media",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: "video" },
      src: { default: "" },
      poster: { default: null },
      loop: { default: false },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [
      { tag: "video[src]", getAttrs: (el) => ({ kind: "video", src: el.getAttribute("src"), poster: el.getAttribute("poster"), loop: el.hasAttribute("loop"), caption: el.getAttribute("title") ?? "" }) },
      { tag: "audio[src]", getAttrs: (el) => ({ kind: "audio", src: el.getAttribute("src"), caption: el.getAttribute("title") ?? "" }) },
    ];
  },
  renderHTML({ node }) {
    return [node.attrs.kind === "audio" ? "audio" : "video", { src: node.attrs.src, controls: "" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(View);
  },

  markdownTokenizer: {
    name: "media",
    level: "block",
    start: (src: string) => src.search(/^<(video|audio)\b/m),
    tokenize: (src: string) => {
      const m = /^<(video|audio)\b([^>]*)>\s*<\/\1>[ \t]*(?:\n|$)/.exec(src);
      if (!m) return undefined;
      const a = attrs(m[2]);
      if (typeof a.src !== "string") return undefined;
      return { type: "media", raw: m[0], kind: m[1], src: a.src, poster: typeof a.poster === "string" ? a.poster : null, loop: a.loop === true, caption: typeof a.title === "string" ? a.title : "" };
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({
    type: "media",
    attrs: { kind: token.kind, src: token.src, poster: token.poster ?? null, loop: Boolean(token.loop), caption: token.caption ?? "" },
  }),
  renderMarkdown: (node: JSONContent) =>
    mediaMarkdown({
      kind: String(node.attrs?.kind ?? "video"),
      src: String(node.attrs?.src ?? ""),
      poster: (node.attrs?.poster as string | null) ?? null,
      loop: Boolean(node.attrs?.loop),
      caption: (node.attrs?.caption as string) ?? "",
    }),
});
