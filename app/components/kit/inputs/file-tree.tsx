"use client";

import {
  Article,
  CaretRight,
  File,
  FileCode,
  FilePdf,
  FileText,
  FileZip,
  FilmStrip,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  MusicNotes,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../../../lib/cn";

/*
 * A collapsible tree that behaves like one: the WAI-ARIA tree pattern, with a
 * single tab stop and the arrow keys inside it. Down and Up walk the visible
 * rows, Right opens a folder (or steps into an open one), Left closes it (or
 * steps out to the parent), Home and End jump, `*` opens every sibling, and
 * typing a letter finds the next row starting with it.
 *
 * Focus does not select. Walking through the admin's pages with the arrow
 * keys must not open each one on the way; Enter or Space (or a click) does.
 *
 * Data in, not JSX: the keyboard needs the whole visible order, and the
 * admin's pages and media are already arrays.
 */

export type TreeKind = "folder" | "page" | "image" | "video" | "audio" | "pdf" | "document" | "code" | "archive" | "file";

export type TreeNode = {
  id: string;
  name: string;
  kind?: TreeKind;
  children?: TreeNode[];
  /** Replaces the kind's icon (an emoji page icon, say). */
  icon?: ReactNode;
  /** Trailing content: a count, a badge. Not focusable. */
  meta?: ReactNode;
};

const EXT: Record<string, TreeKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", avif: "image", svg: "image", heic: "image",
  mp4: "video", mov: "video", webm: "video", m4v: "video",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", flac: "audio",
  pdf: "pdf",
  md: "document", mdx: "document", txt: "document", doc: "document", docx: "document", rtf: "document",
  ts: "code", tsx: "code", js: "code", jsx: "code", json: "code", css: "code", html: "code",
  zip: "archive", gz: "archive", tar: "archive", "7z": "archive",
};

export function kindOf(node: TreeNode): TreeKind {
  if (node.kind) return node.kind;
  if (node.children) return "folder";
  return EXT[node.name.split(".").pop()?.toLowerCase() ?? ""] ?? "file";
}

const ICONS: Record<Exclude<TreeKind, "folder">, Icon> = {
  page: Article,
  image: ImageIcon,
  video: FilmStrip,
  audio: MusicNotes,
  pdf: FilePdf,
  document: FileText,
  code: FileCode,
  archive: FileZip,
  file: File,
};

type Row = { node: TreeNode; level: number; parent: string | null; size: number; pos: number };

function visibleRows(nodes: TreeNode[], open: ReadonlySet<string>, level = 1, parent: string | null = null, out: Row[] = []) {
  nodes.forEach((node, i) => {
    out.push({ node, level, parent, size: nodes.length, pos: i + 1 });
    if (node.children && open.has(node.id)) visibleRows(node.children, open, level + 1, node.id, out);
  });
  return out;
}

export type FileTreeProps = {
  nodes: TreeNode[];
  /** The tree's accessible name, e.g. "Pages". */
  label: string;
  selectedId?: string | null;
  onSelect?: (node: TreeNode) => void;
  /** Enter or double-click: open it. Defaults to onSelect. */
  onActivate?: (node: TreeNode) => void;
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  className?: string;
};

export function FileTree({
  nodes,
  label,
  selectedId,
  onSelect,
  onActivate,
  expanded: controlled,
  defaultExpanded = [],
  onExpandedChange,
  className,
}: FileTreeProps) {
  const [own, setOwn] = useState<readonly string[]>(defaultExpanded);
  const openIds = controlled ?? own;
  const open = useMemo(() => new Set(openIds), [openIds]);
  const rows = useMemo(() => visibleRows(nodes, open), [nodes, open]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  const typed = useRef({ text: "", at: 0 });

  const isVisible = (id: string | null | undefined) => !!id && rows.some((r) => r.node.id === id);
  const tabId = isVisible(focusId) ? focusId : isVisible(selectedId) ? (selectedId ?? null) : (rows[0]?.node.id ?? null);

  const setOpen = (next: Set<string>) => {
    const ids = [...next];
    setOwn(ids);
    onExpandedChange?.(ids);
  };
  const toggle = (id: string, to = !open.has(id)) => {
    if (to === open.has(id)) return;
    const next = new Set(open);
    if (to) next.add(id);
    else next.delete(id);
    setOpen(next);
  };
  const focus = (id: string) => {
    setFocusId(id);
    items.current.get(id)?.focus();
  };
  const select = (node: TreeNode) => onSelect?.(node);
  const activate = (node: TreeNode) => (onActivate ?? onSelect)?.(node);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const i = rows.findIndex((r) => r.node.id === tabId);
    const row = rows[i];
    if (!row) return;
    const { node } = row;
    const folder = !!node.children;
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    switch (e.key) {
      case "ArrowDown":
        handled();
        if (rows[i + 1]) focus(rows[i + 1].node.id);
        return;
      case "ArrowUp":
        handled();
        if (rows[i - 1]) focus(rows[i - 1].node.id);
        return;
      case "ArrowRight":
        handled();
        if (folder && !open.has(node.id)) toggle(node.id, true);
        else if (folder && node.children?.length) focus(node.children[0].id);
        return;
      case "ArrowLeft":
        handled();
        if (folder && open.has(node.id)) toggle(node.id, false);
        else if (row.parent) focus(row.parent);
        return;
      case "Home":
        handled();
        focus(rows[0].node.id);
        return;
      case "End":
        handled();
        focus(rows[rows.length - 1].node.id);
        return;
      case "Enter":
        handled();
        if (folder) toggle(node.id);
        activate(node);
        return;
      case " ":
        handled();
        select(node);
        return;
      case "*": {
        handled();
        const siblings = rows.filter((r) => r.parent === row.parent && r.node.children).map((r) => r.node.id);
        setOpen(new Set([...open, ...siblings]));
        return;
      }
    }
    // Type-ahead: letters typed in quick succession find a row by prefix.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const q = typed.current.text;
      const order = [...rows.slice(i + (q.length === 1 ? 1 : 0)), ...rows.slice(0, i + 1)];
      const hit = order.find((r) => r.node.name.toLowerCase().startsWith(q));
      if (hit) {
        handled();
        focus(hit.node.id);
      }
    }
  };

  return (
    <ul role="tree" aria-label={label} data-slot="file-tree" className={cn("ki-tree", className)} onKeyDown={onKeyDown}>
      <Branch
        nodes={nodes}
        level={1}
        open={open}
        tabId={tabId}
        selectedId={selectedId ?? null}
        register={(id, el) => {
          if (el) items.current.set(id, el);
          else items.current.delete(id);
        }}
        onRow={(node, how) => {
          setFocusId(node.id);
          if (how === "toggle") return toggle(node.id);
          if (node.children && how === "click") toggle(node.id);
          if (how === "double") activate(node);
          else select(node);
        }}
      />
    </ul>
  );
}

type BranchProps = {
  nodes: TreeNode[];
  level: number;
  open: ReadonlySet<string>;
  tabId: string | null;
  selectedId: string | null;
  register: (id: string, el: HTMLLIElement | null) => void;
  onRow: (node: TreeNode, how: "click" | "double" | "toggle") => void;
};

function Branch({ nodes, level, open, tabId, selectedId, register, onRow }: BranchProps) {
  const still = useReducedMotion();
  return nodes.map((node, i) => {
    const kind = kindOf(node);
    const isOpen = open.has(node.id);
    const folder = !!node.children;
    const Glyph = folder ? (isOpen ? FolderOpen : Folder) : ICONS[kind as Exclude<TreeKind, "folder">];
    return (
      <li
        key={node.id}
        ref={(el) => register(node.id, el)}
        role="treeitem"
        aria-level={level}
        aria-setsize={nodes.length}
        aria-posinset={i + 1}
        aria-expanded={folder ? isOpen : undefined}
        aria-selected={node.id === selectedId}
        aria-label={node.name}
        tabIndex={node.id === tabId ? 0 : -1}
        data-slot="file-tree-item"
        data-kind={kind}
        className="ki-tree-item"
      >
        <div
          className="ki-tree-row"
          style={{ paddingInlineStart: `calc(${level - 1} * var(--tree-indent, 14px) + 4px)` }}
          onClick={(e) => {
            e.stopPropagation();
            onRow(node, "click");
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRow(node, "double");
          }}
        >
          {folder ? (
            <span
              className="ki-tree-caret"
              data-open={isOpen || undefined}
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                onRow(node, "toggle");
              }}
            >
              <CaretRight size={11} weight="bold" />
            </span>
          ) : (
            <span className="ki-tree-caret" aria-hidden="true" />
          )}
          <span className="ki-tree-icon" aria-hidden="true">
            {node.icon ?? <Glyph size={15} weight={folder && isOpen ? "duotone" : "regular"} />}
          </span>
          <span className="ki-tree-name">{node.name}</span>
          {node.meta ? (
            <span className="ki-tree-meta" aria-hidden="true">
              {node.meta}
            </span>
          ) : null}
        </div>
        {folder ? (
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.ul
                role="group"
                className="ki-tree-group"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={still ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Branch
                  nodes={node.children!}
                  level={level + 1}
                  open={open}
                  tabId={tabId}
                  selectedId={selectedId}
                  register={register}
                  onRow={onRow}
                />
              </motion.ul>
            ) : null}
          </AnimatePresence>
        ) : null}
      </li>
    );
  });
}

export default FileTree;
