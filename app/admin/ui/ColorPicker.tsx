"use client";
import { Popover } from "@base-ui/react/popover";
import { useEditorState, type Editor } from "@tiptap/react";
import { TEXT_COLORS, textColor } from "../../../cms/inline";

export default function ColorPicker({editor}: {editor: Editor}) {
  const selected = useEditorState({editor, selector: ({editor:e}) => textColor(e.getAttributes("textColor").color)});
  const apply = (color: string | null) => {
    if (color) editor.chain().focus().setMark("textColor", {color}).run();
    else editor.chain().focus().unsetMark("textColor").run();
  };
  return <Popover.Root><Popover.Trigger className="bubble-tool text-color-trigger" aria-label="Text color" title="Text color" onMouseDown={e => e.preventDefault()}>
    <span style={{borderBottomColor:selected ?? "currentColor"}}>A</span>
  </Popover.Trigger><Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="menu-positioner">
    <Popover.Popup className="menu-popup admin-popover color-panel">
      <Popover.Title>Text color</Popover.Title>
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
