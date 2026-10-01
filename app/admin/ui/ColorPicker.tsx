"use client";
import { Popover } from "@base-ui/react/popover";
import { HexColorPicker } from "react-colorful";
import { useEditorState, type Editor } from "@tiptap/react";
import { TEXT_COLORS, textColor } from "../../../cms/inline";
import { findFont } from "../../../cms/fonts";
import { loadFont } from "./font-loader";
import { useEffect, useState, useRef } from "react";
import { ownInteraction } from "./editor-interactions";
import FontPicker from "./FontPicker";
import { ArrowCounterClockwise, X } from "@phosphor-icons/react";

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
  const [hex, setHex] = useState({
    base: selected,
    value: selected ?? "#52525b",
    edited: false,
  });
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
            <HexColorPicker color={selected ?? "#52525b"} onChange={apply} />
            <div className="color-options" role="group" aria-label="Text color">
              <button
                type="button"
                className="color-option"
                title="Page color"
                aria-label="Page color"
                aria-pressed={!selected}
                onClick={() => apply(null)}
              >
                A
              </button>
              {TEXT_COLORS.map(([name, color]) => (
                <button
                  type="button"
                  key={color}
                  className="color-option"
                  title={name}
                  aria-label={name}
                  aria-pressed={selected === color}
                  onClick={() => apply(color)}
                >
                  <span
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <div className="appearance-custom">
              <label>
                Hex
                <input
                  spellCheck={false}
                  aria-label="Hex text color"
                  value={
                    hex.base === selected ? hex.value : (selected ?? "#52525b")
                  }
                  maxLength={7}
                  onChange={(e) =>
                    setHex({ base: selected, value: e.target.value, edited: true })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const color = textColor(e.currentTarget.value);
                      if (color) {
                        apply(color);
                        setError("");
                      } else
                        setError(
                          "Enter a six-digit hex color, such as #52525b.",
                        );
                    }
                  }}
                  onBlur={(e) => {
                    // Only a value that was typed here is applied: tabbing
                    // through the field must not paint the default grey onto
                    // text that had no colour.
                    if (hex.base !== selected || !hex.edited) return;
                    const color = textColor(e.target.value);
                    if (color) {
                      apply(color);
                      setError("");
                    } else
                      setError("Enter a six-digit hex color, such as #52525b.");
                  }}
                />
              </label>
            </div>
            <label className="appearance-opacity">
              <span>
                Opacity<output>{appearance.opacity}%</output>
              </span>
              <input
                type="range"
                aria-label="Text opacity"
                min="0"
                max="100"
                value={appearance.opacity}
                onChange={(e) => format({ opacity: Number(e.target.value) })}
              />
            </label>
            <div className="picker-footer">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                onClick={() => {
                  format(null);
                  setHex({ base: null, value: "#52525b", edited: false });
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
