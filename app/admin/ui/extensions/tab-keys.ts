import { Extension, type Editor } from "@tiptap/core";
import { Fragment, type ResolvedPos } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

/*
 * Tab, everywhere in the body.
 *
 * While you're writing, Tab never takes the caret out of the editor:
 *  - in a list (bulleted, numbered, to-do), Tab nests the item and Shift+Tab
 *    brings it back out, wherever the caret sits in the item and for a
 *    selection across several items;
 *  - in a code block, Tab indents by two spaces and Shift+Tab removes them
 *    (the code block's own option, switched on in Editor.tsx);
 *  - in a table, Tab and Shift+Tab move between cells (the table's own keys);
 *  - on a paragraph straight after a list, Tab tucks it into the list's last
 *    item, as Notion does, and Shift+Tab takes it back out;
 *  - anywhere else it does nothing.
 *
 * Keyboard users still need a way past the editor: Escape, then Tab, moves
 * focus on as usual (Shift+Tab back). Any other key in between cancels that.
 *
 * The extension runs after every other Tab handler (low priority), so lists,
 * tables, code, and the slash and mention menus keep first claim on the key.
 */

const ITEMS = ["listItem", "taskItem"];
const LISTS = ["bulletList", "orderedList", "taskList"];

/** The innermost list item around the selection's start, by type name. */
function itemAt($pos: ResolvedPos): string | null {
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name;
    if (ITEMS.includes(name)) return name;
  }
  return null;
}

/** A paragraph directly after a list: nest it into that list's last item. */
function nestIntoList(editor: Editor): boolean {
  const { $from, $to } = editor.state.selection;
  if (!$from.sameParent($to) || $from.parent.type.name !== "paragraph" || $from.depth < 1) return false;
  const index = $from.index($from.depth - 1);
  if (index === 0) return false;
  const previous = $from.node($from.depth - 1).child(index - 1);
  if (!LISTS.includes(previous.type.name)) return false;
  const last = previous.lastChild;
  if (!last || !last.canReplace(last.childCount, last.childCount, Fragment.from($from.parent))) return false;
  const start = $from.before();
  const end = $from.after();
  // Inside the last item, just before its closing tokens (item, list).
  const into = start - 2;
  const offset = $from.parentOffset;
  const span = $to.parentOffset - offset;
  return editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      tr.delete(start, end).insert(into, $from.parent);
      const at = into + 1 + offset;
      tr.setSelection(TextSelection.create(tr.doc, at, at + span)).scrollIntoView();
    }
    return true;
  });
}

/** The reverse: a trailing paragraph inside the last item goes back out below the list. */
function unnestFromList(editor: Editor): boolean {
  const { $from, $to } = editor.state.selection;
  if (!$from.sameParent($to) || $from.parent.type.name !== "paragraph" || $from.depth < 3) return false;
  const item = $from.node(-1);
  const list = $from.node(-2);
  if (!ITEMS.includes(item.type.name) || !LISTS.includes(list.type.name)) return false;
  // Only a continuation paragraph (not the item's own first line), and only
  // the very last thing in the list, so taking it out splits nothing.
  if ($from.index(-1) === 0 || $from.index(-1) !== item.childCount - 1 || $from.index(-2) !== list.childCount - 1) return false;
  const start = $from.before();
  const end = $from.after();
  const outside = $from.after(-2); // after the list
  const offset = $from.parentOffset;
  const span = $to.parentOffset - offset;
  return editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      const paragraph = $from.parent;
      tr.insert(outside, paragraph).delete(start, end);
      // The copy now starts where the list used to end, less the paragraph that left it.
      const at = outside - paragraph.nodeSize + 1 + offset;
      tr.setSelection(TextSelection.create(tr.doc, at, at + span)).scrollIntoView();
    }
    return true;
  });
}

function indent(editor: Editor, out: boolean): boolean {
  const { $from } = editor.state.selection;
  if ($from.parent.type.name === "codeBlock") return true; // the code block's own keys had their turn
  const item = itemAt($from);
  if (out) {
    if (item) editor.commands.liftListItem(item);
    return true;
  }
  if (item) {
    editor.commands.sinkListItem(item);
    return true;
  }
  nestIntoList(editor);
  return true;
}

const escapeKey = new PluginKey("tabEscape");

export const TabKeys = Extension.create({
  name: "tabKeys",
  // Lower than everything else's 100: only what no one else claimed reaches here.
  priority: 10,

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => indent(editor, false),
      "Shift-Tab": ({ editor }) => indent(editor, true),
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    let escaped = false;
    return [
      new Plugin({
        key: escapeKey,
        props: {
          handleDOMEvents: {
            // Runs before any keymap. Returning true after Escape leaves the
            // Tab to the browser, which moves focus on.
            keydown: (_view, event) => {
              if (event.key === "Escape") {
                escaped = true;
                return false;
              }
              if (event.key === "Tab" && escaped && !event.ctrlKey && !event.metaKey && !event.altKey) {
                escaped = false;
                return true;
              }
              // Ahead of the list's own Shift+Tab, which would lift the whole
              // item: a paragraph tucked into the last item goes back out alone.
              if (event.key === "Tab" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && unnestFromList(editor)) {
                event.preventDefault();
                return true;
              }
              if (!["Shift", "Control", "Meta", "Alt"].includes(event.key)) escaped = false;
              return false;
            },
            blur: () => {
              escaped = false;
              return false;
            },
          },
        },
      }),
    ];
  },
});
