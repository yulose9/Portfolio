import type { Editor } from "@tiptap/core";

/** The React DragHandle registers a plugin, not the extension's editor commands. */
export function setDragHandleLocked(editor: Editor, locked: boolean) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(
    editor.state.tr.setMeta("lockDragHandle", locked).setMeta("addToHistory", false)
  );
}
