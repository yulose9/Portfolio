import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { DOMSerializer, Slice } from "@tiptap/pm/model";
import { CLIPBOARD_TYPE, readClipboard } from "../../../../cms/clipboard";

export const WritingClipboard = Extension.create({
  name: "writingClipboard",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            copy: (view, event) => {
              if (!event.clipboardData || view.state.selection.empty)
                return false;
              const slice = view.state.selection.content(),
                container = document.createElement("div");
              container.append(
                DOMSerializer.fromSchema(view.state.schema).serializeFragment(
                  slice.content,
                ),
              );
              const raw = JSON.stringify({
                version: 1,
                content: slice.content.toJSON(),
                openStart: slice.openStart,
                openEnd: slice.openEnd,
              });
              if (raw.length > 1_200_000) return false;
              event.clipboardData.setData(CLIPBOARD_TYPE, raw);
              event.clipboardData.setData("text/html", container.innerHTML);
              event.clipboardData.setData(
                "text/plain",
                slice.content.textBetween(0, slice.content.size, "\n\n"),
              );
              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});
export function pasteWritingClipboard(
  view: import("@tiptap/pm/view").EditorView,
  raw: string,
) {
  const clean = readClipboard(raw);
  if (!clean) return false;
  try {
    const slice = Slice.fromJSON(view.state.schema, clean);
    slice.content.forEach((node) => node.check());
    view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    return true;
  } catch {
    return false;
  }
}
