"use client";
import { Popover } from "@base-ui/react/popover";
import { useEditorState, type Editor } from "@tiptap/react";
import { TEXT_COLORS, textColor } from "../../../cms/inline";
import { FONT_SHELF } from "../../../cms/fonts";
import { loadFont } from "./MetaEditors";
import { useEffect, useState } from "react";

export default function ColorPicker({editor}: {editor: Editor}) {
  const selected = useEditorState({editor, selector: ({editor:e}) => textColor(e.getAttributes("textColor").color)});
  const appearance=useEditorState({editor,selector:({editor:e})=>({font:e.getAttributes("textColor").font??"",opacity:e.getAttributes("textColor").opacity??100})});
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(open)FONT_SHELF.forEach(loadFont);},[open]);
  useEffect(()=>{
    const loadUsed=()=>{const used=new Set<string>();editor.state.doc.descendants(node=>{for(const mark of node.marks)if(mark.type.name==="textColor"&&mark.attrs.font)used.add(mark.attrs.font);});for(const font of FONT_SHELF)if(used.has(font.family))loadFont(font);};
    loadUsed();editor.on("update",loadUsed);return()=>{editor.off("update",loadUsed);};
  },[editor]);
  const apply = (color: string | null) => {
    if (color) editor.chain().focus().setMark("textColor", {color}).run();
    else editor.chain().focus().setMark("textColor",{color:null}).run();
  };
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger className="bubble-tool text-color-trigger" aria-label="Text appearance: font, color and opacity" title="Font, color and opacity" onMouseDown={e => e.preventDefault()}>
    <span style={{borderBottomColor:selected ?? "currentColor"}}>A</span>
  </Popover.Trigger><Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner">
    <Popover.Popup className="menu-popup admin-popover color-panel">
      <Popover.Title>Text appearance</Popover.Title>
      <label className="appearance-field">Font<select value={appearance.font} onChange={e=>editor.commands.setMark("textColor",{font:e.target.value||null})}><option value="">Page font</option>{FONT_SHELF.map(font=><option key={font.family} value={font.family}>{font.family}</option>)}</select></label>
      <label className="appearance-field">Opacity <input type="range" min="0" max="100" value={appearance.opacity} onChange={e=>editor.commands.setMark("textColor",{opacity:Number(e.target.value)})}/><span>{appearance.opacity}%</span></label>
      <div className="color-options">
        <Popover.Close className="color-option" aria-pressed={!selected} onClick={() => apply(null)}>Default</Popover.Close>
        {TEXT_COLORS.map(([name,color]) => <Popover.Close key={color} className="color-option" aria-pressed={selected===color} onClick={() => apply(color)}>
          <span className="color-swatch" style={{backgroundColor:color}} aria-hidden="true" />{name}
        </Popover.Close>)}
      </div>
      <label className="custom-color">Custom color<input type="color" value={selected ?? "#52525b"} onChange={e => editor.commands.setMark("textColor", {color:e.target.value})} /></label>
    </Popover.Popup>
  </Popover.Positioner></Popover.Portal></Popover.Root>;
}
