import { Mark } from "@tiptap/core";
import { textColor, textOpacity } from "../../../../cms/inline";
import { findFont, fontStack } from "../../../../cms/fonts";
const font=findFont;

export const TextColor = Mark.create({
  name: "textColor",
  addAttributes: () => ({color: {default: null},font:{default:null},opacity:{default:100}}),
  parseHTML: () => [{tag: "span[data-text-color]", getAttrs: element => ({color:textColor(element.getAttribute("data-text-color")),font:font(element.getAttribute("data-text-font"))?.family??null,opacity:textOpacity(element.getAttribute("data-text-opacity"))})}],
  renderHTML: ({HTMLAttributes:a}) => ["span", {"data-text-color": textColor(a.color)??"inherit","data-text-font":font(a.font)?.family??"","data-text-opacity":textOpacity(a.opacity),style: `color:${textColor(a.color) ?? "inherit"};opacity:${textOpacity(a.opacity)/100};font-family:${font(a.font)?fontStack(font(a.font)!):"inherit"}`}, 0],
  markdownTokenizer: {
    name: "textColor", level: "inline", start: source => source.indexOf('<span data-text-color="'),
    tokenize: (source, _tokens, lexer) => {
      const match = /^<span data-text-color="(#[0-9a-f]{6}|inherit)"(?: data-text-font="([a-zA-Z0-9 -]*)" data-text-opacity="(\d{1,3})")?>([\s\S]*?)<\/span>/i.exec(source);
      if (!match) return undefined;
      return {type: "textColor", raw: match[0], color: match[1],font:font(match[2])?.family??null,opacity:textOpacity(match[3]), tokens: lexer.inlineTokens(match[4])};
    },
  },
  parseMarkdown: (token, helpers) => helpers.applyMark("textColor", helpers.parseInline(token.tokens ?? []), {color: textColor(token.color),font:font(token.font)?.family??null,opacity:textOpacity(token.opacity)}),
  renderMarkdown: (node, helpers) => `<span data-text-color="${textColor(node.attrs?.color) ?? "inherit"}" data-text-font="${font(node.attrs?.font)?.family??""}" data-text-opacity="${textOpacity(node.attrs?.opacity)}">${helpers.renderChildren(node.content ?? [])}</span>`,
});
