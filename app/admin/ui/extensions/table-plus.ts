import type { Editor } from "@tiptap/core";
import { TableView } from "@tiptap/extension-table";
import type { Node as PMNode } from "@tiptap/pm/model";
import { selectedRect, TableMap } from "@tiptap/pm/tables";
import type { EditorView, ViewMutationRecord } from "@tiptap/pm/view";

import { isTableStyle, isTableWidth, TABLE_STYLES, TABLE_WIDTHS, type TableStyle, type TableWidth } from "../../../../cms/blocks";
import { scrollEdges } from "../../../components/writing/scroll-edges";
import { TableStyled } from "./blocks-schema";
import { mountTableHandles, type TableHandlesProps } from "./table-handles";
import { duplicateLine, moveLine, openLineMenu, selectedLine } from "./table-lines";
import { mountTableMenu, type TableMenuProps } from "./table-menu";

/*
 * Tables, in the editor: Tiptap's table (Tab / Shift-Tab move between cells,
 * Tab in the last cell adds a row; columns resize by dragging their edge)
 * with Notion's row and column handles (table-handles.tsx: insert, move,
 * colour, duplicate, clear and delete a whole row or column) and a toolbar
 * over the table you're in: header row and column (either, both or
 * neither), the column's alignment (written into the GFM delimiter row),
 * and the table's style and width, picked from a menu that sketches each
 * one (table-menu.tsx):
 *
 *   default · minimal · striped · bordered · data (sortable on the site)
 *   fit text width · wide (breaks out past the text column)
 *
 * The toolbar is plain DOM, part of the table's node view; it shows while
 * the caret is in the table (the block gets .is-current, see blocks.ts).
 * A table wider than the column scrolls sideways in its frame, the frame
 * fading at the side there's more to see (scroll-edges.ts).
 * Column widths are kept while editing only: Markdown tables have none.
 */

const svg = (d: string) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON = {
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
  editorView: EditorView | undefined;
  private menu: ReturnType<typeof mountTableMenu>;
  private handles: ReturnType<typeof mountTableHandles> | null = null;
  private handleLayer: HTMLDivElement;
  private edges: () => void;

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
    const menuHost = document.createElement("span");
    menuHost.className = "table-style-host";
    this.toolbar.append(menuHost, this.sep());
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
    // Rows and columns in, out and around: the handles (table-handles.tsx).
    add("Header row", ICON.headRow, (e) => e.chain().focus().toggleHeaderRow().run(), "table-tool-toggle").dataset.header = "row";
    add("Header column", ICON.headCol, (e) => e.chain().focus().toggleHeaderColumn().run(), "table-tool-toggle").dataset.header = "col";
    this.toolbar.append(this.sep());
    for (const [align, icon, label] of [["left", ICON.left, "Align column left"], ["center", ICON.center, "Center column"], ["right", ICON.right, "Align column right"]] as const) {
      const b = add(label, icon, (e) => alignColumns(e, currentAlign(e) === align ? null : align), "table-tool-toggle");
      b.dataset.align = align;
    }
    this.toolbar.append(this.sep());
    add("Delete table", ICON.trash, (e) => e.chain().focus().deleteTable().run(), "table-tool-danger");

    // The row and column handles' layer: over the frame, outside the scroller.
    this.handleLayer = document.createElement("div");
    this.handleLayer.className = "table-handles";
    this.handleLayer.contentEditable = "false";

    outer.append(this.toolbar, wrapper, this.handleLayer);
    this.dom = outer;
    this.menu = mountTableMenu(menuHost, this.menuProps(node));
    const handles = this.handlesProps(node);
    if (handles) this.handles = mountTableHandles(this.handleLayer, handles);
    // The fades at the frame's edges while the table is wider than the column.
    this.edges = scrollEdges(wrapper, { frame: outer, label: false });
    this.applyStyle(node);
    this.toolbar.addEventListener("focusin", () => this.sync());
    outer.addEventListener("mouseenter", () => this.sync());
  }

  private menuProps(node: PMNode): TableMenuProps {
    return {
      style: isTableStyle(node.attrs.tableStyle) ? node.attrs.tableStyle : "default",
      width: isTableWidth(node.attrs.tableWidth) ? node.attrs.tableWidth : "fit",
      styles: TABLE_STYLES,
      widths: TABLE_WIDTHS,
      onStyle: (tableStyle) => this.setAttrs({ tableStyle }),
      onWidth: (tableWidth) => this.setAttrs({ tableWidth }),
      // The toolbar stays up while its menu is open, wherever focus is.
      onOpenChange: (open) => this.dom.toggleAttribute("data-menu-open", open),
      focusEditor: () => this.editorView?.focus(),
    };
  }

  private readonly tablePos = () => this.pos();

  private handlesProps(node: PMNode): TableHandlesProps | null {
    if (!this.editorView) return null;
    return { view: this.editorView, frame: this.dom, scroller: this.dom.querySelector<HTMLElement>(".tableWrapper") ?? this.dom, table: this.table, node, getPos: this.tablePos };
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

  private setAttrs(attrs: { tableStyle?: TableStyle; tableWidth?: TableWidth }) {
    const view = this.editorView;
    const pos = this.pos();
    if (!view || pos === null) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, ...attrs }));
  }

  /** Pressed states for the header and alignment toggles. */
  private sync() {
    const editor = this.editor();
    if (!editor) return;
    const align = currentAlign(editor);
    // Read from this table, not the caret's: the toolbar shows on hover too.
    const map = TableMap.get(this.node);
    const isHead = (pos: number) => this.node.nodeAt(pos)?.type.name === "tableHeader";
    const headerRow = map.width > 0 && Array.from({ length: map.width }, (_, c) => map.map[c]).every(isHead);
    const headerCol = map.height > 0 && Array.from({ length: map.height }, (_, r) => map.map[r * map.width]).every(isHead) && !(headerRow && map.height === 1);
    for (const b of this.toolbar.querySelectorAll<HTMLButtonElement>("[data-align]")) b.setAttribute("aria-pressed", String(b.dataset.align === align));
    this.toolbar.querySelector('[data-header="row"]')?.setAttribute("aria-pressed", String(headerRow));
    this.toolbar.querySelector('[data-header="col"]')?.setAttribute("aria-pressed", String(headerCol));
  }

  private applyStyle(node: PMNode) {
    const style = isTableStyle(node.attrs.tableStyle) ? node.attrs.tableStyle : "default";
    const width = isTableWidth(node.attrs.tableWidth) ? node.attrs.tableWidth : "fit";
    this.dom.dataset.tableStyle = style;
    if (width === "fit") delete this.dom.dataset.tableWidth;
    else this.dom.dataset.tableWidth = width;
    this.menu.render(this.menuProps(node));
  }

  update(node: PMNode) {
    if (!super.update(node)) return false;
    this.applyStyle(node);
    this.sync();
    const handles = this.handlesProps(node);
    if (handles) this.handles?.render(handles);
    return true;
  }

  destroy() {
    this.edges();
    this.menu.destroy();
    this.handles?.destroy();
  }

  stopEvent(event: Event) {
    return this.toolbar.contains(event.target as Node) || this.handleLayer.contains(event.target as Node);
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (this.toolbar.contains(mutation.target as Node) || this.handleLayer.contains(mutation.target as Node) || mutation.target === this.dom) return true;
    return super.ignoreMutation(mutation);
  }
}

/**
 * The editor's table: styles, the toolbar, the row and column handles,
 * resizable columns. With a whole row or column selected (its handle),
 * ⌘D duplicates it and ⌘⇧ and an arrow move it, as they do a block.
 */
export const TablePlus = TableStyled.extend({
  addKeyboardShortcuts() {
    const onLine = (run: (line: NonNullable<ReturnType<typeof selectedLine>>) => boolean) => () => {
      const line = selectedLine(this.editor.state);
      return line ? run(line) : false;
    };
    const move = (axis: "row" | "col", by: -1 | 1) =>
      onLine((line) => (line.axis === axis ? moveLine(this.editor.view, line.tablePos, line, line.index + by) || true : false));
    return {
      ...this.parent?.(),
      "Mod-d": onLine((line) => duplicateLine(this.editor.view, line.tablePos, line)),
      "Mod-Shift-ArrowUp": move("row", -1),
      "Mod-Shift-ArrowDown": move("row", 1),
      "Mod-Shift-ArrowLeft": move("col", -1),
      "Mod-Shift-ArrowRight": move("col", 1),
      // The caret's row or column menu, for the keyboard (table-handles.tsx).
      "Alt-Shift-m": () => openLineMenu(this.editor.view, "row"),
      "Alt-Shift-c": () => openLineMenu(this.editor.view, "col"),
    };
  },
}).configure({ resizable: true, View: StyledTableView });
