import { Node, type JSONContent, type MarkdownToken } from "@tiptap/core";

/*
 * Video and audio, as in MediaView.tsx, plus an optional captions file for
 * video. Markdown is still one plain tag on its own line:
 *
 *   <video src="…" poster="…" controls playsinline preload="metadata" data-captions="/media/…/en.vtt"></video>
 *
 * The site's player (components/writing/VideoPlayer.tsx) adds the <track>.
 * Kept free of React so the tests can load it; the view is media-plus.tsx.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const VTT = /^(?:\/(?!\/)|https:\/\/)[^\s"<>]+\.vtt$/i;
export const safeCaptions = (v: unknown) => (typeof v === "string" && VTT.test(v.trim()) ? v.trim() : "");

function attrs(src: string): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (const m of src.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1].toLowerCase()] = m[2] !== undefined ? m[2].replace(/&quot;/g, '"').replace(/&amp;/g, "&") : true;
  return out;
}

export function mediaMarkdown(a: { kind: string; src: string; poster?: string | null; loop?: boolean; caption?: string | null; captions?: string | null }): string {
  const title = a.caption ? ` title="${esc(a.caption)}"` : "";
  if (a.kind === "audio") return `<audio src="${esc(a.src)}" controls preload="metadata"${title}></audio>`;
  const poster = a.poster ? ` poster="${esc(a.poster)}"` : "";
  const captions = safeCaptions(a.captions) ? ` data-captions="${esc(safeCaptions(a.captions))}"` : "";
  return a.loop
    ? `<video src="${esc(a.src)}"${poster} autoplay loop muted playsinline${title}></video>`
    : `<video src="${esc(a.src)}"${poster} controls playsinline preload="metadata"${captions}${title}></video>`;
}

export const MediaCaptionsSchema = Node.create({
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
      captions: { default: "" },
    };
  },
  parseHTML() {
    return [
      { tag: "video[src]", getAttrs: (el) => ({ kind: "video", src: el.getAttribute("src"), poster: el.getAttribute("poster"), loop: el.hasAttribute("loop"), caption: el.getAttribute("title") ?? "", captions: safeCaptions(el.getAttribute("data-captions")) }) },
      { tag: "audio[src]", getAttrs: (el) => ({ kind: "audio", src: el.getAttribute("src"), caption: el.getAttribute("title") ?? "" }) },
    ];
  },
  renderHTML({ node }) {
    return [node.attrs.kind === "audio" ? "audio" : "video", { src: node.attrs.src, controls: "", ...(node.attrs.captions ? { "data-captions": node.attrs.captions } : {}) }];
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
      return {
        type: "media", raw: m[0], kind: m[1], src: a.src,
        poster: typeof a.poster === "string" ? a.poster : null,
        loop: a.loop === true,
        caption: typeof a.title === "string" ? a.title : "",
        captions: safeCaptions(a["data-captions"]),
      };
    },
  },
  parseMarkdown: (token: MarkdownToken) => ({
    type: "media",
    attrs: { kind: token.kind, src: token.src, poster: token.poster ?? null, loop: Boolean(token.loop), caption: token.caption ?? "", captions: token.captions ?? "" },
  }),
  renderMarkdown: (node: JSONContent) =>
    mediaMarkdown({
      kind: String(node.attrs?.kind ?? "video"),
      src: String(node.attrs?.src ?? ""),
      poster: (node.attrs?.poster as string | null) ?? null,
      loop: Boolean(node.attrs?.loop),
      caption: (node.attrs?.caption as string) ?? "",
      captions: (node.attrs?.captions as string) ?? "",
    }),
});
