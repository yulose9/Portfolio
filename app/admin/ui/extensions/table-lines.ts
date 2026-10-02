import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  findTable,
  TableMap,
  tableNodeTypes,
} from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";

/*
 * Whole rows and columns of a table, for the row and column handles
 * (table-handles.tsx) and their shortcuts (table-plus.ts): select one,
 * colour it, insert next to it, duplicate, move, clear or delete it.
 *
 * A line is a row or a column, by index. Every command takes the table's
 * position, so it acts on the table the handle belongs to whatever the
 * caret is doing. Header rows and columns stay where they are: moving the
 * first row down makes the new first row the header, the way Notion does.
 */

export type Axis = "row" | "col";
export type Line = { axis: Axis; index: number };
export type CellAt = { row: number; col: number };
export type ColorAttr = "background" | "textColor";

type Found = { node: PMNode; pos: number; start: number; map: TableMap };

export function tableAt(doc: PMNode, pos: number): Found | null {
  const node = doc.nodeAt(pos);
  if (!node || node.type.spec.tableRole !== "table") return null;
  return { node, pos, start: pos + 1, map: TableMap.get(node) };
}

export const lineCount = (t: Found, axis: Axis) => (axis === "row" ? t.map.height : t.map.width);

/** No merged cells: every grid slot is its own cell, so lines can be copied and moved whole. */
export const isPlainGrid = (t: Found) => new Set(t.map.map).size === t.map.map.length;

/** A line's cells, as offsets inside the table, each once. */
export function lineCells(t: Found, { axis, index }: Line): number[] {
  const out: number[] = [];
  const n = axis === "row" ? t.map.width : t.map.height;
  for (let i = 0; i < n; i++) {
    const at = axis === "row" ? t.map.map[index * t.map.width + i] : t.map.map[i * t.map.width + index];
    if (at !== undefined && !out.includes(at)) out.push(at);
  }
  return out;
}

/** The row and column of the cell around `pos`, if it's in the table at `tablePos`. */
export function cellAt(doc: PMNode, tablePos: number, pos: number): CellAt | null {
  const t = tableAt(doc, tablePos);
  if (!t || pos <= t.start || pos >= t.pos + t.node.nodeSize) return null;
  const $pos = doc.resolve(pos);
  for (let d = $pos.depth; d > 2; d--) {
    const role = $pos.node(d).type.spec.tableRole;
    if (role !== "cell" && role !== "header_cell") continue;
    if ($pos.before(d - 2) !== tablePos) return null;
    const rect = t.map.findCell($pos.before(d) - t.start);
    return { row: rect.top, col: rect.left };
  }
  return null;
}

/** Where the caret (or a cell selection's moving end) is, if in the table at `tablePos`. */
export function caretCell(state: EditorState, tablePos: number): CellAt | null {
  const sel = state.selection;
  return cellAt(state.doc, tablePos, sel instanceof CellSelection ? sel.$headCell.pos + 1 : sel.head);
}

/** The position of the table around the selection, if any. */
export function tableAround(state: EditorState): number | null {
  const sel = state.selection;
  const found = findTable(sel instanceof CellSelection ? sel.$headCell : sel.$head);
  return found ? found.pos : null;
}

export function lineSelection(doc: PMNode, t: Found, line: Line): CellSelection {
  const cells = lineCells(t, line);
  const $a = doc.resolve(t.start + cells[0]);
  const $b = doc.resolve(t.start + cells[cells.length - 1]);
  return line.axis === "row" ? CellSelection.rowSelection($a, $b) : CellSelection.colSelection($a, $b);
}

/** Is the selection exactly one whole row or column of a table? Which one. */
export function selectedLine(state: EditorState): (Line & { tablePos: number }) | null {
  const sel = state.selection;
  if (!(sel instanceof CellSelection)) return null;
  const tablePos = tableAround(state);
  const t = tablePos === null ? null : tableAt(state.doc, tablePos);
  if (!t || tablePos === null) return null;
  const rect = t.map.rectBetween(sel.$anchorCell.pos - t.start, sel.$headCell.pos - t.start);
  if (sel.isRowSelection() && rect.bottom - rect.top === 1) return { axis: "row", index: rect.top, tablePos };
  if (sel.isColSelection() && rect.right - rect.left === 1) return { axis: "col", index: rect.left, tablePos };
  return null;
}

/** A caret at the start of a line's first cell. */
function caretIn(tr: Transaction, tablePos: number, line: Line) {
  const t = tableAt(tr.doc, tablePos);
  if (!t) return;
  const index = Math.max(0, Math.min(line.index, lineCount(t, line.axis) - 1));
  const first = lineCells(t, { ...line, index })[0];
  if (first !== undefined) tr.setSelection(TextSelection.near(tr.doc.resolve(t.start + first + 1)));
}

/** Puts the caret back in a cell (Escape from the handle menu). */
export function placeCaret(view: EditorView, pos: number) {
  const at = Math.max(0, Math.min(pos, view.state.doc.content.size));
  view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at))));
}

export function selectLine(view: EditorView, tablePos: number, line: Line): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t || line.index < 0 || line.index >= lineCount(t, line.axis)) return false;
  view.dispatch(view.state.tr.setSelection(lineSelection(view.state.doc, t, line)));
  return true;
}

/** Sets a background or text colour (null for none) on every cell in the line. */
export function colorLine(view: EditorView, tablePos: number, line: Line, attr: ColorAttr, value: string | null): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t) return false;
  const tr = view.state.tr;
  for (const at of lineCells(t, line)) {
    const cell = t.node.nodeAt(at);
    if (cell && cell.attrs[attr] !== value) tr.setNodeMarkup(t.start + at, undefined, { ...cell.attrs, [attr]: value });
  }
  if (tr.docChanged) view.dispatch(tr);
  return true;
}

/** Empties every cell in the line, keeping the cells (and their colours). */
export function clearLine(view: EditorView, tablePos: number, line: Line): boolean {
  const t = tableAt(view.state.doc, tablePos);
  const paragraph = view.state.schema.nodes.paragraph;
  if (!t || !paragraph) return false;
  const tr = view.state.tr;
  // Last first, so the earlier cells' positions still hold.
  for (const at of [...lineCells(t, line)].sort((a, b) => b - a)) {
    const cell = t.node.nodeAt(at);
    if (cell) tr.replaceWith(t.start + at + 1, t.start + at + cell.nodeSize - 1, paragraph.create());
  }
  view.dispatch(tr);
  return true;
}

type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

/** Runs a prosemirror-tables command with the line selected, as one transaction. */
function onLine(view: EditorView, t: Found, line: Line, command: Command, after?: (tr: Transaction) => void): boolean {
  const state = view.state.apply(view.state.tr.setSelection(lineSelection(view.state.doc, t, line)));
  return command(state, (tr) => {
    after?.(tr);
    view.dispatch(tr);
  });
}

/** A new empty row or column before (-1) or after (1) the line; the caret goes into it. */
export function insertLine(view: EditorView, tablePos: number, line: Line, side: -1 | 1): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t) return false;
  const command = line.axis === "row" ? (side < 0 ? addRowBefore : addRowAfter) : side < 0 ? addColumnBefore : addColumnAfter;
  return onLine(view, t, line, command, (tr) => caretIn(tr, tablePos, { axis: line.axis, index: side < 0 ? line.index : line.index + 1 }));
}

/** Deletes the line; the last row or column takes the table with it. */
export function deleteLine(view: EditorView, tablePos: number, line: Line): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t) return false;
  if (lineCount(t, line.axis) <= 1) return onLine(view, t, line, deleteTable);
  return onLine(view, t, line, line.axis === "row" ? deleteRow : deleteColumn, (tr) =>
    caretIn(tr, tablePos, { axis: line.axis, index: Math.min(line.index, lineCount(t, line.axis) - 2) }),
  );
}

/** A deep copy with no block ids, so UniqueID gives the copy its own. */
function fresh(node: PMNode): PMNode {
  if (node.isText) return node;
  const kids: PMNode[] = [];
  node.forEach((k) => kids.push(fresh(k)));
  const attrs = "blockId" in node.attrs ? { ...node.attrs, blockId: null } : node.attrs;
  return node.type.create(attrs, Fragment.fromArray(kids), node.marks);
}

type Grid = { row: PMNode; cells: PMNode[] }[];

/**
 * Rewrites the table's rows from a reshaped grid (plain grids only), keeps
 * the header row and column where they were, and selects `select`.
 */
function reshape(view: EditorView, t: Found, change: (grid: Grid) => Grid, select: Line): boolean {
  if (!isPlainGrid(t)) return false;
  const types = tableNodeTypes(view.state.schema);
  const grid: Grid = [];
  t.node.forEach((row) => {
    const cells: PMNode[] = [];
    row.forEach((c) => cells.push(c));
    grid.push({ row, cells });
  });
  const isHead = (c: PMNode | undefined) => c?.type === types.header_cell;
  const headerRow = grid.length > 0 && grid[0].cells.length > 0 && grid[0].cells.every(isHead);
  const headerCol = grid.length > 0 && grid.every((r) => isHead(r.cells[0])) && !(headerRow && grid.length === 1);
  const rows = change(grid).map(({ row, cells }, r) =>
    row.type.create(
      row.attrs,
      cells.map((cell, c) => {
        const want = (r === 0 && headerRow) || (c === 0 && headerCol) ? types.header_cell : types.cell;
        return cell.type === want ? cell : want.create(cell.attrs, cell.content, cell.marks);
      }),
      row.marks,
    ),
  );
  const tr = view.state.tr.replaceWith(t.start, t.start + t.node.content.size, rows);
  const next = tableAt(tr.doc, t.pos);
  if (next) tr.setSelection(lineSelection(tr.doc, next, select));
  view.dispatch(tr);
  return true;
}

/** Can the line be duplicated or moved (no merged cells)? */
export function canReshape(doc: PMNode, tablePos: number): boolean {
  const t = tableAt(doc, tablePos);
  return Boolean(t && isPlainGrid(t));
}

/** A copy of the line right after it, selected. */
export function duplicateLine(view: EditorView, tablePos: number, line: Line): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t) return false;
  const at = line.index;
  return reshape(
    view,
    t,
    (grid) =>
      line.axis === "row"
        ? [...grid.slice(0, at + 1), { row: fresh(grid[at].row), cells: grid[at].cells.map(fresh) }, ...grid.slice(at + 1)]
        : grid.map(({ row, cells }) => ({ row, cells: [...cells.slice(0, at + 1), fresh(cells[at]), ...cells.slice(at + 1)] })),
    { axis: line.axis, index: at + 1 },
  );
}

const moveItem = <T,>(list: T[], from: number, to: number) => {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
};

/** Moves the line to index `to` (the others close up around it); it stays selected. */
export function moveLine(view: EditorView, tablePos: number, line: Line, to: number): boolean {
  const t = tableAt(view.state.doc, tablePos);
  if (!t) return false;
  const last = lineCount(t, line.axis) - 1;
  const target = Math.max(0, Math.min(to, last));
  if (target === line.index) return false;
  return reshape(
    view,
    t,
    (grid) =>
      line.axis === "row"
        ? moveItem(grid, line.index, target)
        : grid.map(({ row, cells }) => ({ row, cells: moveItem(cells, line.index, target) })),
    { axis: line.axis, index: target },
  );
}

/** The event the shortcut and the context menu send a table's frame to open a handle's menu. */
export const OPEN_LINE_MENU = "table-handles:open";

/** Opens the row or column menu for the caret's cell. */
export function openLineMenu(view: EditorView, axis: Axis): boolean {
  const pos = tableAround(view.state);
  if (pos === null) return false;
  const frame = view.nodeDOM(pos);
  if (!(frame instanceof HTMLElement)) return false;
  frame.dispatchEvent(new CustomEvent(OPEN_LINE_MENU, { detail: { axis } }));
  return true;
}
