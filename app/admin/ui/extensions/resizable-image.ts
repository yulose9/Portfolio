import Image from "@tiptap/extension-image";

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
      view.update = (node, decorations, innerDecorations) => {
        const accepted = update?.(node, decorations, innerDecorations) ?? false;
        if (accepted) {
          // The upstream view sizes during dragging, but does not apply later
          // attribute changes (numeric input, reset and undo) to its image.
          const img = (view.dom as HTMLElement).querySelector("img");
          if (img) {
            img.style.width = node.attrs.width ? `${Number(node.attrs.width)}px` : "";
            img.style.height = node.attrs.height ? `${Number(node.attrs.height)}px` : "";
          }
        }
        return accepted;
      };
      return view;
    };
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
