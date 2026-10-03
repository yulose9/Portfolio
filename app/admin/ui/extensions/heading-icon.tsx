"use client";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { ImageSquare, Trash, X } from "@phosphor-icons/react";
import IconSources from "../IconSources";
import { decodeLogoLabel, safeInlineUrl } from "../../../../cms/inline";

/*
 * A heading's icon: an emoji, an icon from the library, an uploaded image, or
 * any symbol typed in. Picking from a tab applies it at once; a typed symbol
 * applies with Enter or Done.
 */
export function HeadingIconPicker({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (icon: string) => void;
  children: React.ReactElement;
}) {
  const [draft, setDraft] = useState(value),
    [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const apply = (icon: string) => {
    setOpen(false);
    onChange(icon);
  };
  const image = Boolean(safeInlineUrl(value, true));
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <Popover.Trigger render={children} />
      <Popover.Portal>
        <Popover.Positioner
          className="menu-positioner"
          sideOffset={8}
          collisionPadding={12}
        >
          <Popover.Popup
            className="menu-popup admin-popover heading-icon-panel"
            data-lenis-prevent
          >
            <div className="picker-heading">
              <Popover.Title>Heading icon</Popover.Title>
              <Popover.Close data-slot="popover-close"
                className="admin-icon-button"
                aria-label="Close heading icon"
                disabled={busy}
              >
                <X size={15} />
              </Popover.Close>
            </div>
            <div className="heading-icon-preview">
              <span>
                {draft ? (
                  <HeadingGlyph value={draft} />
                ) : (
                  <ImageSquare size={24} />
                )}
              </span>
              <p>
                Beside the heading<small>Also shown in the outline</small>
              </p>
            </div>
            <IconSources
              initial={image ? "custom" : "emoji"}
              onEmoji={apply}
              onImage={apply}
              onBusy={setBusy}
              uploadExtra={
                <form
                  className="heading-symbol"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) apply(draft.trim());
                  }}
                >
                  <label className="picker-field">
                    Or type a symbol
                    <input
                      value={safeInlineUrl(draft, true) ? "" : draft}
                      placeholder="§, ★, →"
                      maxLength={16}
                      disabled={busy}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                </form>
              }
            />
            <div className="picker-footer">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || !value}
                onClick={() => apply("")}
              >
                <Trash size={14} />
                Remove
              </button>
              <button
                type="button"
                className="admin-button admin-button-primary"
                disabled={busy}
                onClick={() =>
                  draft.trim() && draft !== value ? apply(draft.trim()) : setOpen(false)
                }
              >
                Done
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function HeadingGlyph({ value }: { value: string }) {
  return safeInlineUrl(value, true) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="heading-icon-image"
      src={safeInlineUrl(value, true)}
      alt=""
    />
  ) : (
    <span aria-hidden="true">{value || "＋"}</span>
  );
}
function View({ node, updateAttributes, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper as="span" className="heading-icon" contentEditable={false}>
      <HeadingIconPicker
        value={node.attrs.icon}
        onChange={(icon) => (icon ? updateAttributes({ icon }) : deleteNode())}
      >
        <button
          type="button"
          className="heading-icon-trigger"
          aria-label="Edit heading icon"
        >
          <HeadingGlyph value={node.attrs.icon} />
        </button>
      </HeadingIconPicker>
    </NodeViewWrapper>
  );
}
export const HeadingIcon = Node.create({
  name: "headingIcon",
  priority: 1200,
  inline: true,
  group: "inline",
  atom: true,
  addAttributes: () => ({ icon: { default: "✨" } }),
  parseHTML: () => [
    {
      tag: "img[data-heading-icon]",
      getAttrs: (el) => ({
        icon: decodeLogoLabel(el.getAttribute("data-heading-icon") ?? ""),
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "img",
    { "data-heading-icon": encodeURIComponent(node.attrs.icon), alt: "" },
  ],
  addNodeView: () => ReactNodeViewRenderer(View),
  markdownTokenizer: {
    name: "headingIcon",
    level: "inline",
    start: (source) => source.indexOf('<img data-heading-icon="'),
    tokenize: (source) => {
      const m = /^<img data-heading-icon="([^"]*)" alt=""\s*\/>/.exec(source);
      return m
        ? { type: "headingIcon", raw: m[0], icon: decodeLogoLabel(m[1]) }
        : undefined;
    },
  },
  parseMarkdown: (token) => ({
    type: "headingIcon",
    attrs: { icon: token.icon },
  }),
  renderMarkdown: (node) =>
    `<img data-heading-icon="${encodeURIComponent(node.attrs?.icon ?? "")}" alt="" />`,
});
