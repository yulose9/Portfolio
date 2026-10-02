"use client";
import { Popover } from "@base-ui/react/popover";
import { useEditorState, type Editor } from "@tiptap/react";
import { TEXT_COLORS, textColor } from "../../../cms/inline";
import { findFont } from "../../../cms/fonts";
import { loadFont } from "./font-loader";
import { useEffect, useState, useRef } from "react";
import { ownInteraction } from "./editor-interactions";
import FontPicker from "./FontPicker";
import { ArrowCounterClockwise, X } from "@phosphor-icons/react";
import { Slider } from "../../components/kit/slider";
import { ColorPicker as KitColorPicker } from "../../components/kit/inputs/color-picker";

export default function ColorPicker({ editor }: { editor: Editor }) {
  const selected = useEditorState({
    editor,
    selector: ({ editor: e }) => textColor(e.getAttributes("textColor").color),
  });
  const appearance = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      font: e.getAttributes("textColor").font ?? "",
      opacity: e.getAttributes("textColor").opacity ?? 100,
    }),
  });
  const [open, setOpen] = useState(false);
  const interaction = useRef<ReturnType<typeof ownInteraction> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const lease = ownInteraction(editor, () => setOpen(false));
    interaction.current = lease;
    return () => {
      lease.release();
      interaction.current = null;
    };
  }, [editor, open]);
  const format = (attrs: Record<string, unknown> | null) => {
    if (!interaction.current?.restore()) {
      setError(
        "The selected text changed. Select it again to change its appearance.",
      );
      return;
    }
    if (attrs) editor.commands.setMark("textColor", attrs);
    else editor.commands.unsetMark("textColor");
  };
  useEffect(() => {
    if (open) loadFont(findFont(appearance.font));
  }, [open, appearance.font]);
  useEffect(() => {
    const loadUsed = () => {
      const used = new Set<string>();
      editor.state.doc.descendants((node) => {
        for (const mark of node.marks)
          if (mark.type.name === "textColor" && mark.attrs.font)
            used.add(mark.attrs.font);
      });
      for (const family of used) loadFont(findFont(family));
    };
    loadUsed();
    editor.on("update", loadUsed);
    return () => {
      editor.off("update", loadUsed);
    };
  }, [editor]);
  const apply = (color: string | null) => {
    format({ color });
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        setError("");
        setOpen(value);
      }}
    >
      <Popover.Trigger
        className="bubble-tool text-color-trigger"
        aria-label="Text appearance: font, color and opacity"
        title="Font, color and opacity"
        onMouseDown={(e) => e.preventDefault()}
      >
        <span style={{ borderBottomColor: selected ?? "currentColor" }}>A</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          positionMethod="fixed"
          sideOffset={8}
          collisionPadding={12}
          disableAnchorTracking
          className="menu-positioner"
        >
          <Popover.Popup
            className="menu-popup admin-popover color-panel"
            data-lenis-prevent
            finalFocus={() => editor.view.dom}
          >
            <div className="picker-heading">
              <Popover.Title>Text appearance</Popover.Title>
              <Popover.Close data-slot="popover-close"
                className="admin-icon-button"
                aria-label="Close text appearance"
              >
                <X size={15} />
              </Popover.Close>
            </div>
            {error ? <p role="alert">{error}</p> : null}
            <FontPicker
              label="Font"
              value={appearance.font}
              onChange={(font) => format({ font: font?.family ?? null })}
            />
            <div className="appearance-section-label">Text color</div>
            {/* The page's own colour is a choice of its own: no mark at all. */}
            <button
              type="button"
              className="color-option color-option-page"
              title="Page color"
              aria-label="Page color"
              aria-pressed={!selected}
              onClick={() => apply(null)}
            >
              A
            </button>
            {/* The kit's picker: saturation area, hue rail, hex and HSL fields,
                the named swatches, and the eyedropper where the browser has one. */}
            <KitColorPicker
              label="Text color"
              value={selected ?? "#52525b"}
              swatches={TEXT_COLORS.map(([name, color]) => ({ name, color }))}
              onChange={(next) => {
                const color = textColor(next);
                if (color) {
                  apply(color);
                  setError("");
                }
              }}
            />
            <label className="appearance-opacity">
              <span>
                Opacity<output>{appearance.opacity}%</output>
              </span>
              <Slider
                aria-label="Text opacity"
                min={0}
                max={100}
                value={appearance.opacity}
                onValueChange={(v) => format({ opacity: v })}
              />
            </label>
            <div className="picker-footer">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                onClick={() => {
                  format(null);
                  setError("");
                }}
              >
                <ArrowCounterClockwise size={14} />
                Reset
              </button>
              <Popover.Close data-slot="popover-close" className="admin-button admin-button-primary">
                Done
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
