"use client";

import { Menu } from "@base-ui/react/menu";
import { createRoot } from "react-dom/client";

import type { TableStyle, TableWidth } from "../../../../cms/blocks";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../components/kit/menu";

/*
 * The table toolbar's style and width picker: the kit's dropdown menu, each
 * choice drawn as a tiny table so you can see what it does before you pick
 * it, a tick on the current one. Keyboard, typeahead and focus are Base UI's.
 *
 * The toolbar itself is plain DOM (table-plus.ts), so this mounts its own
 * small React root inside it and is re-rendered whenever the table changes.
 */

export const STYLE_LABEL: Record<TableStyle, string> = { default: "Default", minimal: "Minimal", striped: "Striped", bordered: "Bordered", data: "Data table" };
const STYLE_HINT: Record<TableStyle, string> = {
  default: "Framed, a shaded header",
  minimal: "Rules between rows only",
  striped: "Every other row shaded",
  bordered: "Every cell ruled",
  data: "Sortable and filterable",
};
export const WIDTH_LABEL: Record<TableWidth, string> = { fit: "Fit text width", wide: "Wide" };
const WIDTH_HINT: Record<TableWidth, string> = { fit: "Stays in the column, text wraps", wide: "Breaks out past the text" };

/** A 28×20 sketch of a table in each style. */
function StylePreview({ style }: { style: TableStyle }) {
  const framed = style !== "minimal";
  const rows = [8, 12.5, 17];
  return (
    <svg className="table-menu-preview" viewBox="0 0 28 20" aria-hidden="true">
      {framed ? <rect x="0.5" y="0.5" width="27" height="19" rx="3" fill="#fff" stroke="#d4d4d8" /> : null}
      {style === "default" || style === "data" ? <path d="M1 3.5a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3V6H1z" fill="#ececee" /> : null}
      {style === "bordered" ? <path d="M1 1h26v5H1z" fill="#ececee" /> : null}
      {style === "striped" ? <path d="M1 10.25h26v4.5H1z" fill="#f0f0f2" /> : null}
      {style === "minimal" ? <path d="M1 6h26" stroke="#a1a1aa" strokeWidth="1" /> : null}
      {style !== "striped"
        ? rows.slice(style === "minimal" ? 1 : 0, 2).map((y) => <path key={y} d={`M1 ${y + 2.25}h26`} stroke="#e4e4e7" strokeWidth="0.75" />)
        : null}
      {style === "bordered" ? <path d="M10 1v18M18.5 1v18M1 10.25h26M1 14.75h26" stroke="#e4e4e7" strokeWidth="0.75" /> : null}
      {/* The cells' words: short bars; the data table's numbers sit right. */}
      {[3.25, ...rows].map((y, r) =>
        [3, 11.5, 20].map((x, c) => {
          const w = style === "data" && c === 2 && r > 0 ? 3.5 : r === 0 ? 4.5 : 5.5;
          const at = style === "data" && c === 2 && r > 0 ? 24.5 - w : x + (style === "minimal" ? -1.5 : 0);
          return <rect key={`${r}-${c}`} x={at} y={y - 0.6} width={w} height="1.2" rx="0.6" fill={r === 0 ? "#71717a" : "#a1a1aa"} />;
        }),
      )}
    </svg>
  );
}

/** A 28×20 sketch of the table against the lines of text around it. */
function WidthPreview({ width }: { width: TableWidth }) {
  const box = width === "wide" ? { x: 0.5, w: 27 } : { x: 6.5, w: 15 };
  return (
    <svg className="table-menu-preview" viewBox="0 0 28 20" aria-hidden="true">
      <path d="M6.5 2.5h15M6.5 17.5h10" stroke="#d4d4d8" strokeWidth="1.2" strokeLinecap="round" />
      <rect x={box.x} y="6" width={box.w} height="8" rx="1.5" fill="#fff" stroke="#a1a1aa" />
      <path d={`M${box.x} 9h${box.w}`} stroke="#d4d4d8" strokeWidth="0.75" />
    </svg>
  );
}

const Tick = () => (
  <Menu.RadioItemIndicator keepMounted className="kit-menu-indicator">
    <svg viewBox="-0.3 -0.3 11 8.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
      <path d="M1 4L3.8 7L9.4 1" />
    </svg>
  </Menu.RadioItemIndicator>
);

function Choice({ value, label, hint, preview }: { value: string; label: string; hint: string; preview: React.ReactNode }) {
  return (
    <Menu.RadioItem value={value} data-checkable="" className="kit-menu-item table-menu-item" closeOnClick>
      {preview}
      <span className="table-menu-text">
        <span>{label}</span>
        <span className="table-menu-hint">{hint}</span>
      </span>
      <Tick />
    </Menu.RadioItem>
  );
}

export type TableMenuProps = {
  style: TableStyle;
  width: TableWidth;
  styles: readonly TableStyle[];
  widths: readonly TableWidth[];
  onStyle: (style: TableStyle) => void;
  onWidth: (width: TableWidth) => void;
  onOpenChange: (open: boolean) => void;
  /** Where the caret goes back to after a choice made with the pointer. */
  focusEditor: () => void;
};

function TableMenu(p: TableMenuProps) {
  return (
    <DropdownMenu modal={false} onOpenChange={(open) => p.onOpenChange(open)}>
      <DropdownMenuTrigger
        className="table-style-trigger"
        aria-label={`Table style: ${STYLE_LABEL[p.style]}, ${WIDTH_LABEL[p.width].toLowerCase()}`}
        title="Style and width"
      >
        <StylePreview style={p.style} />
        <span>{STYLE_LABEL[p.style]}</span>
        {p.width === "wide" ? <span className="table-style-badge">Wide</span> : null}
        <svg className="table-style-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4.5 6.5 3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="table-menu"
        sideOffset={6}
        // A choice made with the pointer puts the caret back in its cell;
        // from the keyboard, focus goes back to the toolbar's button.
        finalFocus={(type) => {
          if (type === "keyboard") return true;
          p.focusEditor();
          return false;
        }}
      >
        {/* A label has to sit inside its group (Base UI throws otherwise); it names the group too. */}
        <DropdownMenuRadioGroup value={p.style} onValueChange={(v) => p.onStyle(v as TableStyle)}>
          <DropdownMenuLabel>Style</DropdownMenuLabel>
          {p.styles.map((s) => (
            <Choice key={s} value={s} label={STYLE_LABEL[s]} hint={STYLE_HINT[s]} preview={<StylePreview style={s} />} />
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={p.width} onValueChange={(v) => p.onWidth(v as TableWidth)}>
          <DropdownMenuLabel>Width</DropdownMenuLabel>
          {p.widths.map((w) => (
            <Choice key={w} value={w} label={WIDTH_LABEL[w]} hint={WIDTH_HINT[w]} preview={<WidthPreview width={w} />} />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mounts the picker into `host`; `render` again with new props, `destroy` when the table goes. */
export function mountTableMenu(host: HTMLElement, props: TableMenuProps) {
  const root = createRoot(host);
  root.render(<TableMenu {...props} />);
  return {
    render: (next: TableMenuProps) => root.render(<TableMenu {...next} />),
    // Unmounting while React is mid-render (a node view torn down inside a
    // transaction) warns; a microtask later it's safe.
    destroy: () => queueMicrotask(() => root.unmount()),
  };
}
