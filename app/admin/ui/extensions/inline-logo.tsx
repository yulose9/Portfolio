"use client";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { safeInlineUrl, escapeInline, decodeInline, decodeLogoLabel } from "../../../../cms/inline";
import { uploadInlineLogo } from "../media";
import { beginPendingWork } from "../session";

function LogoView({node, updateAttributes, deleteNode}: NodeViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState(String(node.attrs.href ?? ""));
  return <NodeViewWrapper as="span" className="inline-logo-editor" contentEditable={false}>
    <Popover.Root><Popover.Trigger className="inline-logo-trigger" aria-label={`Edit logo and text: ${node.attrs.label}`}>
      {node.attrs.src ? (
        // Tiny, client-uploaded assets are already resized before upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeInlineUrl(node.attrs.src, true)} alt="" />
      ) : <span aria-hidden="true">＋</span>}
      <span>{node.attrs.label || "Logo and text"}</span>
    </Popover.Trigger>
      <Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner"><Popover.Popup className="menu-popup admin-popover inline-logo-panel">
        <Popover.Title>Logo and text</Popover.Title>
        <label>Text<input maxLength={200} value={node.attrs.label} onChange={e => updateAttributes({label:e.target.value})} /></label>
        <label>Logo<input type="file" accept="image/*,.heic,.heif,.svg" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
          setBusy(true); setError("");
          const finish = beginPendingWork();
          try { const src = await uploadInlineLogo(file); updateAttributes({src}); }
          catch (err) { setError(err instanceof Error ? err.message : "Couldn't read this image."); }
          finally { finish(); setBusy(false); }
        }} /></label>
        <form onSubmit={e => { e.preventDefault(); const href = safeInlineUrl(link); if (link.trim() && !href) { setError("Enter a full https:// address, a relative path, or an email link."); return; } updateAttributes({href}); setError(""); }}>
          <label>Link (optional)<input value={link} onChange={e => setLink(e.target.value)} placeholder="https://" /></label>
          <button className="admin-button" type="submit">Apply link</button>
        </form>
        <p role="status">{busy ? "Preparing logo…" : error || "The logo follows the surrounding text size."}</p>
        <div className="session-actions"><button type="button" className="admin-button" disabled={busy} onClick={deleteNode}>Remove</button><Popover.Close className="admin-button">Done</Popover.Close></div>
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
