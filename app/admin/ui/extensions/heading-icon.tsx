"use client";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { ImageSquare, UploadSimple, Trash, X } from "@phosphor-icons/react";
import { uploadInlineLogo } from "../media";
import { beginPendingWork } from "../session";
import { decodeLogoLabel, safeInlineUrl } from "../../../../cms/inline";

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) {
          setDraft(value);
          setError("");
        }
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
              <Popover.Close
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
            <label className="picker-field">
              Emoji or symbol
              <input
                value={safeInlineUrl(draft, true) ? "" : draft}
                placeholder="Enter a symbol"
                maxLength={16}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <label className="heading-upload" aria-disabled={busy}>
              <UploadSimple size={18} />
              <span>
                {busy ? "Uploading…" : "Upload image"}
                <small>PNG, JPG, SVG and other supported images</small>
              </span>
              <input
                className="sr-only"
                aria-label="Upload heading icon"
                type="file"
                accept="image/*,.svg,.heic,.heif"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const finish = beginPendingWork();
                  setBusy(true);
                  try {
                    setDraft(await uploadInlineLogo(file));
                    setError("");
                  } catch (error) {
                    setError(
                      error instanceof Error ? error.message : "Upload failed",
                    );
                  } finally {
                    finish();
                    setBusy(false);
                  }
                }}
              />
            </label>
            {error ? (
              <p role="alert" className="field-error">
                {error}
              </p>
            ) : null}
            <div className="picker-footer">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || !value}
                onClick={() => {
                  setOpen(false);
                  onChange("");
                }}
              >
                <Trash size={14} />
                Remove
              </button>
              <button
                type="button"
                className="admin-button admin-button-primary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onChange(draft.trim());
                }}
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
