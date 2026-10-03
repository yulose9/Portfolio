"use client";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Popover } from "@base-ui/react/popover";
import { Trash, X } from "@phosphor-icons/react";
import { useState } from "react";
import { safeInlineUrl, escapeInline, decodeInline, decodeLogoLabel } from "../../../../cms/inline";
import { fluentUrl } from "../../../../cms/emoji";
import IconSources from "../IconSources";

/*
 * "Logo and text": a small image that sits in the line, followed by its
 * label, optionally linked. The logo can be an emoji (drawn in Fluent 3D, as
 * every emoji on the site is), an icon from the library, or an uploaded
 * image; library icons and uploads are stored in the media library.
 */
function LogoView({node, updateAttributes, deleteNode}: NodeViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState(String(node.attrs.href ?? ""));
  const src = safeInlineUrl(node.attrs.src, true);
  const setLogo = (next: string) => { updateAttributes({src: next}); setError(""); };
  return <NodeViewWrapper as="span" className="inline-logo-editor" contentEditable={false}>
    <Popover.Root onOpenChange={(open, details) => { if (!open && busy) details.cancel(); }}><Popover.Trigger className="inline-logo-trigger" aria-label={`Edit logo and text: ${node.attrs.label}`}>
      {src ? (
        // Tiny, client-uploaded assets are already resized before upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : <span aria-hidden="true">＋</span>}
      <span>{node.attrs.label || "Logo and text"}</span>
    </Popover.Trigger>
      <Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner"><Popover.Popup className="menu-popup admin-popover inline-logo-panel" data-lenis-prevent>
        <div className="picker-heading">
          <Popover.Title>Logo and text</Popover.Title>
          <Popover.Close data-slot="popover-close" className="admin-icon-button" aria-label="Close logo and text" disabled={busy}><X size={15} /></Popover.Close>
        </div>
        <label className="picker-field">Text<input maxLength={200} value={node.attrs.label} onChange={e => updateAttributes({label:e.target.value})} /></label>
        <div className="inline-logo-current">
          <span className="inline-logo-swatch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} alt="" /> : <span aria-hidden="true">＋</span>}
          </span>
          <p>{src ? "Logo" : "No logo yet"}<small>Follows the surrounding text size</small></p>
          {src ? <button type="button" className="admin-button admin-button-quiet" disabled={busy} onClick={() => setLogo("")}>Clear</button> : null}
        </div>
        <IconSources initial={src && !src.startsWith("/") ? "emoji" : src ? "custom" : "icons"} onEmoji={emoji => setLogo(fluentUrl(emoji))} onImage={setLogo} onBusy={setBusy} />
        <form className="inline-logo-link" onSubmit={e => { e.preventDefault(); const href = safeInlineUrl(link); if (link.trim() && !href) { setError("Enter a full https:// address, a relative path, or an email link."); return; } updateAttributes({href}); setError(""); }}>
          <label className="picker-field">Link (optional)<input value={link} inputMode="url" onChange={e => setLink(e.target.value)} placeholder="https://" /></label>
          <button className="admin-button" type="submit">Apply</button>
        </form>
        {error ? <p role="alert" className="field-error">{error}</p> : null}
        <div className="picker-footer"><button type="button" className="admin-button admin-button-quiet" disabled={busy} onClick={deleteNode}><Trash size={14} />Remove</button><Popover.Close className="admin-button admin-button-primary" disabled={busy}>Done</Popover.Close></div>
      </Popover.Popup></Popover.Positioner></Popover.Portal>
    </Popover.Root>
  </NodeViewWrapper>;
}

export const InlineLogo = Node.create({
  name: "inlineLogo", priority: 1100, inline: true, group: "inline", atom: true, marks: "",
  addAttributes: () => ({src: {default:""}, label: {default:"Logo and text"}, href: {default:""}}),
  parseHTML: () => [{tag:'img[data-inline-logo]', getAttrs: el => ({src:safeInlineUrl(el.getAttribute("src"),true),label:decodeLogoLabel(el.getAttribute("data-inline-logo") ?? ""),href:safeInlineUrl(el.getAttribute("data-logo-href"))})}],
  renderHTML: ({node}) => ["img", {src:safeInlineUrl(node.attrs.src,true),alt:node.attrs.label,"data-inline-logo":encodeURIComponent(node.attrs.label),"data-logo-href":safeInlineUrl(node.attrs.href)}],
  addNodeView: () => ReactNodeViewRenderer(LogoView),
  markdownTokenizer: {
    name:"inlineLogo", level:"inline", start: source => source.indexOf('<img data-inline-logo="'),
    tokenize: source => {
      const match = /^<img data-inline-logo="([^"]*)" src="([^"]*)" data-logo-href="([^"]*)" alt="[^"]*"\s*\/>/.exec(source);
      if (!match) return undefined;
      return {type:"inlineLogo",raw:match[0],label:decodeLogoLabel(match[1]),src:safeInlineUrl(decodeInline(match[2]),true),href:safeInlineUrl(decodeInline(match[3]))};
    },
  },
  parseMarkdown: token => ({type:"inlineLogo",attrs:{src:token.src,label:token.label,href:token.href}}),
  renderMarkdown: node => `<img data-inline-logo="${encodeURIComponent(node.attrs?.label ?? "")}" src="${escapeInline(safeInlineUrl(node.attrs?.src,true))}" data-logo-href="${escapeInline(safeInlineUrl(node.attrs?.href))}" alt="${escapeInline(node.attrs?.label)}" />`,
});
