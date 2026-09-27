import { Mark } from "@tiptap/core";
import { textColor } from "../../../../cms/inline";

export const TextColor = Mark.create({
  name: "textColor",
  addAttributes: () => ({color: {default: null}}),
  parseHTML: () => [{tag: "span[data-text-color]", getAttrs: element => { const color = textColor(element.getAttribute("data-text-color")); return color ? {color} : false; }}],
  renderHTML: ({HTMLAttributes}) => ["span", {"data-text-color": textColor(HTMLAttributes.color), style: `color:${textColor(HTMLAttributes.color) ?? "inherit"}`}, 0],
  markdownTokenizer: {
    name: "textColor", level: "inline", start: source => source.indexOf('<span data-text-color="'),
    tokenize: (source, _tokens, lexer) => {
      const match = /^<span data-text-color="(#[0-9a-f]{6})">([\s\S]*?)<\/span>/i.exec(source);
      if (!match) return undefined;
      return {type: "textColor", raw: match[0], color: match[1], tokens: lexer.inlineTokens(match[2])};
    },
  },
  parseMarkdown: (token, helpers) => helpers.applyMark("textColor", helpers.parseInline(token.tokens ?? []), {color: textColor(token.color)}),
  renderMarkdown: (node, helpers) => `<span data-text-color="${textColor(node.attrs?.color) ?? "#52525b"}">${helpers.renderChildren(node.content ?? [])}</span>`,
});
