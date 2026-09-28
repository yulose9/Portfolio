import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { mapInteractionRange } from "../interaction-range";
type Range = { from: number; to: number } | null;
export const interactionHighlight = new PluginKey<Range>(
  "interactionHighlight",
);
/** Keep the target visible while a link form, rather than the editor, has focus. */
export const InteractionHighlight = Extension.create({
  name: "interactionHighlight",
  addProseMirrorPlugins: () => [
    new Plugin<Range>({
      key: interactionHighlight,
      state: {
        init: () => null,
        apply: (tr, old) => {
          const next = tr.getMeta(interactionHighlight);
          return next !== undefined
            ? next
            : old
              ? mapInteractionRange(old, tr)
              : null;
        },
      },
      props: {
        decorations: (state) => {
          const range = interactionHighlight.getState(state);
          return range &&
            range.from < range.to &&
            range.to <= state.doc.content.size
            ? DecorationSet.create(state.doc, [
                Decoration.inline(range.from, range.to, {
                  class: "editor-interaction-selection",
                }),
              ])
            : DecorationSet.empty;
        },
      },
    }),
  ],
});
