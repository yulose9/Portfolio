import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
type Owner = { token: symbol; cancel: () => void };
const owners = new WeakMap<Editor, Owner>();
/** One interactive form/menu owns the target; nested controls share its lease. */
export function ownInteraction(editor: Editor, cancel: () => void) {
  owners.get(editor)?.cancel();
  const token = Symbol("editor interaction");
  owners.set(editor, { token, cancel });
  let bookmark = editor.state.selection.getBookmark(),
    valid = true;
  const map = ({ transaction }: { transaction: Transaction }) => {
    bookmark = bookmark.map(transaction.mapping);
    if (transaction.docChanged) {
      try {
        const range = bookmark.resolve(transaction.doc);
        if (range.empty) valid = false;
      } catch {
        valid = false;
      }
    }
  };
  editor.on("transaction", map);
  return {
    restore() {
      if (!valid || editor.isDestroyed || owners.get(editor)?.token !== token)
        return false;
      try {
        editor.view.dispatch(
          editor.state.tr.setSelection(bookmark.resolve(editor.state.doc)),
        );
        return true;
      } catch {
        return false;
      }
    },
    release() {
      editor.off("transaction", map);
      if (owners.get(editor)?.token === token) owners.delete(editor);
    },
  };
}
