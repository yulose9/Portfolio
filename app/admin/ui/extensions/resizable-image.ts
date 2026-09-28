import Image from "@tiptap/extension-image";
import { decodeInline } from "../../../../cms/inline";

const escape = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Markdown images have no size syntax; sized images round-trip as safe HTML. */
export const ResizableImage = Image.extend({
  addNodeView() {
    const createView = this.parent?.();
    if (!createView) return null;
    return (props) => {
      const view = createView(props);
      const update = view.update?.bind(view);
      let width = props.node.attrs.width;
      let height = props.node.attrs.height;
      const applySize = (w: unknown,h: unknown) => {
        const img=(view.dom as HTMLElement).querySelector("img");
        if(!img)return;
        for(const [key,value] of [["width",w],["height",h]] as const){
          if(Number(value)>0){img.setAttribute(key,String(Math.round(Number(value))));img.style[key]=`${Number(value)}px`;}
          else {img.removeAttribute(key);img.style[key]="";}
        }
      };
      if(Number(width)>0)applySize(width,height);
      view.update = (node, decorations, innerDecorations) => {
        const accepted = update?.(node, decorations, innerDecorations) ?? false;
        if (accepted && (node.attrs.width !== width || node.attrs.height !== height)) {
          // The upstream view sizes during dragging, but does not apply later
          // attribute changes (numeric input, reset and undo) to its image.
          applySize(node.attrs.width,node.attrs.height);
          width = node.attrs.width;
          height = node.attrs.height;
        }
        return accepted;
      };
      return view;
    };
  },
  // Parse our persisted size explicitly, including in DOM-free draft tooling.
  // Ordinary Markdown images still use the parent image parser.
  markdownTokenizer: {
    name: "image", level: "block",
    start: source => source.indexOf('<img src="'),
    tokenize: source => {
      const match = /^<img src="([^"]*)" alt="([^"]*)"(?: title="([^"]*)")? width="(\d+)"(?: height="(\d+)")?\s*\/?>(?:[ \t]*\n)?/.exec(source);
      if (!match) return undefined;
      return {type:"image",raw:match[0],href:decodeInline(match[1]),text:decodeInline(match[2]),title:decodeInline(match[3]??""),width:Number(match[4]),height:match[5]?Number(match[5]):null};
    },
  },
  parseMarkdown(token) {
    return {type:"image",attrs:{src:token.href,alt:token.text??null,title:token.title??null,width:token.width??null,height:token.height??null}};
  },
  renderMarkdown(node) {
    const { src, alt, title, width, height } = node.attrs ?? {};
    const size = Number(width);
    if (!Number.isFinite(size) || size <= 0) {
      return title ? `![${alt ?? ""}](${src ?? ""} "${title}")` : `![${alt ?? ""}](${src ?? ""})`;
    }
    const h = Number(height);
    return `<img src="${escape(src)}" alt="${escape(alt)}"${title ? ` title="${escape(title)}"` : ""} width="${Math.round(size)}"${Number.isFinite(h) && h > 0 ? ` height="${Math.round(h)}"` : ""}>`;
  },
}).configure({
  inline: false,
  allowBase64: false,
  resize: {
    enabled: true,
    directions: ["bottom-left", "bottom-right"],
    minWidth: 64,
    minHeight: 32,
    alwaysPreserveAspectRatio: true,
  },
});
