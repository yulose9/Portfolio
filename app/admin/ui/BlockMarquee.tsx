"use client";
import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import { NodeRangeSelection } from "@tiptap/extension-node-range";

type Rect = {left:number;top:number;right:number;bottom:number};
export const intersectsBlock = (box:Rect, block:Rect) => block.right >= box.left && block.left <= box.right && block.bottom >= box.top && block.top <= box.bottom;

/** Start in the gutter (or Alt-drag) to select every block touched by the rectangle. */
export default function BlockMarquee({editor}:{editor:Editor}) {
  useEffect(() => {
    const root=editor.view.dom.closest(".editor-root");
    if (!root) return;
    let cleanup=()=>{};
    const down=(event:Event)=>{
      const e=event as PointerEvent;
      if(e.button!==0 || e.pointerType==="touch" || (e.target as Element).closest("button,a,input,textarea,[data-resize-handle],.menu-popup"))return;
      const bounds=editor.view.dom.getBoundingClientRect();
      if(e.clientY<bounds.top || e.clientY>bounds.bottom+40)return;
      if(!e.altKey && e.clientX>bounds.left && e.clientX<bounds.right && e.target!==editor.view.dom)return;
      cleanup();
      const start={x:e.pageX,y:e.pageY};let point={x:e.clientX,y:e.clientY};let active=false;let frame=0;
      const box=document.createElement("div");box.className="block-marquee";box.setAttribute("aria-hidden","true");
      const original=editor.state.selection;
      const draw=()=>{
        const x=start.x-window.scrollX,y=start.y-window.scrollY;
        if(!active && Math.hypot(point.x-x,point.y-y)<5)return;
        active=true;if(!box.isConnected)document.body.appendChild(box);
        const left=Math.min(x,point.x),top=Math.min(y,point.y),right=Math.max(x,point.x),bottom=Math.max(y,point.y);
        Object.assign(box.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
        let from:number|null=null,to=0;
        editor.state.doc.forEach((node,pos)=>{
          const dom=editor.view.nodeDOM(pos);if(!(dom instanceof HTMLElement))return;
          const r=dom.getBoundingClientRect();
          if(intersectsBlock({left,top,right,bottom},r)){from??=pos;to=pos+node.nodeSize;}
        });
        if(from!==null)editor.view.dispatch(editor.state.tr.setSelection(NodeRangeSelection.create(editor.state.doc,from,to,0)));
        else if(original.$from.doc===editor.state.doc)editor.view.dispatch(editor.state.tr.setSelection(original));
      };
      const move=(ev:PointerEvent)=>{if(ev.pointerId!==e.pointerId)return;point={x:ev.clientX,y:ev.clientY};ev.preventDefault();draw();};
      const tick=()=>{if(active){const delta=point.y<64?-12:point.y>innerHeight-64?12:0;if(delta){window.scrollBy(0,delta);draw();}}frame=requestAnimationFrame(tick);};
      const end=()=>{cleanup();if(active)editor.view.focus();};
      const key=(ev:KeyboardEvent)=>{if(ev.key==="Escape"){editor.view.dispatch(editor.state.tr.setSelection(original));cleanup();}};
      cleanup=()=>{box.remove();cancelAnimationFrame(frame);document.body.classList.remove("is-block-selecting");window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);window.removeEventListener("keydown",key);};
      document.body.classList.add("is-block-selecting");
      window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end,{once:true});window.addEventListener("pointercancel",end,{once:true});window.addEventListener("keydown",key);frame=requestAnimationFrame(tick);
    };
    root.addEventListener("pointerdown",down);
    return()=>{cleanup();root.removeEventListener("pointerdown",down);};
  },[editor]);
  return null;
}
