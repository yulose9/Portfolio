"use client";
import { getMarkRange } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeInlineUrl } from "../../../cms/inline";
import { editableLink } from "./editable-link";

type Target = {from:number; to:number; href:string; left:number; top:number};
export default function LinkHover({editor}: {editor:Editor}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [editing, setEditing] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  const closeLater = useCallback(() => {
    cancel(); timer.current = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) { setTarget(null); setEditing(false); }
    }, 250);
  }, [cancel]);
  useEffect(() => {
    const dom = editor.view.dom;
    const show = (event: Event) => {
      const a = editableLink(dom, event.target);
      if (!a) return;
      const pos = editor.view.posAtDOM(a, 0);
      const range = getMarkRange(editor.state.doc.resolve(pos), editor.schema.marks.link);
      if (!range) return;
      cancel();
      setEditing(false);
      const rect = a.getBoundingClientRect();
      setTarget(current => current?.from === range.from && current?.to === range.to ? current : {...range,href:a.getAttribute("href") ?? "",left:Math.max(12,Math.min(rect.left,window.innerWidth-332)),top:Math.max(12,Math.min(rect.bottom+6,window.innerHeight-200))});
    };
    const click = (event: MouseEvent) => { if (editableLink(dom, event.target)) { event.preventDefault(); show(event); } };
    const hide = () => { setTarget(null); setEditing(false); };
    const update = ({transaction}: {transaction:{docChanged:boolean}}) => { if(transaction.docChanged) hide(); };
    const key = (event:KeyboardEvent) => { if(event.key==="Escape") hide(); };
    dom.addEventListener("mouseover",show); dom.addEventListener("focusin",show); dom.addEventListener("click",click);
    dom.addEventListener("mouseout",closeLater);
    window.addEventListener("scroll",hide,true); window.addEventListener("resize",hide); window.addEventListener("keydown",key);
    editor.on("transaction",update);
    return () => { cancel(); dom.removeEventListener("mouseover",show); dom.removeEventListener("focusin",show); dom.removeEventListener("click",click); dom.removeEventListener("mouseout",closeLater); window.removeEventListener("scroll",hide,true); window.removeEventListener("resize",hide); window.removeEventListener("keydown",key); editor.off("transaction",update); };
  }, [editor, cancel, closeLater]);
  useEffect(() => { if(editing) input.current?.focus(); }, [editing]);
  if (!target) return null;
  return <div ref={panel} className="link-hover menu-popup" role="dialog" aria-label="Link" style={{left:target.left,top:target.top}} onMouseEnter={cancel} onMouseLeave={closeLater}>
    {editing ? <form onSubmit={event => {
      event.preventDefault();
      const value = safeInlineUrl(href);
      if (!value) { setError("Enter a valid link, including https:// for websites."); return; }
      editor.chain().focus().setTextSelection({from:target.from,to:target.to}).setLink({href:value}).run();
      setTarget(null); setEditing(false);
    }}><label>Link address<input ref={input} value={href} onChange={e => setHref(e.target.value)} /></label>
      {error ? <p role="alert">{error}</p> : null}<button className="admin-button" type="submit">Save link</button></form> : <>
      <a className="link-hover-address" href={safeInlineUrl(target.href)} target="_blank" rel="noopener noreferrer">{target.href}</a>
      <div className="session-actions"><button type="button" className="admin-button" onClick={() => {setHref(target.href);setError("");setEditing(true);}}>Edit link</button>
        <button type="button" className="admin-button" onClick={() => {editor.chain().focus().setTextSelection({from:target.from,to:target.to}).unsetLink().run();setTarget(null);}}>Remove link</button></div>
    </>}
  </div>;
}
