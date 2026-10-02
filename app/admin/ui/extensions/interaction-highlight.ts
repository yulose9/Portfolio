import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { mapInteractionRange } from "../interaction-range";
type Range = { from: number; to: number } | null;
export const interactionHighlight = new PluginKey<Range>(
  "interactionHighlight",
);
/**
 * The outline's landing mark: whole blocks (a heading and its section's first
 * block) washed for a moment after a jump. Set with `flashBlocks`.
 */
export const blockFlash = new PluginKey<Range[]>("blockFlash");
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
    new Plugin<Range[]>({
      key: blockFlash,
      state: {
        init: () => [],
        apply: (tr, old) => {
          const next = tr.getMeta(blockFlash);
          if (next !== undefined) return next;
          if (!old.length || !tr.docChanged) return old;
          return old
            .map((r) => ({
              from: tr.mapping.map(r!.from, 1),
              to: tr.mapping.map(r!.to, -1),
            }))
            .filter((r) => r.from < r.to);
        },
      },
      props: {
        decorations: (state) => {
          const ranges = blockFlash.getState(state);
          if (!ranges?.length) return DecorationSet.empty;
          const marks: Decoration[] = [];
          for (const r of ranges) {
            const node = r && state.doc.nodeAt(r.from);
            if (node && r!.from + node.nodeSize === r!.to)
              marks.push(
                Decoration.node(r!.from, r!.to, { class: "outline-flash" }),
              );
          }
          return DecorationSet.create(state.doc, marks);
        },
      },
    }),
  ],
});

let flashRun = 0;
/** Washes the blocks at these ranges, then clears them about 1.3s later. */
export function flashBlocks(
  view: EditorView,
  ranges: { from: number; to: number }[],
) {
  const run = ++flashRun;
  // Off first, so a repeat jump to the same heading restarts the animation.
  view.dispatch(view.state.tr.setMeta(blockFlash, []).setMeta("addToHistory", false));
  void (view.dom as HTMLElement).offsetWidth;
  view.dispatch(
    view.state.tr.setMeta(blockFlash, ranges).setMeta("addToHistory", false),
  );
  window.setTimeout(() => {
    if (run !== flashRun || view.isDestroyed) return;
    view.dispatch(
      view.state.tr.setMeta(blockFlash, []).setMeta("addToHistory", false),
    );
  }, 1300);
}
