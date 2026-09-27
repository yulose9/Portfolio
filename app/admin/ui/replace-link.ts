import type { Editor } from "@tiptap/core";
import { safeInlineUrl } from "../../../cms/inline";

/** One transaction keeps link text/address editing undoable as one operation. */
export function replaceLink(editor: Editor, range: {from:number;to:number}, href:string, text:string) {
  const url = safeInlineUrl(href);
  if (!url || !text.trim() || range.from < 0 || range.to > editor.state.doc.content.size) return false;
  const {state} = editor;
  const link = state.schema.marks.link;
  const tr = state.tr;
  if (state.doc.textBetween(range.from,range.to," ") !== text) {
    const marks = state.doc.resolve(range.from).nodeAfter?.marks.filter(mark => mark.type !== link) ?? [];
    tr.replaceWith(range.from,range.to,state.schema.text(text,marks));
  }
  tr.addMark(range.from,range.from+text.length,link.create({href:url}));
  editor.view.dispatch(tr);
  return true;
}
