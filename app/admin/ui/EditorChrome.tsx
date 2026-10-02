"use client";
import { ownInteraction } from "./editor-interactions";
import ColorPicker from "./ColorPicker";
import { setDragHandleLocked } from "./drag-handle-lock";

import {
  ArrowDown,
  ArrowUp,
  ArrowUUpLeft,
  ArrowUUpRight,
  CaretDown,
  CaretRight,
  CaretUp,
  CheckSquare,
  ClipboardText,
  Copy,
  CopySimple,
  DotsSixVertical,
  ImageSquare,
  Keyboard,
  LinkSimple,
  ListBullets,
  Microphone,
  MagnifyingGlass,
  MarkdownLogo,
  Plus,
  Scissors,
  Smiley,
  Table,
  TextAa,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  Trash,
  X,
  HighlighterCircle,
  Selection,
  SelectionPlus,
  Swap as SwapIcon,
  ArrowsInLineVertical,
} from "@phosphor-icons/react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import type { Editor } from "@tiptap/core";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { isNodeRangeSelection } from "@tiptap/extension-node-range";
import { useEditorState } from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { copy } from "../../components/menu/actions";
import { useFinePointer } from "../../components/menu/useFinePointer";
import { toast } from "../../lib/toast";
import {
  activeBlock,
  BLOCKS,
  currentBlock,
  deleteBlock,
  duplicateBlock,
  inserts,
  MARKS,
  moveBlock,
  selectBlock,
  selectionMarkdown,
  turnInto,
} from "./commands";
import { findKey, type FindOptions } from "./extensions/blocks";
import { alignColumns } from "./extensions/table-plus";
import { TABLE_STYLES } from "../../../cms/blocks";
import { keys, MenuSurface, MItem, MLabel, MSep, MSub } from "./menu";
import { shortcutLabel } from "./shortcuts";

const I = { size: 15 } as const;
const MARK_ICON: Record<string, React.ReactNode> = {
  bold: <TextB {...I} weight="bold" />,
  italic: <TextItalic {...I} weight="bold" />,
  underline: <TextUnderline {...I} weight="bold" />,
  strike: <TextStrikethrough {...I} weight="bold" />,
  highlight: <HighlighterCircle {...I} />,
  code: <MarkdownLogo {...I} />,
};

type Pickers = {
  pickImage: () => void;
  pickEmoji: () => void;
  pickVoice?: () => void;
  onLink: () => void;
  onFind: (query?: string) => void;
  onReplace?: (query?: string) => void;
};

/* ── Right-click menu ────────────────────────────────────────────────── */

/**
 * The editor's context menu. Right-click outside the selection first moves
 * the caret there, the way Notion and every native editor do, so the menu
 * acts on what you clicked. Off on touch, where a long press belongs to the
 * system's own text selection.
 */
export function EditorContextMenu({ editor, children, ...pick }: { editor: Editor; children: React.ReactNode } & Pickers) {
  const fine = useFinePointer();
  const [info, setInfo] = useState({ text: "", blocks: 0, inTable: false, block: "paragraph" as ReturnType<typeof activeBlock> });

  const onContextMenu = (event: React.MouseEvent) => {
    const { from, to, empty } = editor.state.selection;
    const at = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
    if (at !== undefined && (empty || at < from || at > to)) editor.commands.setTextSelection(at);
    const sel = editor.state.selection;
    setInfo({
      text: editor.state.doc.textBetween(sel.from, sel.to, " ").trim(),
      blocks: isNodeRangeSelection(sel) ? sel.ranges.length : 0,
      inTable: editor.isActive("table"),
      block: activeBlock(editor),
    });
  };

  const run = (fn: () => void) => () => {
    editor.view.focus();
    fn();
  };
  const block = () => currentBlock(editor);
  const short = info.text.length > 24 ? `${info.text.slice(0, 23)}…` : info.text;

  return (
    <ContextMenu.Root disabled={!fine}>
      <ContextMenu.Trigger render={<div className="editor-context" onContextMenu={onContextMenu} />}>{children}</ContextMenu.Trigger>
      <MenuSurface>
        {info.text ? (
          <>
            <MItem icon={<Scissors {...I} />} keys={keys("⌘X")} onSelect={run(() => document.execCommand("cut"))}>
              Cut
            </MItem>
            <MItem icon={<Copy {...I} />} keys={keys("⌘C")} onSelect={run(() => document.execCommand("copy"))}>
              Copy
            </MItem>
          </>
        ) : null}
        <MItem
          icon={<ClipboardText {...I} />}
          keys={keys("⌘V")}
          onSelect={run(() =>
            void navigator.clipboard
              .readText()
              .then((t) => editor.chain().focus().insertContent(t).run())
              .catch(() => toast.add({ type: "info", title: `Use ${keys("⌘V")} to paste`, description: "The browser didn't allow reading the clipboard from a menu." }))
          )}
        >
          Paste
        </MItem>
        <MItem
          icon={<MarkdownLogo {...I} />}
          onSelect={run(() =>
            void navigator.clipboard
              .readText()
              .then((t) => editor.chain().focus().insertContent(t, { contentType: "markdown" } as never).run())
              .catch(() => toast.add({ type: "info", title: "Couldn’t read the clipboard" }))
          )}
        >
          Paste as Markdown
        </MItem>
        {info.text ? (
          <MItem icon={<MarkdownLogo {...I} />} onSelect={() => void copy(selectionMarkdown(editor), "Copied as Markdown")}>
            Copy as Markdown
          </MItem>
        ) : null}
        <MSep />
        {info.text ? (
          <MSub icon={<TextAa {...I} />} label="Format">
            {MARKS.map((m) => (
              <MItem key={m.id} icon={MARK_ICON[m.id]} keys={keys(m.keys)} onSelect={() => m.run(editor)}>
                {m.title}
              </MItem>
            ))}
            <MSep />
            <MItem icon={<LinkSimple {...I} />} keys={keys(`${shortcutLabel("palette")} ↵`)} onSelect={pick.onLink}>
              Link…
            </MItem>
          </MSub>
        ) : null}
        <MSub icon={<Selection {...I} />} label="Turn into">
          {BLOCKS.map((b) => (
            <MItem key={b.kind} icon={b.icon} onSelect={() => turnInto(editor, b.kind)}>
              <span data-current={info.block === b.kind || undefined}>{b.title}</span>
            </MItem>
          ))}
        </MSub>
        <MSub icon={<Plus {...I} />} label="Insert">
          {inserts(pick.pickImage, pick.pickEmoji, pick.pickVoice).map((i) => (
            <MItem key={i.id} icon={i.icon} onSelect={() => i.run(editor)}>
              {i.title}
            </MItem>
          ))}
        </MSub>
        {info.inTable ? (
          <MSub icon={<Table {...I} />} label="Table">
            <MItem onSelect={() => editor.chain().focus().addRowBefore().run()}>Add row above</MItem>
            <MItem onSelect={() => editor.chain().focus().addRowAfter().run()}>Add row below</MItem>
            <MItem onSelect={() => editor.chain().focus().addColumnBefore().run()}>Add column left</MItem>
            <MItem onSelect={() => editor.chain().focus().addColumnAfter().run()}>Add column right</MItem>
            <MSep />
            <MItem onSelect={() => editor.chain().focus().toggleHeaderRow().run()}>Toggle header row</MItem>
            <MItem onSelect={() => editor.chain().focus().toggleHeaderColumn().run()}>Toggle header column</MItem>
            <MSep />
            <MItem onSelect={() => alignColumns(editor, "left")}>Align column left</MItem>
            <MItem onSelect={() => alignColumns(editor, "center")}>Center column</MItem>
            <MItem onSelect={() => alignColumns(editor, "right")}>Align column right</MItem>
            <MSep />
            {TABLE_STYLES.map((style) => (
              <MItem key={style} onSelect={() => editor.chain().focus().updateAttributes("table", { tableStyle: style }).run()}>
                <span data-current={editor.getAttributes("table").tableStyle === style || undefined}>Style: {style === "data" ? "data table" : style}</span>
              </MItem>
            ))}
            <MSep />
            <MItem danger onSelect={() => editor.chain().focus().deleteRow().run()}>Delete row</MItem>
            <MItem danger onSelect={() => editor.chain().focus().deleteColumn().run()}>Delete column</MItem>
            <MItem danger onSelect={() => editor.chain().focus().deleteTable().run()}>Delete table</MItem>
          </MSub>
        ) : null}
        <MSep />
        {info.text ? (
          <>
            <MItem icon={<MagnifyingGlass {...I} />} onSelect={() => pick.onFind(info.text)}>
              Find “{short}” in this post
            </MItem>
            <MItem
              icon={<MagnifyingGlass {...I} />}
              onSelect={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(info.text)}`, "_blank", "noopener")}
            >
              Search Google for “{short}”
            </MItem>
          </>
        ) : (
          <MItem icon={<MagnifyingGlass {...I} />} keys={keys(shortcutLabel("find"))} onSelect={() => pick.onFind()}>
            Find in this post
          </MItem>
        )}
        {pick.onReplace ? (
          <MItem icon={<SwapIcon {...I} />} keys={keys(shortcutLabel("replace"))} onSelect={() => pick.onReplace?.(info.text || undefined)}>
            Find and replace…
          </MItem>
        ) : null}
        <MSep />
        <MItem icon={<CopySimple {...I} />} keys={keys(shortcutLabel("duplicate"))} onSelect={() => {
          if (info.blocks) {
            const { from, to } = editor.state.selection;
            editor.chain().focus().insertContentAt(to, editor.state.doc.slice(from, to).content.toJSON()).run();
          } else { const b = block(); if (b) duplicateBlock(editor, b.pos); }
        }}>
          {info.blocks ? "Duplicate selected blocks" : "Duplicate block"}
        </MItem>
        <MItem icon={<ArrowUp {...I} />} keys={keys(shortcutLabel("moveUp"))} onSelect={() => { const b = block(); if (b) moveBlock(editor, b.pos, -1); }}>
          Move up
        </MItem>
        <MItem icon={<ArrowDown {...I} />} keys={keys(shortcutLabel("moveDown"))} onSelect={() => { const b = block(); if (b) moveBlock(editor, b.pos, 1); }}>
          Move down
        </MItem>
        <MItem icon={<Trash {...I} />} danger onSelect={() => { if (info.blocks) editor.chain().focus().deleteSelection().run(); else { const b = block(); if (b) deleteBlock(editor, b.pos); } }}>
          {info.blocks ? "Delete selected blocks" : "Delete block"}
        </MItem>
        <MSep />
        <MItem icon={<SelectionPlus {...I} />} keys={keys("⌘A")} onSelect={run(() => selectBlock(editor))}>
          Select block
        </MItem>
        <MItem icon={<ArrowsInLineVertical {...I} />} keys={keys("⌘A ⌘A")} onSelect={run(() => editor.commands.selectAll())}>
          Select all
        </MItem>
      </MenuSurface>
    </ContextMenu.Root>
  );
}

/* ── Block handle ────────────────────────────────────────────────────── */

/**
 * Notion's block handle: hover a block and a ⋮⋮ appears in the margin. Drag
 * it to move the block; click it for that block's menu. The + beside it adds
 * a line below and opens the block menu.
 */
// Stable identity: DragHandle re-registers its plugin when its props change.
const HANDLE_POSITION = { placement: "left-start", strategy: "absolute" } as const;

export const BlockHandle = memo(function BlockHandle({ editor }: { editor: Editor }) {
  const selectedCount = useEditorState({ editor, selector: ({ editor: e }) =>
    isNodeRangeSelection(e.state.selection) ? e.state.selection.ranges.length : 0 });
  const target = useRef<number | null>(null);
  const grip = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setDragHandleLocked(editor, open);
    const lease=open?ownInteraction(editor,()=>setOpen(false)):null;
    const id=open&&target.current!==null?editor.state.doc.nodeAt(target.current)?.attrs.blockId:null;
    const map=({transaction}:{transaction:import("@tiptap/pm/state").Transaction})=>{
      if(!transaction.docChanged||!open)return;
      if(id){target.current=null;transaction.doc.descendants((node,pos)=>{if(node.attrs.blockId===id){target.current=pos;return false;}});}
      else if(target.current!==null){const next=transaction.mapping.mapResult(target.current,1);target.current=next.deleted?null:next.pos;}
      if(target.current===null)setOpen(false);
    };
    editor.on("transaction",map);
    return () => {setDragHandleLocked(editor, false);lease?.release();editor.off("transaction",map);};
  }, [editor, open]);
  const onNodeChange = useCallback(({ pos }: { pos: number }) => {
    target.current = pos >= 0 ? pos : null;
  }, []);

  const at = () => target.current;
  const select = () => {
    const pos = at();
    if (pos === null) return null;
    if (selectedCount > 1) return pos;
    editor.chain().setTextSelection(Math.min(pos + 1, editor.state.doc.content.size)).run();
    return pos;
  };

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <DragHandle
        editor={editor}
        onNodeChange={onNodeChange}
        computePositionConfig={HANDLE_POSITION}
      >
        <div className="block-handle">
          <button
            type="button"
            className="block-button"
            aria-label="Add a block below"
            title="Add a block below"
            onClick={() => {
              const pos = at();
              if (pos === null) return;
              const node = editor.state.doc.nodeAt(pos);
              if (!node) return;
              const end = pos + node.nodeSize;
              editor.chain().insertContentAt(end, { type: "paragraph" }).setTextSelection(end + 1).insertContent("/").focus().run();
            }}
          >
            <Plus size={14} weight="bold" />
          </button>
          <Menu.Trigger
            ref={grip}
            type="button"
            className="block-button block-grip"
            aria-label="Drag to move, click for options"
            title="Drag to move, click for options"
            // Keep the native drag gesture available; let Base UI open on click.
            onPointerDown={event => event.preventBaseUIHandler()}
            onMouseDown={event => event.preventBaseUIHandler()}
          >
            <DotsSixVertical size={16} weight="bold" />
          </Menu.Trigger>
        </div>
      </DragHandle>
        <Menu.Portal>
          <Menu.Positioner className="menu-positioner" anchor={grip} side="right" align="start" sideOffset={6} collisionPadding={8}>
            <Menu.Popup className="menu-popup admin-menu">
              <MLabel>{selectedCount > 1 ? `${selectedCount} selected blocks` : "Block"}</MLabel>
              <MItem
                icon={<SelectionPlus {...I} />}
                onSelect={() => {
                  const p = at();
                  if (p !== null) editor.chain().focus().setNodeSelection(p).run();
                }}
              >
                Select
              </MItem>
              <MSub icon={<Selection {...I} />} label="Turn into">
                {BLOCKS.map((b) => (
                  <MItem key={b.kind} icon={b.icon} onSelect={() => { if (select() !== null) turnInto(editor, b.kind); }}>
                    {b.title}
                  </MItem>
                ))}
              </MSub>
              <MItem icon={<CopySimple {...I} />} keys={keys(shortcutLabel("duplicate"))} onSelect={() => {
                if (selectedCount > 1) {
                  const { from, to } = editor.state.selection;
                  editor.chain().focus().insertContentAt(to, editor.state.doc.slice(from, to).content.toJSON()).run();
                } else { const p = at(); if (p !== null) duplicateBlock(editor, p); }
              }}>
                Duplicate
              </MItem>
              <MItem icon={<ArrowUp {...I} />} onSelect={() => { const p = at(); if (p !== null) moveBlock(editor, p, -1); }}>
                Move up
              </MItem>
              <MItem icon={<ArrowDown {...I} />} onSelect={() => { const p = at(); if (p !== null) moveBlock(editor, p, 1); }}>
                Move down
              </MItem>
              <MItem
                icon={<MarkdownLogo {...I} />}
                onSelect={() => {
                  if (selectedCount > 1) { void copy(selectionMarkdown(editor), "Blocks copied as Markdown"); return; }
                  const p = at();
                  const node = p !== null ? editor.state.doc.nodeAt(p) : null;
                  if (!node || p === null) return;
                  editor.chain().setTextSelection({ from: p, to: p + node.nodeSize }).run();
                  void copy(selectionMarkdown(editor), "Block copied as Markdown");
                }}
              >
                Copy as Markdown
              </MItem>
              <MSep />
              <MItem icon={<Trash {...I} />} danger onSelect={() => { if (selectedCount > 1) editor.chain().focus().deleteSelection().run(); else { const p = at(); if (p !== null) deleteBlock(editor, p); } }}>
                Delete
              </MItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
    </Menu.Root>
  );
});

/* ── Find and replace ────────────────────────────────────────────────── */

export type FindRequest = { query: string; index: number; replace?: boolean };

/**
 * ⌘F finds; the chevron (or ⌥⌘F) opens the replace row under it. Match case
 * and whole word are Aa and ab beside the field, like VS Code. Replace takes
 * the current match and moves on; Replace all is one step to undo.
 *
 * It stays mounted and floats over the page, so opening it doesn't push the
 * article down, closing it can fade out, and ⌘F while it's open refocuses it
 * instead of replaying the entrance. Enter and exit are transitions, so a
 * quick open-close-open reverses mid-way rather than restarting.
 */
export function FindBar({ editor, request, onClose }: { editor: Editor; request: FindRequest | null; onClose: () => void }) {
  const open = request !== null;
  const [query, setQuery] = useState(request?.query ?? "");
  const [replacing, setReplacing] = useState(Boolean(request?.replace));
  const [replacement, setReplacement] = useState("");
  const [options, setOptions] = useState<FindOptions>({});
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  // Where focus was when find opened (a toolbar button, the palette's
  // target), so closing returns there rather than always into the text.
  const opener = useRef<HTMLElement | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = findKey.getState(e.state);
      return { count: s?.matches.length ?? 0, index: s?.index ?? 0, first: s?.matches[s.index]?.from ?? -1,
        results: (s?.matches??[]).map((match,i)=>{const pos=e.state.doc.resolve(match.from);const start=pos.start();const end=pos.end();return {index:i,before:e.state.doc.textBetween(Math.max(start,match.from-45),match.from," "),text:e.state.doc.textBetween(match.from,match.to," "),after:e.state.doc.textBetween(match.to,Math.min(end,match.to+65)," "),block:pos.parent.type.name};}) };
    },
  });

  // A new request (⌘F, ⌥⌘F, "Find … in this post"): take its words.
  const [seen, setSeen] = useState<FindRequest | null>(request);
  if (request !== seen) {
    setSeen(request);
    if (request) {
      setQuery(request.query);
      if (request.replace) setReplacing(true);
    }
  }

  useEffect(() => {
    if (!request) {
      editor.commands.setFind("", 0);
      return;
    }
    editor.commands.setFind(request.query, request.index);
    const was = document.activeElement;
    if (was instanceof HTMLElement && !was.closest(".find-bar")) opener.current = was;
    const target = request.replace && request.query ? replaceInput.current : input.current;
    target?.focus();
    target?.select();
  }, [editor, request]);

  // Keep the current match in view, centred, with room for the top bar.
  useEffect(() => {
    if (!open || state.first < 0) return;
    const coords = editor.view.coordsAtPos(state.first);
    const y = coords.top + window.scrollY - window.innerHeight / 2.5;
    window.scrollTo({ top: Math.max(0, y), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [editor, open, state.first, state.index]);

  const setOption = (key: keyof FindOptions) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    editor.commands.setFind(query, 0, next);
  };
  const close = () => {
    onClose();
    const back = opener.current;
    opener.current = null;
    if (back?.isConnected && !editor.view.dom.contains(back) && back !== document.body) back.focus();
    else editor.commands.focus();
  };
  const toggleReplace = () => {
    const next = !replacing;
    setReplacing(next);
    (next ? replaceInput : input).current?.focus();
  };
  const replaceOne = () => editor.commands.replaceCurrent(replacement);
  const replaceAll = () => {
    const n = state.count;
    if (!n) return;
    editor.commands.replaceAll(replacement);
    toast.add({ type: "success", title: `Replaced ${n} ${n === 1 ? "match" : "matches"}`, description: `${keys("⌘Z")} undoes it.`, timeout: 2400 });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      toggleReplace();
    }
  };

  return (
    <div className="find-bar find-sidebar" role="search" aria-label="Find and replace" data-open={open || undefined} data-replacing={replacing || undefined} inert={!open} onKeyDown={onKey}>
      <div className="find-heading"><strong>Find in this page</strong><button type="button" className="admin-button admin-button-quiet" onClick={()=>window.dispatchEvent(new CustomEvent("admin:palette",{detail:{query}}))}>Search all writing ↗</button></div>
      <button
        type="button"
        className="admin-icon-button find-toggle"
        aria-expanded={replacing}
        aria-label={replacing ? "Hide replace" : "Replace"}
        title={`Replace  ${keys(shortcutLabel("replace"))}`}
        onClick={toggleReplace}
      >
        <CaretRight size={12} weight="bold" />
      </button>
      <div className="find-rows">
        <div className="find-row">
          <input
            ref={input}
            value={query}
            placeholder="Find in this post"
            aria-label="Find in this post"
            onChange={(e) => {
              setQuery(e.target.value);
              editor.commands.setFind(e.target.value, 0, options);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor.commands.findStep(e.shiftKey ? -1 : 1);
              }
            }}
          />
          <button type="button" className="find-option" aria-pressed={Boolean(options.caseSensitive)} onClick={() => setOption("caseSensitive")} title="Match case" aria-label="Match case">
            Aa
          </button>
          <button type="button" className="find-option" aria-pressed={Boolean(options.wholeWord)} onClick={() => setOption("wholeWord")} title="Whole word" aria-label="Whole word">
            <span className="find-word">ab</span>
          </button>
          <span className="find-count" aria-live="polite" data-empty={(query && !state.count) || undefined}>
            {query ? (state.count ? `${state.index + 1} of ${state.count}` : "No matches") : ""}
          </span>
          <button type="button" className="admin-icon-button" onClick={() => editor.commands.findStep(-1)} aria-label="Previous match" disabled={!state.count}>
            <CaretUp size={14} weight="bold" />
          </button>
          <button type="button" className="admin-icon-button" onClick={() => editor.commands.findStep(1)} aria-label="Next match" disabled={!state.count}>
            <CaretDown size={14} weight="bold" />
          </button>
          <button type="button" className="admin-icon-button" onClick={close} aria-label="Close find">
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="find-replace-wrap" data-open={replacing || undefined} inert={!replacing}>
          <div className="find-row find-replace">
            <input
              ref={replaceInput}
              value={replacement}
              placeholder="Replace with"
              aria-label="Replace with"
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.metaKey || e.ctrlKey) replaceAll();
                  else replaceOne();
                }
              }}
            />
            <button type="button" className="admin-button admin-button-quiet find-action" onClick={replaceOne} disabled={!state.count} title="Replace  ↵">
              Replace
            </button>
            <button type="button" className="admin-button admin-button-quiet find-action" onClick={replaceAll} disabled={!state.count} title={`Replace all  ${keys("⌘↵")}`}>
              Replace all
            </button>
          </div>
        </div>
      </div>
      <div className="find-results" aria-label="Search results">{state.results.map(result=><button type="button" key={result.index} aria-current={state.index===result.index ? "true" : undefined} onClick={()=>editor.commands.setFind(query,result.index,options)}><small>{result.index+1} · {result.block}</small><span>{result.before}<mark>{result.text}</mark>{result.after}</span></button>)}</div>
    </div>
  );
}

/* ── Phone toolbar ───────────────────────────────────────────────────── */

/**
 * On a phone the selection bubble would fight iOS's own edit menu, so
 * formatting lives in a bar that rides on top of the keyboard instead,
 * tracked with visualViewport (the one thing that knows where the keyboard
 * is in Safari and Chrome on iOS).
 */
export function MobileToolbar({ editor, ...pick }: { editor: Editor } & Pickers) {
  const [focused, setFocused] = useState(false);
  const [bottom, setBottom] = useState(0);
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      todo: e.isActive("taskList"),
      bullet: e.isActive("bulletList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      block: activeBlock(e),
    }),
  });

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => window.setTimeout(() => setFocused(editor.isFocused || Boolean(document.activeElement?.closest(".mobile-bar, .color-panel"))), 120);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    const vv = window.visualViewport;
    const place = () => {
      if (!vv) return;
      setBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    place();
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
    };
  }, [editor]);

  // Pressing keeps the keyboard up (no focus change on pointerdown); the
  // action itself runs on click, so Enter, Space and switch access work too.
  const tap = (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => e.preventDefault(),
    onClick: () => fn(),
  });
  const blockIndex = BLOCKS.findIndex((b) => b.kind === state.block);

  return (
    <div className="mobile-bar" data-visible={focused || undefined} style={{ transform: `translateY(${-bottom}px)` }}>
      {linking ? (
        <form
          className="mobile-bar-link"
          onSubmit={(e) => {
            e.preventDefault();
            const v = href.trim();
            const chain = editor.chain().focus().extendMarkRange("link");
            (v ? chain.setLink({ href: /^(https?:|mailto:|\/|#)/.test(v) ? v : `https://${v}` }) : chain.unsetLink()).run();
            setLinking(false);
          }}
        >
          <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setLinking(false); editor.commands.focus(); } }} placeholder="Paste a link" inputMode="url" aria-label="Link address" />
          <button type="submit" className="admin-button admin-button-primary">
            Apply
          </button>
          <button type="button" className="admin-icon-button" {...tap(() => setLinking(false))} aria-label="Cancel">
            <X size={16} weight="bold" />
          </button>
        </form>
      ) : (
        <div className="mobile-bar-scroll">
          <ColorPicker editor={editor} />
          <button type="button" className="mobile-tool" {...tap(() => editor.chain().focus().insertContent("/").run())} aria-label="Insert a block">
            <Plus size={18} weight="bold" />
          </button>
          <button
            type="button"
            className="mobile-tool mobile-tool-wide"
            {...tap(() => turnInto(editor, BLOCKS[(blockIndex + 1) % BLOCKS.length].kind))}
            aria-label="Change block type"
          >
            {BLOCKS[blockIndex]?.icon}
            <span>{BLOCKS[blockIndex]?.title}</span>
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" aria-pressed={state.bold} {...tap(() => editor.chain().focus().toggleBold().run())} aria-label="Bold">
            <TextB size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.italic} {...tap(() => editor.chain().focus().toggleItalic().run())} aria-label="Italic">
            <TextItalic size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.underline} {...tap(() => editor.chain().focus().toggleUnderline().run())} aria-label="Underline">
            <TextUnderline size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.strike} {...tap(() => editor.chain().focus().toggleStrike().run())} aria-label="Strikethrough">
            <TextStrikethrough size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.highlight} {...tap(() => editor.chain().focus().toggleHighlight().run())} aria-label="Highlight">
            <HighlighterCircle size={18} />
          </button>
          <button
            type="button"
            className="mobile-tool"
            {...tap(() => {
              setHref((editor.getAttributes("link").href as string | undefined) ?? "");
              setLinking(true);
            })}
            aria-label="Link"
          >
            <LinkSimple size={18} weight="bold" />
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" aria-pressed={state.todo} {...tap(() => editor.chain().focus().toggleTaskList().run())} aria-label="To-do list">
            <CheckSquare size={18} />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.bullet} {...tap(() => editor.chain().focus().toggleBulletList().run())} aria-label="Bulleted list">
            <ListBullets size={18} />
          </button>
          <button type="button" className="mobile-tool" {...tap(pick.pickImage)} aria-label="Image">
            <ImageSquare size={18} />
          </button>
          {pick.pickVoice ? (
            <button type="button" className="mobile-tool" {...tap(pick.pickVoice)} aria-label="Record a voice note">
              <Microphone size={18} />
            </button>
          ) : null}
          <button type="button" className="mobile-tool" {...tap(pick.pickEmoji)} aria-label="Emoji">
            <Smiley size={18} />
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" disabled={!state.canUndo} {...tap(() => editor.chain().focus().undo().run())} aria-label="Undo">
            <ArrowUUpLeft size={18} />
          </button>
          <button type="button" className="mobile-tool" disabled={!state.canRedo} {...tap(() => editor.chain().focus().redo().run())} aria-label="Redo">
            <ArrowUUpRight size={18} />
          </button>
          <button type="button" className="mobile-tool" {...tap(() => editor.commands.blur())} aria-label="Hide keyboard">
            <Keyboard size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
