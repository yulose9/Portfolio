import { unified } from "unified";
import remarkParse from "remark-parse";
import { editorContent, type EditorNode } from "../editor-document";
import type { Draft } from "../format";

export type ProseBlock = { text: string; blockId?: string };
const parser = unified().use(remarkParse);
/** Index prose only. Code, existing links and embedded content are not suggestions. */
export function proseBlocks(draft: Draft): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  const root = editorContent(draft);
  const add = (text: string, blockId?: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) blocks.push({ text: clean, ...(blockId ? { blockId } : {}) });
  };
  if (root) {
    const text = (node: EditorNode): string => {
      if (
        ["codeBlock", "mention", "image", "embed", "media"].includes(
          node.type,
        ) ||
        node.marks?.some((m) => m.type === "code" || m.type === "link")
      )
        return "\n";
      return (
        node.text ??
        (node.type === "hardBreak"
          ? " "
          : (node.content ?? []).map(text).join(""))
      );
    };
    const visit = (node: EditorNode) => {
      if (["paragraph", "heading", "detailsSummary"].includes(node.type)) {
        // A separator prevents matching a title across a removed link or code span.
        text(node)
          .split("\n")
          .forEach((part) =>
            add(
              part,
              typeof node.attrs?.blockId === "string"
                ? node.attrs.blockId
                : undefined,
            ),
          );
      } else if (node.type !== "codeBlock") node.content?.forEach(visit);
    };
    visit(root);
  } else {
    type Node = { type: string; value?: string; children?: Node[] };
    const text = (node: Node): string => {
      if (
        [
          "code",
          "inlineCode",
          "link",
          "linkReference",
          "image",
          "imageReference",
          "html",
        ].includes(node.type)
      )
        return "\n";
      return node.value ?? (node.children ?? []).map(text).join("");
    };
    const visit = (node: Node) => {
      if (["paragraph", "heading"].includes(node.type)) {
        if (!node.children?.some((child) => child.type === "html"))
          text(node)
            .split("\n")
            .forEach((part) => add(part));
      } else if (node.type !== "code") node.children?.forEach(visit);
    };
    visit(parser.parse(draft.body));
  }
  return blocks;
}
