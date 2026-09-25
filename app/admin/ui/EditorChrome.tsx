"use client";

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
import { keys, MenuSurface, MItem, MLabel, MSep, MSub } from "./menu";

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
  const [info, setInfo] = useState({ text: "", inTable: false, block: "paragraph" as ReturnType<typeof activeBlock> });

  const onContextMenu = (event: React.MouseEvent) => {
    const { from, to, empty } = editor.state.selection;
    const at = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
    if (at !== undefined && (empty || at < from || at > to)) editor.commands.setTextSelection(at);
    const sel = editor.state.selection;
    setInfo({
      text: editor.state.doc.textBetween(sel.from, sel.to, " ").trim(),
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
            <MItem icon={<LinkSimple {...I} />} keys={keys("⌘K")} onSelect={pick.onLink}>
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
          <MItem icon={<MagnifyingGlass {...I} />} keys={keys("⌘F")} onSelect={() => pick.onFind()}>
            Find in this post
          </MItem>
        )}
        {pick.onReplace ? (
          <MItem icon={<SwapIcon {...I} />} keys={keys("⌥⌘F")} onSelect={() => pick.onReplace?.(info.text || undefined)}>
            Find and replace…
          </MItem>
        ) : null}
        <MSep />
        <MItem icon={<CopySimple {...I} />} keys={keys("⌘D")} onSelect={() => { const b = block(); if (b) duplicateBlock(editor, b.pos); }}>
          Duplicate block
        </MItem>
        <MItem icon={<ArrowUp {...I} />} keys={keys("⌘⇧↑")} onSelect={() => { const b = block(); if (b) moveBlock(editor, b.pos, -1); }}>
          Move up
        </MItem>
        <MItem icon={<ArrowDown {...I} />} keys={keys("⌘⇧↓")} onSelect={() => { const b = block(); if (b) moveBlock(editor, b.pos, 1); }}>
          Move down
        </MItem>
        <MItem icon={<Trash {...I} />} danger onSelect={() => { const b = block(); if (b) deleteBlock(editor, b.pos); }}>
          Delete block
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
  const target = useRef<number | null>(null);
  const grip = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const onNodeChange = useCallback(({ pos }: { pos: number }) => {
    target.current = pos >= 0 ? pos : null;
  }, []);

  const at = () => target.current;
  const select = () => {
    const pos = at();
    if (pos === null) return null;
    editor.chain().setTextSelection(Math.min(pos + 1, editor.state.doc.content.size)).run();
    return pos;
  };

  return (
    <>
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
          <button
            ref={grip}
            type="button"
            className="block-button block-grip"
            aria-label="Drag to move, click for options"
            title="Drag to move · Click for options"
            onClick={() => setOpen(true)}
          >
            <DotsSixVertical size={16} weight="bold" />
          </button>
        </div>
      </DragHandle>
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Portal>
          <Menu.Positioner className="menu-positioner" anchor={grip} side="left" align="start" sideOffset={6} collisionPadding={8}>
            <Menu.Popup className="menu-popup admin-menu">
              <MLabel>Block</MLabel>
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
              <MItem icon={<CopySimple {...I} />} keys={keys("⌘D")} onSelect={() => { const p = at(); if (p !== null) duplicateBlock(editor, p); }}>
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
              <MItem icon={<Trash {...I} />} danger onSelect={() => { const p = at(); if (p !== null) deleteBlock(editor, p); }}>
                Delete
              </MItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
});

/* ── Find and replace ────────────────────────────────────────────────── */

/**
 * ⌘F finds; the chevron (or ⌥⌘F) opens the replace row under it. Match case
 * and whole word are Aa and ab| beside the field, like VS Code. Replace takes
 * the current match and moves on; Replace all is one step to undo.
 */
export function FindBar({
  editor,
  initial,
  initialIndex = 0,
  initialReplace = false,
  onClose,
}: {
  editor: Editor;
  initial: string;
  initialIndex?: number;
  initialReplace?: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initial);
  const [replacing, setReplacing] = useState(initialReplace);
  const [replacement, setReplacement] = useState("");
  const [options, setOptions] = useState<FindOptions>({});
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = findKey.getState(e.state);
      return { count: s?.matches.length ?? 0, index: s?.index ?? 0, first: s?.matches[s.index]?.from ?? -1 };
    },
  });

  useEffect(() => {
    editor.commands.setFind(initial, initialIndex, {});
    input.current?.focus();
    input.current?.select();
    return () => {
      editor.commands.setFind("", 0, {});
    };
  }, [editor, initial, initialIndex]);

  // Keep the current match in view, centred, with room for the top bar.
  useEffect(() => {
    if (state.first < 0) return;
    const coords = editor.view.coordsAtPos(state.first);
    const y = coords.top + window.scrollY - window.innerHeight / 2.5;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [editor, state.first, state.index]);

  const setOption = (key: keyof FindOptions) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    editor.commands.setFind(query, 0, next);
  };
  const close = () => {
    onClose();
    editor.commands.focus();
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
      setReplacing((r) => !r);
    }
  };

  return (
    <div className="find-bar" role="search" data-replacing={replacing || undefined} onKeyDown={onKey}>
      <button
        type="button"
        className="admin-icon-button find-toggle"
        aria-expanded={replacing}
        aria-label={replacing ? "Hide replace" : "Replace"}
        title={`Replace  ${keys("⌥⌘F")}`}
        onClick={() => {
          setReplacing((r) => !r);
          if (!replacing) window.setTimeout(() => replaceInput.current?.focus(), 0);
        }}
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
          <span className="find-count" aria-live="polite">
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
        {replacing ? (
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
              All
            </button>
          </div>
        ) : null}
      </div>
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
    const onBlur = () => window.setTimeout(() => setFocused(editor.isFocused || Boolean(document.activeElement?.closest(".mobile-bar"))), 120);
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

  const tap = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault(); // keep the keyboard up
    fn();
  };
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
          <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="Paste a link" inputMode="url" aria-label="Link address" />
          <button type="submit" className="admin-button admin-button-primary">
            Apply
          </button>
          <button type="button" className="admin-icon-button" onPointerDown={tap(() => setLinking(false))} aria-label="Cancel">
            <X size={16} weight="bold" />
          </button>
        </form>
      ) : (
        <div className="mobile-bar-scroll">
          <button type="button" className="mobile-tool" onPointerDown={tap(() => editor.chain().focus().insertContent("/").run())} aria-label="Insert a block">
            <Plus size={18} weight="bold" />
          </button>
          <button
            type="button"
            className="mobile-tool mobile-tool-wide"
            onPointerDown={tap(() => turnInto(editor, BLOCKS[(blockIndex + 1) % BLOCKS.length].kind))}
            aria-label="Change block type"
          >
            {BLOCKS[blockIndex]?.icon}
            <span>{BLOCKS[blockIndex]?.title}</span>
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" aria-pressed={state.bold} onPointerDown={tap(() => editor.chain().focus().toggleBold().run())} aria-label="Bold">
            <TextB size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.italic} onPointerDown={tap(() => editor.chain().focus().toggleItalic().run())} aria-label="Italic">
            <TextItalic size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.underline} onPointerDown={tap(() => editor.chain().focus().toggleUnderline().run())} aria-label="Underline">
            <TextUnderline size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.strike} onPointerDown={tap(() => editor.chain().focus().toggleStrike().run())} aria-label="Strikethrough">
            <TextStrikethrough size={18} weight="bold" />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.highlight} onPointerDown={tap(() => editor.chain().focus().toggleHighlight().run())} aria-label="Highlight">
            <HighlighterCircle size={18} />
          </button>
          <button
            type="button"
            className="mobile-tool"
            onPointerDown={tap(() => {
              setHref((editor.getAttributes("link").href as string | undefined) ?? "");
              setLinking(true);
            })}
            aria-label="Link"
          >
            <LinkSimple size={18} weight="bold" />
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" aria-pressed={state.todo} onPointerDown={tap(() => editor.chain().focus().toggleTaskList().run())} aria-label="To-do list">
            <CheckSquare size={18} />
          </button>
          <button type="button" className="mobile-tool" aria-pressed={state.bullet} onPointerDown={tap(() => editor.chain().focus().toggleBulletList().run())} aria-label="Bulleted list">
            <ListBullets size={18} />
          </button>
          <button type="button" className="mobile-tool" onPointerDown={tap(pick.pickImage)} aria-label="Image">
            <ImageSquare size={18} />
          </button>
          {pick.pickVoice ? (
            <button type="button" className="mobile-tool" onPointerDown={tap(pick.pickVoice)} aria-label="Record a voice note">
              <Microphone size={18} />
            </button>
          ) : null}
          <button type="button" className="mobile-tool" onPointerDown={tap(pick.pickEmoji)} aria-label="Emoji">
            <Smiley size={18} />
          </button>
          <span className="mobile-sep" />
          <button type="button" className="mobile-tool" disabled={!state.canUndo} onPointerDown={tap(() => editor.chain().focus().undo().run())} aria-label="Undo">
            <ArrowUUpLeft size={18} />
          </button>
          <button type="button" className="mobile-tool" disabled={!state.canRedo} onPointerDown={tap(() => editor.chain().focus().redo().run())} aria-label="Redo">
            <ArrowUUpRight size={18} />
          </button>
          <button type="button" className="mobile-tool" onPointerDown={tap(() => editor.commands.blur())} aria-label="Hide keyboard">
            <Keyboard size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
