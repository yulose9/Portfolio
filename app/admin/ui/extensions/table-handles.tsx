"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowLineDown,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowLineUp,
  ArrowRight,
  ArrowUp,
  Copy,
  DotsSix,
  DotsSixVertical,
  MagnifyingGlass,
  PaintRoller,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { TABLE_COLORS, type TableColor } from "../../../../cms/blocks";
import { keys, MItem, MLabel, MSep, MSub } from "../menu";
import {
  canReshape,
  caretCell,
  clearLine,
  colorLine,
  deleteLine,
  duplicateLine,
  insertLine,
  lineCells,
  lineCount,
  moveLine,
  OPEN_LINE_MENU,
  placeCaret,
  selectLine,
  tableAt,
  cellAt as cellAtPos,
  type Axis,
  type CellAt,
  type ColorAttr,
  type Line,
} from "./table-lines";

/*
 * Notion's row and column handles. Hover a cell (or put the caret in one)
 * and a small grip pill shows on its row's left edge and on its column's
 * top edge. Click one: the whole row or column is selected (a blue frame
 * round it) and its menu opens there: search, colour, insert either side,
 * move, duplicate, clear, delete. Drag one to move the row or column.
 *
 * Alt+Shift+M opens the caret's row menu, Alt+Shift+C its column menu (the
 * right-click menu has both too); Escape puts the caret back in its cell.
 *
 * The handles live in a layer on the table's frame (.table-block), not in
 * the scroller, so they sit over the frame's edge without being clipped,
 * and never take up room in the table. table-plus.ts mounts this.
 */

export type TableHandlesProps = {
  view: EditorView;
  /** The table's frame (.table-block): the layer's coordinates are its. */
  frame: HTMLElement;
  /** The sideways scroller (.tableWrapper). */
  scroller: HTMLElement;
  table: HTMLTableElement;
  node: PMNode;
  getPos: () => number | null;
};

const I = { size: 15 } as const;

const COLOR_LABEL: Record<TableColor, string> = {
  gray: "Gray", brown: "Brown", orange: "Orange", yellow: "Yellow", green: "Green",
  blue: "Blue", purple: "Purple", pink: "Pink", red: "Red",
};
/** The swatches: each colour's cell tint and its text colour (article-blocks-2.css). */
const SWATCH: Record<TableColor, { bg: string; fg: string }> = {
  gray: { bg: "#f1f1ef", fg: "#787774" },
  brown: { bg: "#f4eeee", fg: "#9f6b53" },
  orange: { bg: "#fbecdd", fg: "#d9730d" },
  yellow: { bg: "#fbf3db", fg: "#cb912f" },
  green: { bg: "#edf3ec", fg: "#448361" },
  blue: { bg: "#e7f3f8", fg: "#337ea9" },
  purple: { bg: "#f6f3f9", fg: "#9065b0" },
  pink: { bg: "#faf1f5", fg: "#c14c8a" },
  red: { bg: "#fdebec", fg: "#d44c47" },
};

function Swatch({ color, attr }: { color: TableColor | null; attr: ColorAttr }) {
  const s = color ? SWATCH[color] : { bg: "#fff", fg: "#37352f" };
  return (
    <span className="table-swatch" data-kind={attr} style={{ background: attr === "background" ? s.bg : "#fff", color: s.fg }}>
      {attr === "textColor" ? "A" : null}
    </span>
  );
}

type Action = {
  id: string;
  label: string;
  icon: React.ReactNode;
  keys?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Extra words the search matches. */
  words?: string;
  run: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

const same = (a: CellAt | null, b: CellAt | null) => a?.row === b?.row && a?.col === b?.col;

function TableHandles(p: TableHandlesProps) {
  const { view, frame, scroller, table, getPos } = p;
  const [hover, setHover] = useState<CellAt | null>(null);
  const [caret, setCaret] = useState<CellAt | null>(null);
  const [open, setOpen] = useState<(Line & { cell: CellAt }) | null>(null);
  const [drag, setDrag] = useState<{ line: Line; to: number; cell: CellAt } | null>(null);
  const [, setTick] = useState(0);
  const rowHandle = useRef<HTMLButtonElement>(null);
  const colHandle = useRef<HTMLButtonElement>(null);
  /** Where Escape puts the caret back. */
  const restore = useRef<number | null>(null);
  /** A drag just ended: the click that follows it isn't a click. */
  const dragged = useRef(false);

  const found = () => {
    const pos = getPos();
    return pos === null ? null : tableAt(view.state.doc, pos);
  };

  // The cell the pointer is over, and the caret's cell while the editor has focus.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".table-handles")) return;
      const el = target?.closest("td, th");
      const pos = getPos();
      if (!el || !table.contains(el) || pos === null) {
        setHover((h) => (h ? null : h));
        return;
      }
      let next: CellAt | null = null;
      try {
        next = cellAtPos(view.state.doc, pos, view.posAtDOM(el, 0));
      } catch {
        next = null;
      }
      setHover((h) => (same(h, next) ? h : next));
    };
    const onLeave = () => setHover(null);
    const bump = () => setTick((n) => n + 1);
    frame.addEventListener("mousemove", onMove);
    frame.addEventListener("mouseleave", onLeave);
    scroller.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("resize", bump);
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(bump) : null;
    resize?.observe(table);
    return () => {
      frame.removeEventListener("mousemove", onMove);
      frame.removeEventListener("mouseleave", onLeave);
      scroller.removeEventListener("scroll", bump);
      window.removeEventListener("resize", bump);
      resize?.disconnect();
    };
  }, [frame, scroller, table, view, getPos]);

  useEffect(() => {
    const editor = (view.dom as HTMLElement & { editor?: Editor }).editor;
    if (!editor) return;
    const sync = () => {
      const pos = getPos();
      const next = pos !== null && view.hasFocus() ? caretCell(view.state, pos) : null;
      setCaret((c) => (same(c, next) ? c : next));
    };
    sync();
    editor.on("transaction", sync);
    editor.on("focus", sync);
    editor.on("blur", sync);
    return () => {
      editor.off("transaction", sync);
      editor.off("focus", sync);
      editor.off("blur", sync);
    };
  }, [view, getPos]);

  const openLine = (axis: Axis, cell: CellAt, restoreTo: number | null) => {
    const pos = getPos();
    if (pos === null) return;
    const line = { axis, index: axis === "row" ? cell.row : cell.col };
    const t = found();
    restore.current = restoreTo ?? (t ? t.start + lineCells(t, line)[0] + 1 : null);
    selectLine(view, pos, line);
    setOpen({ ...line, cell });
  };

  // Alt+Shift+M / Alt+Shift+C and the right-click menu (table-lines.ts openLineMenu).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const axis = (e as CustomEvent<{ axis: Axis }>).detail?.axis;
      const pos = getPos();
      if ((axis !== "row" && axis !== "col") || pos === null) return;
      const cell = caretCell(view.state, pos);
      if (!cell) return;
      const back = view.state.selection.head;
      // After whatever closed just now (the right-click menu) has moved focus.
      requestAnimationFrame(() => openLine(axis, cell, back));
    };
    frame.addEventListener(OPEN_LINE_MENU, onOpen);
    return () => frame.removeEventListener(OPEN_LINE_MENU, onOpen);
  });

  const cell = open?.cell ?? drag?.cell ?? hover ?? caret;
  const t = found();
  const pos = getPos();

  /* ── Geometry, in the frame's coordinates ── */
  const fr = frame.getBoundingClientRect();
  const sc = scroller.getBoundingClientRect();
  const rel = (r: DOMRect): Rect => ({ top: r.top - fr.top, left: r.left - fr.left, width: r.width, height: r.height });
  const rowRect = (index: number) => {
    const tr = table.rows[index];
    return tr ? rel(tr.getBoundingClientRect()) : null;
  };
  const colRect = (index: number): Rect | null => {
    if (!t) return null;
    const at = t.map.map[index];
    const el = at === undefined ? null : view.nodeDOM(t.start + at);
    if (!(el instanceof HTMLElement)) return null;
    const r = rel(el.getBoundingClientRect());
    const tableBox = rel(table.getBoundingClientRect());
    return { left: r.left, width: r.width, top: tableBox.top, height: tableBox.height };
  };
  // The scroller's inside, which is all of the table that can be seen.
  const view0 = { left: sc.left - fr.left + 1, right: sc.right - fr.left - 1, top: sc.top - fr.top + 1, bottom: sc.bottom - fr.top - 1 };
  const clip = (r: Rect | null): Rect | null => {
    if (!r) return null;
    const left = Math.max(r.left, view0.left);
    const right = Math.min(r.left + r.width, view0.right);
    const top = Math.max(r.top, view0.top);
    const bottom = Math.min(r.top + r.height, view0.bottom);
    return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
  };

  const row = cell && t && cell.row < t.map.height ? rowRect(cell.row) : null;
  const col = cell && t && cell.col < t.map.width ? colRect(cell.col) : null;
  const rowAt = row ? { top: row.top + row.height / 2, left: view0.left - 1 } : null;
  const colCentre = col ? col.left + col.width / 2 : null;
  const colAt = col && colCentre !== null && colCentre > view0.left && colCentre < view0.right ? { top: view0.top - 1, left: colCentre } : null;

  const showRow = Boolean(rowAt) && (!open || open.axis === "row") && (!drag || drag.line.axis === "row");
  const showCol = Boolean(colAt) && (!open || open.axis === "col") && (!drag || drag.line.axis === "col");
  // Keep the last place so a handle fades out where it was (state derived while rendering).
  const [last, setLast] = useState<{ row: typeof rowAt; col: typeof colAt }>({ row: null, col: null });
  const moved = (a: typeof rowAt, b: typeof rowAt) => Boolean(a) && (a?.top !== b?.top || a?.left !== b?.left);
  if (moved(rowAt, last.row) || moved(colAt, last.col)) setLast({ row: rowAt ?? last.row, col: colAt ?? last.col });

  const outline = open ? clip(open.axis === "row" ? rowRect(open.index) : colRect(open.index)) : drag ? clip(drag.line.axis === "row" ? rowRect(drag.line.index) : colRect(drag.line.index)) : null;

  // While dragging, a line where the row or column will land.
  let dropLine: Rect | null = null;
  if (drag && drag.to !== drag.line.index) {
    const target = drag.line.axis === "row" ? rowRect(drag.to) : colRect(drag.to);
    if (target) {
      const after = drag.to > drag.line.index;
      dropLine = drag.line.axis === "row"
        ? clip({ left: target.left, width: target.width, top: (after ? target.top + target.height : target.top) - 1, height: 2 })
        : clip({ top: target.top, height: target.height, left: (after ? target.left + target.width : target.left) - 1, width: 2 });
    }
  }

  /* ── Dragging a handle ── */
  const targetIndex = (axis: Axis, x: number, y: number) => {
    if (!t) return 0;
    const n = lineCount(t, axis);
    for (let i = 0; i < n; i++) {
      const r = axis === "row" ? table.rows[i]?.getBoundingClientRect() : (view.nodeDOM(t.start + t.map.map[i]) as HTMLElement | null)?.getBoundingClientRect();
      if (!r) continue;
      if (axis === "row" ? y < r.bottom : x < r.right) return i;
    }
    return n - 1;
  };

  const startDrag = (axis: Axis) => (e: React.PointerEvent<HTMLButtonElement>) => {
    dragged.current = false;
    if (e.button !== 0 || !cell || !t || pos === null || !canReshape(view.state.doc, pos) || lineCount(t, axis) < 2) return;
    const line = { axis, index: axis === "row" ? cell.row : cell.col };
    const from = { x: e.clientX, y: e.clientY };
    const button = e.currentTarget;
    const id = e.pointerId;
    let moving = false;
    const onMove = (ev: PointerEvent) => {
      if (!moving && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < 4) return;
      if (!moving) {
        moving = true;
        try {
          button.setPointerCapture(id);
        } catch {
          /* the pointer may already be gone */
        }
      }
      setDrag({ line, to: targetIndex(axis, ev.clientX, ev.clientY), cell });
    };
    const done = (ev: PointerEvent) => {
      button.removeEventListener("pointercancel", done);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", done);
      if (!moving) return;
      dragged.current = true;
      // Only the click that ends this drag is swallowed.
      setTimeout(() => (dragged.current = false), 300);
      setDrag(null);
      if (ev.type === "pointerup") {
        const to = targetIndex(axis, ev.clientX, ev.clientY);
        if (to !== line.index && moveLine(view, pos, line, to)) view.focus();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", done);
    button.addEventListener("pointercancel", done);
  };

  /* ── The menus ── */
  const onOpenChange = (axis: Axis, next: boolean, reason: string) => {
    if (next) {
      if (dragged.current || !cell) return;
      openLine(axis, cell, null);
      return;
    }
    setOpen(null);
    if (reason === "escape-key" && restore.current !== null) {
      const back = restore.current;
      requestAnimationFrame(() => {
        placeCaret(view, back);
        view.focus();
      });
    }
  };

  const handle = (axis: Axis) => {
    const at = (axis === "row" ? rowAt : colAt) ?? (axis === "row" ? last.row : last.col);
    const shown = axis === "row" ? showRow : showCol;
    const active = open?.axis === axis || drag?.line.axis === axis;
    const index = cell ? (axis === "row" ? cell.row : cell.col) : 0;
    return (
      <Menu.Trigger
        ref={axis === "row" ? rowHandle : colHandle}
        type="button"
        className="table-handle"
        data-axis={axis}
        data-visible={shown || undefined}
        data-active={active || undefined}
        aria-label={`${axis === "row" ? "Row" : "Column"} ${index + 1} options`}
        title="Click for options, drag to move"
        aria-hidden={shown ? undefined : true}
        tabIndex={shown ? 0 : -1}
        style={at ? { top: at.top, left: at.left } : { display: "none" }}
        // Base UI opens on click; a press that turns into a drag moves the line instead.
        onPointerDown={(e) => {
          e.preventBaseUIHandler();
          startDrag(axis)(e);
        }}
        onMouseDown={(e) => {
          e.preventBaseUIHandler();
          // Keep the editor's focus and selection until the menu takes over.
          e.preventDefault();
        }}
      >
        {axis === "row" ? <DotsSixVertical size={12} weight="bold" /> : <DotsSix size={12} weight="bold" />}
      </Menu.Trigger>
    );
  };

  return (
    <>
      {outline ? <div className="table-line-outline" style={outline} aria-hidden="true" /> : null}
      {dropLine ? <div className="table-drop-line" style={dropLine} aria-hidden="true" /> : null}
      {(["row", "col"] as const).map((axis) => (
        <Menu.Root key={axis} open={open?.axis === axis} onOpenChange={(next, details) => onOpenChange(axis, next, details.reason)} modal={false}>
          {handle(axis)}
          {open?.axis === axis && pos !== null ? (
            <LineMenu
              view={view}
              tablePos={pos}
              line={open}
              anchor={axis === "row" ? rowHandle : colHandle}
              close={() => setOpen(null)}
            />
          ) : null}
        </Menu.Root>
      ))}
    </>
  );
}

function LineMenu({ view, tablePos, line, anchor, close }: { view: EditorView; tablePos: number; line: Line; anchor: React.RefObject<HTMLButtonElement | null>; close: () => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const t = tableAt(view.state.doc, tablePos);
  const count = t ? lineCount(t, line.axis) : 0;
  const movable = canReshape(view.state.doc, tablePos);
  const isRow = line.axis === "row";

  // The search field takes the focus once Base UI has placed it on the menu.
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => input.current?.focus());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const act = (fn: () => boolean | void) => () => {
    fn();
    view.focus();
  };
  const current = (attr: ColorAttr): TableColor | null => {
    if (!t) return null;
    const values = lineCells(t, line).map((at) => t.node.nodeAt(at)?.attrs[attr] ?? null);
    return values.every((v) => v === values[0]) ? values[0] : null;
  };

  const actions: Action[] = [
    {
      id: "before",
      label: isRow ? "Insert above" : "Insert left",
      icon: isRow ? <ArrowUp {...I} /> : <ArrowLeft {...I} />,
      words: "add new",
      run: act(() => insertLine(view, tablePos, line, -1)),
    },
    {
      id: "after",
      label: isRow ? "Insert below" : "Insert right",
      icon: isRow ? <ArrowDown {...I} /> : <ArrowRight {...I} />,
      words: "add new",
      run: act(() => insertLine(view, tablePos, line, 1)),
    },
    {
      id: "back",
      label: isRow ? "Move up" : "Move left",
      icon: isRow ? <ArrowLineUp {...I} /> : <ArrowLineLeft {...I} />,
      keys: keys(isRow ? "⌘⇧↑" : "⌘⇧←"),
      words: "reorder",
      disabled: !movable || line.index === 0,
      run: act(() => moveLine(view, tablePos, line, line.index - 1)),
    },
    {
      id: "forward",
      label: isRow ? "Move down" : "Move right",
      icon: isRow ? <ArrowLineDown {...I} /> : <ArrowLineRight {...I} />,
      keys: keys(isRow ? "⌘⇧↓" : "⌘⇧→"),
      words: "reorder",
      disabled: !movable || line.index >= count - 1,
      run: act(() => moveLine(view, tablePos, line, line.index + 1)),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy {...I} />,
      keys: keys("⌘D"),
      words: "copy",
      disabled: !movable,
      run: act(() => duplicateLine(view, tablePos, line)),
    },
    { id: "clear", label: "Clear contents", icon: <XCircle {...I} />, words: "empty erase", run: act(() => clearLine(view, tablePos, line)) },
  ];
  const remove: Action = { id: "delete", label: "Delete", icon: <Trash {...I} />, danger: true, words: "remove", run: act(() => deleteLine(view, tablePos, line)) };

  const colorActions = (attr: ColorAttr): Action[] =>
    [null, ...TABLE_COLORS].map((c) => ({
      id: `${attr}-${c ?? "default"}`,
      label: `${c ? COLOR_LABEL[c] : "Default"} ${attr === "background" ? "background" : "text"}`,
      icon: <Swatch color={c} attr={attr} />,
      words: "color colour",
      run: act(() => colorLine(view, tablePos, line, attr, c)),
    }));

  const q = query.trim().toLowerCase();
  const matches = (a: Action) => `${a.label} ${a.words ?? ""}`.toLowerCase().includes(q);
  const found = q ? [...colorActions("background"), ...colorActions("textColor"), ...actions, remove].filter(matches) : [];

  const item = (a: Action) => (
    <MItem key={a.id} icon={a.icon} keys={a.keys} danger={a.danger} disabled={a.disabled} onSelect={a.run}>
      {a.label}
    </MItem>
  );
  const colorItem = (attr: ColorAttr) => function ColorItem(a: Action, i: number) {
    const value = i === 0 ? null : TABLE_COLORS[i - 1];
    const label = a.label.replace(/ (background|text)$/, "");
    return (
      <MItem key={a.id} icon={a.icon} onSelect={a.run} className={current(attr) === value ? "table-color-current" : undefined}>
        {label}
      </MItem>
    );
  };

  return (
    <Menu.Portal>
      <Menu.Positioner className="menu-positioner" anchor={anchor} side={isRow ? "left" : "bottom"} align="start" sideOffset={8} collisionPadding={8}>
        <Menu.Popup className="menu-popup admin-menu table-line-menu" finalFocus={false} aria-label={isRow ? "Row" : "Column"}>
          <div className="table-line-search">
            <MagnifyingGlass size={14} aria-hidden="true" />
            <input
              ref={input}
              type="text"
              value={query}
              placeholder="Search actions…"
              aria-label="Search actions"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Arrows reach the items and Escape closes; everything else is typing.
                if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Escape" || e.key === "Tab") return;
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  const first = (q ? found : actions).find((a) => !a.disabled);
                  if (first) {
                    close();
                    first.run();
                  }
                }
              }}
            />
          </div>
          {q ? (
            found.length ? (
              found.map(item)
            ) : (
              <p className="table-line-empty" role="status">
                No actions match
              </p>
            )
          ) : (
            <>
              <MSub icon={<PaintRoller {...I} />} label="Color">
                <MLabel>Background</MLabel>
                {colorActions("background").map(colorItem("background"))}
                <MSep />
                <MLabel>Text</MLabel>
                {colorActions("textColor").map(colorItem("textColor"))}
              </MSub>
              <MSep />
              {actions.map(item)}
              <MSep />
              {item(remove)}
            </>
          )}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

/** Mounts the handles into `host` (a layer on the table's frame); `render` again on every update. */
export function mountTableHandles(host: HTMLElement, props: TableHandlesProps) {
  const root = createRoot(host);
  root.render(<TableHandles {...props} />);
  return {
    render: (next: TableHandlesProps) => root.render(<TableHandles {...next} />),
    // As with the style menu: unmount once ProseMirror is done with the view.
    destroy: () => queueMicrotask(() => root.unmount()),
  };
}
