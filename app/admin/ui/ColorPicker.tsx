"use client";
import { Popover } from "@base-ui/react/popover";
import { useEditorState, type Editor } from "@tiptap/react";
import { TEXT_COLORS, textColor } from "../../../cms/inline";
import { FONT_SHELF, fontStack } from "../../../cms/fonts";
import { loadFont } from "./MetaEditors";
import { useEffect, useState, useRef } from "react";
import { ownInteraction } from "./editor-interactions";

export default function ColorPicker({editor}: {editor: Editor}) {
  const selected = useEditorState({editor, selector: ({editor:e}) => textColor(e.getAttributes("textColor").color)});
  const appearance=useEditorState({editor,selector:({editor:e})=>({font:e.getAttributes("textColor").font??"",opacity:e.getAttributes("textColor").opacity??100})});
  const [open,setOpen]=useState(false);
  const interaction=useRef<ReturnType<typeof ownInteraction>|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{if(!open)return;const lease=ownInteraction(editor,()=>setOpen(false));interaction.current=lease;return()=>{lease.release();interaction.current=null;};},[editor,open]);
  const format=(attrs:Record<string,unknown>|null)=>{
    if(!interaction.current?.restore()){setError("The selected text changed. Select it again to change its appearance.");return;}
    if(attrs)editor.commands.setMark("textColor",attrs);else editor.commands.unsetMark("textColor");
  };
  const [fontQuery,setFontQuery]=useState("");
  const [hex,setHex]=useState({base:selected,value:selected ?? "#52525b"});
  useEffect(()=>{if(open)FONT_SHELF.forEach(loadFont);},[open]);
  useEffect(()=>{
    const loadUsed=()=>{const used=new Set<string>();editor.state.doc.descendants(node=>{for(const mark of node.marks)if(mark.type.name==="textColor"&&mark.attrs.font)used.add(mark.attrs.font);});for(const font of FONT_SHELF)if(used.has(font.family))loadFont(font);};
    loadUsed();editor.on("update",loadUsed);return()=>{editor.off("update",loadUsed);};
  },[editor]);
  const apply = (color: string | null) => {
    format({color});
  };
  const matchingFonts = FONT_SHELF.filter(font=>font.family.toLowerCase().includes(fontQuery.toLowerCase()));
  return <Popover.Root open={open} onOpenChange={value=>{setError("");setOpen(value);}}><Popover.Trigger className="bubble-tool text-color-trigger" aria-label="Text appearance: font, color and opacity" title="Font, color and opacity" onMouseDown={e => e.preventDefault()}>
    <span style={{borderBottomColor:selected ?? "currentColor"}}>A</span>
  </Popover.Trigger><Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner">
    <Popover.Popup className="menu-popup admin-popover color-panel">
      <div className="appearance-title"><Popover.Title>Text appearance</Popover.Title><Popover.Close aria-label="Close text appearance">×</Popover.Close></div>
      {error?<p role="alert">{error}</p>:null}
      <details className="appearance-fonts">
        <summary><span>Font</span><strong style={{fontFamily:appearance.font ? fontStack({family:appearance.font,source:"google"}) : undefined}}>{appearance.font || "Page font"}</strong><span aria-hidden="true">⌄</span></summary>
        <input type="search" aria-label="Find a font" placeholder="Find a font…" value={fontQuery} onChange={e=>setFontQuery(e.target.value)} />
        <div className="appearance-font-list" role="group" aria-label="Font family" data-lenis-prevent>
          <button type="button" aria-pressed={!appearance.font} onClick={()=>format({font:null})}>Page font<span>Default</span></button>
          {matchingFonts.map(font=><button type="button" key={font.family} aria-pressed={appearance.font===font.family} style={{fontFamily:fontStack(font)}} onClick={()=>format({font:font.family})}>{font.family}<span>{font.kind}</span></button>)}
          {!matchingFonts.length ? <p role="status">No matching fonts. Try another name.</p> : null}
        </div>
      </details>
      <div className="appearance-section-label">Text color</div>
      <div className="color-options" role="group" aria-label="Text color">
        <button type="button" className="color-option" title="Page color" aria-label="Page color" aria-pressed={!selected} onClick={() => apply(null)}>A</button>
        {TEXT_COLORS.map(([name,color]) => <button type="button" key={color} className="color-option" title={name} aria-label={name} aria-pressed={selected===color} onClick={() => apply(color)}>
          <span className="color-swatch" style={{backgroundColor:color}} aria-hidden="true" />
        </button>)}
      </div>
      <div className="appearance-custom"><input type="color" aria-label="Choose custom text color" value={selected ?? "#52525b"} onChange={e=>apply(e.target.value)} /><label>Hex<input spellCheck={false} aria-label="Hex text color" value={hex.base===selected?hex.value:selected ?? "#52525b"} maxLength={7} onChange={e=>{setHex({base:selected,value:e.target.value});const color=textColor(e.target.value);if(color)apply(color);}} onBlur={()=>setHex({base:selected,value:selected ?? "#52525b"})} /></label></div>
      <label className="appearance-opacity"><span>Opacity<output>{appearance.opacity}%</output></span><input type="range" min="0" max="100" value={appearance.opacity} onChange={e=>format({opacity:Number(e.target.value)})}/></label>
      <button type="button" className="appearance-reset" onClick={()=>format(null)}>Reset text appearance</button>
    </Popover.Popup>
  </Popover.Positioner></Popover.Portal></Popover.Root>;
}
