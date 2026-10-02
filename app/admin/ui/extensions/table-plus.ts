import type { Editor } from "@tiptap/core";
import { TableView } from "@tiptap/extension-table";
import type { Node as PMNode } from "@tiptap/pm/model";
import { selectedRect, TableMap } from "@tiptap/pm/tables";
import type { EditorView, ViewMutationRecord } from "@tiptap/pm/view";

import { TABLE_STYLES, type TableStyle } from "../../../../cms/blocks";
import { TableStyled } from "./blocks-schema";

/*
 * Tables, in the editor: Tiptap's table (Tab / Shift-Tab move between cells,
 * Tab in the last cell adds a row; columns resize by dragging their edge)
 * with a toolbar over the table you're in: rows and columns in and out,
 * header row and column, the column's alignment (written into the GFM
 * delimiter row), and the table's style:
 *
 *   default · minimal · striped · bordered · data (sortable on the site)
 *
 * The toolbar is plain DOM, part of the table's node view; it shows while
 * the caret is in the table (the block gets .is-current, see blocks.ts).
 * Column widths are kept while editing only: Markdown tables have none.
 */

const STYLE_LABEL: Record<TableStyle, string> = { default: "Default", minimal: "Minimal", striped: "Striped", bordered: "Bordered", data: "Data table" };

const svg = (d: string) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON = {
  rowAbove: svg("M2.5 9.5h11v4h-11zM8 2.5v4M6 4.5h4"),
  rowBelow: svg("M2.5 2.5h11v4h-11zM8 9.5v4M6 11.5h4"),
  colLeft: svg("M9.5 2.5h4v11h-4zM2.5 8h4M4.5 6v4"),
  colRight: svg("M2.5 2.5h4v11h-4zM9.5 8h4M11.5 6v4"),
  delRow: svg("M2.5 5.5h11v5h-11zM6.5 13.5l3-3M9.5 13.5l-3-3"),
  delCol: svg("M5.5 2.5h5v11h-5zM12 6.5l2 2m0-2-2 2"),
  headRow: svg("M2.5 2.5h11v11h-11zM2.5 6h11M2.5 2.5h11v3.5h-11z"),
  headCol: svg("M2.5 2.5h11v11h-11zM6 2.5v11"),
  left: svg("M2.5 4h11M2.5 8h7M2.5 12h9"),
  center: svg("M2.5 4h11M4.5 8h7M3.5 12h9"),
  right: svg("M2.5 4h11M6.5 8h7M4.5 12h9"),
  trash: svg("M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"),
};

type Align = "left" | "center" | "right" | null;

/** Sets the alignment of every cell in the columns the selection touches. */
export function alignColumns(editor: Editor, align: Align): boolean {
  const { state } = editor;
  let rect;
  try {
    rect = selectedRect(state);
  } catch {
    return false;
  }
  const tr = state.tr;
  const done = new Set<number>();
  for (let row = 0; row < rect.map.height; row++) {
    for (let col = rect.left; col < rect.right; col++) {
      const pos = rect.map.map[row * rect.map.width + col];
      if (done.has(pos)) continue;
      done.add(pos);
      const cell = rect.table.nodeAt(pos);
      if (cell) tr.setNodeMarkup(rect.tableStart + pos, undefined, { ...cell.attrs, align });
    }
  }
  editor.view.dispatch(tr);
  return true;
}

/** The alignment of the column the caret is in. */
function currentAlign(editor: Editor): Align {
  try {
    const rect = selectedRect(editor.state);
    const pos = rect.map.map[rect.top * rect.map.width + rect.left];
    return (rect.table.nodeAt(pos)?.attrs.align as Align) ?? null;
  } catch {
    return null;
  }
}

export class StyledTableView extends TableView {
  toolbar: HTMLDivElement;
  select: HTMLSelectElement;
  editorView: EditorView | undefined;

  constructor(node: PMNode, cellMinWidth: number, view?: EditorView, HTMLAttributes: Record<string, unknown> = {}) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.editorView = view;
    const wrapper = this.dom;
    const outer = document.createElement("div");
    outer.className = "table-block";
    this.toolbar = document.createElement("div");
    this.toolbar.className = "table-toolbar";
    this.toolbar.contentEditable = "false";
    this.toolbar.setAttribute("role", "toolbar");
    this.toolbar.setAttribute("aria-label", "Table");
    this.select = document.createElement("select");
    this.select.className = "table-style-select";
    this.select.setAttribute("aria-label", "Table style");
    for (const style of TABLE_STYLES) this.select.add(new Option(STYLE_LABEL[style], style));
    this.select.addEventListener("change", () => this.setStyle(this.select.value as TableStyle));
    this.toolbar.append(this.select, this.sep());
    const add = (label: string, icon: string, run: (e: Editor) => boolean, extra?: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `table-tool${extra ? ` ${extra}` : ""}`;
      b.setAttribute("aria-label", label);
      b.title = label;
      b.innerHTML = icon;
      // Keep the caret in its cell: the commands act on it.
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const editor = this.editor();
        if (editor) run(editor);
        this.sync();
      });
      this.toolbar.append(b);
      return b;
    };
    add("Add row above", ICON.rowAbove, (e) => e.chain().focus().addRowBefore().run());
    add("Add row below", ICON.rowBelow, (e) => e.chain().focus().addRowAfter().run());
    add("Add column left", ICON.colLeft, (e) => e.chain().focus().addColumnBefore().run());
    add("Add column right", ICON.colRight, (e) => e.chain().focus().addColumnAfter().run());
    this.toolbar.append(this.sep());
    add("Header row", ICON.headRow, (e) => e.chain().focus().toggleHeaderRow().run(), "table-tool-toggle");
    add("Header column", ICON.headCol, (e) => e.chain().focus().toggleHeaderColumn().run(), "table-tool-toggle");
    this.toolbar.append(this.sep());
    for (const [align, icon, label] of [["left", ICON.left, "Align column left"], ["center", ICON.center, "Center column"], ["right", ICON.right, "Align column right"]] as const) {
      const b = add(label, icon, (e) => alignColumns(e, currentAlign(e) === align ? null : align), "table-tool-toggle");
      b.dataset.align = align;
    }
    this.toolbar.append(this.sep());
    add("Delete row", ICON.delRow, (e) => e.chain().focus().deleteRow().run(), "table-tool-danger");
    add("Delete column", ICON.delCol, (e) => e.chain().focus().deleteColumn().run(), "table-tool-danger");
    add("Delete table", ICON.trash, (e) => e.chain().focus().deleteTable().run(), "table-tool-danger");

    outer.append(this.toolbar, wrapper);
    this.dom = outer;
    this.applyStyle(node);
    this.toolbar.addEventListener("focusin", () => this.sync());
    outer.addEventListener("mouseenter", () => this.sync());
  }

  private sep() {
    const s = document.createElement("span");
    s.className = "table-tool-sep";
    s.setAttribute("aria-hidden", "true");
    return s;
  }

  private editor(): Editor | undefined {
    return (this.editorView?.dom as (HTMLElement & { editor?: Editor }) | undefined)?.editor;
  }

  private pos(): number | null {
    const view = this.editorView;
    if (!view) return null;
    const at = view.posAtDOM(this.table, 0);
    const $at = view.state.doc.resolve(at);
    for (let d = $at.depth; d >= 0; d--) if ($at.node(d) === this.node) return d ? $at.before(d) : null;
    // Fall back to a scan (the table may be the selection itself).
    let found: number | null = null;
    view.state.doc.descendants((n, p) => {
      if (found !== null) return false;
      if (n === this.node) found = p;
    });
    return found;
  }

  private setStyle(style: TableStyle) {
    const view = this.editorView;
    const pos = this.pos();
    if (!view || pos === null) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, tableStyle: style }));
  }

  /** Pressed states for the header and alignment toggles. */
  private sync() {
    const editor = this.editor();
    if (!editor) return;
    const align = currentAlign(editor);
    let headerRow = false;
    let headerCol = false;
    try {
      const rect = selectedRect(editor.state);
      const map = TableMap.get(rect.table);
      headerRow = Array.from({ length: map.width }, (_, c) => rect.table.nodeAt(map.map[c])).every((n) => n?.type.name === "tableHeader");
      headerCol = Array.from({ length: map.height }, (_, r) => rect.table.nodeAt(map.map[r * map.width])).every((n) => n?.type.name === "tableHeader");
    } catch {
      /* the caret is not in this table */
    }
    for (const b of this.toolbar.querySelectorAll<HTMLButtonElement>("[data-align]")) b.setAttribute("aria-pressed", String(b.dataset.align === align));
    const [row, col] = this.toolbar.querySelectorAll<HTMLButtonElement>(".table-tool-toggle:not([data-align])");
    row?.setAttribute("aria-pressed", String(headerRow));
    col?.setAttribute("aria-pressed", String(headerCol));
  }

  private applyStyle(node: PMNode) {
    const style = (node.attrs.tableStyle as TableStyle) ?? "default";
    this.dom.dataset.tableStyle = style;
    if (this.select.value !== style) this.select.value = style;
  }

  update(node: PMNode) {
    if (!super.update(node)) return false;
    this.applyStyle(node);
    return true;
  }

  stopEvent(event: Event) {
    return this.toolbar.contains(event.target as Node);
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (this.toolbar.contains(mutation.target as Node) || mutation.target === this.dom) return true;
    return super.ignoreMutation(mutation);
  }
}

/** The editor's table: styles, the toolbar, resizable columns. */
export const TablePlus = TableStyled.configure({ resizable: true, View: StyledTableView });
