"use client";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { uploadInlineLogo } from "../media";
import { beginPendingWork } from "../session";
import { decodeLogoLabel, safeInlineUrl } from "../../../../cms/inline";

export function HeadingIconPicker({value,onChange,children}:{value:string;onChange:(icon:string)=>void;children:React.ReactElement}) {
  const [emoji,setEmoji]=useState(safeInlineUrl(value,true)?"":value);
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  return <Popover.Root><Popover.Trigger render={children}/><Popover.Portal><Popover.Positioner className="menu-positioner" sideOffset={8} collisionPadding={12}><Popover.Popup className="menu-popup admin-popover inline-logo-panel">
    <Popover.Title>Heading icon</Popover.Title>
    <label>Emoji or symbol<input value={emoji} placeholder="✨" maxLength={16} onChange={e=>{setEmoji(e.target.value);if(e.target.value)onChange(e.target.value);}}/></label>
    <label>Upload an icon<input type="file" accept="image/*,.svg,.heic,.heif" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;const finish=beginPendingWork();setBusy(true);try{onChange(await uploadInlineLogo(file));setError("");}catch(error){setError(error instanceof Error?error.message:"Upload failed");}finally{finish();setBusy(false);}}}/></label>
    <p role="status">{busy?"Uploading…":error}</p><Popover.Close className="admin-button" onClick={()=>onChange("")}>Remove icon</Popover.Close><Popover.Close className="admin-button">Done</Popover.Close>
  </Popover.Popup></Popover.Positioner></Popover.Portal></Popover.Root>;
}
export function HeadingGlyph({value}:{value:string}) {
  return safeInlineUrl(value,true) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="heading-icon-image" src={safeInlineUrl(value,true)} alt=""/>
  ) : <span aria-hidden="true">{value||"＋"}</span>;
}
function View({node,updateAttributes,deleteNode}:NodeViewProps){return <NodeViewWrapper as="span" className="heading-icon" contentEditable={false}><HeadingIconPicker value={node.attrs.icon} onChange={icon=>icon?updateAttributes({icon}):deleteNode()}><button type="button" className="heading-icon-trigger" aria-label="Edit heading icon"><HeadingGlyph value={node.attrs.icon}/></button></HeadingIconPicker></NodeViewWrapper>;}
export const HeadingIcon=Node.create({
  name:"headingIcon",priority:1200,inline:true,group:"inline",atom:true,
  addAttributes:()=>({icon:{default:"✨"}}),
  parseHTML:()=>[{tag:"img[data-heading-icon]",getAttrs:el=>({icon:decodeLogoLabel(el.getAttribute("data-heading-icon")??"")})}],
  renderHTML:({node})=>["img",{"data-heading-icon":encodeURIComponent(node.attrs.icon),alt:""}],
  addNodeView:()=>ReactNodeViewRenderer(View),
  markdownTokenizer:{name:"headingIcon",level:"inline",start:source=>source.indexOf('<img data-heading-icon="'),tokenize:source=>{const m=/^<img data-heading-icon="([^"]*)" alt=""\s*\/>/.exec(source);return m?{type:"headingIcon",raw:m[0],icon:decodeLogoLabel(m[1])}:undefined;}},
  parseMarkdown:token=>({type:"headingIcon",attrs:{icon:token.icon}}),
  renderMarkdown:node=>`<img data-heading-icon="${encodeURIComponent(node.attrs?.icon??"")}" alt="" />`,
});
