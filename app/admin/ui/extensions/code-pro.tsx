"use client";

import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ListNumbers, TextAlignLeft } from "@phosphor-icons/react";
import { useState } from "react";

import { normalizeRanges, rangeLines } from "../../../../cms/blocks";
import CopyButton from "../../../components/code/CopyButton";
import { languageName } from "../../../components/code/languages";
import AdminSelect from "../AdminSelect";
import { CodeBlockPlus } from "./blocks-schema";

/*
 * The code block, in the editor: the same artifact frame the site draws
 * (file name, language, copy with a check, wrap), plus the fence options a
 * writer sets here: line numbers, and which lines to highlight ("2,4-5").
 * All of it is fence meta, so it reads fine on GitHub too.
 */

const languages = [
  ["", "Plain text"], ["bash", "Bash"], ["c", "C"], ["cpp", "C++"],
  ["csharp", "C#"], ["css", "CSS"], ["diff", "Diff"], ["go", "Go"],
  ["graphql", "GraphQL"], ["html", "HTML"], ["java", "Java"],
  ["javascript", "JavaScript"], ["json", "JSON"], ["jsx", "JSX"],
  ["kotlin", "Kotlin"], ["markdown", "Markdown"], ["php", "PHP"],
  ["powershell", "PowerShell"], ["python", "Python"], ["ruby", "Ruby"],
  ["rust", "Rust"], ["sql", "SQL"], ["swift", "Swift"], ["toml", "TOML"],
  ["tsx", "TSX"], ["typescript", "TypeScript"], ["xml", "XML"], ["yaml", "YAML"],
].map(([value, label]) => ({ value, label }));

function CodeView({ node, editor, updateAttributes }: NodeViewProps) {
  const language = String(node.attrs.language ?? "");
  const options = languages.some((o) => o.value === language) ? languages : [...languages, { value: language, label: language }];
  const [wrapped, setWrapped] = useState(false);
  const [lines, setLines] = useState(String(node.attrs.highlight ?? ""));
  const editable = editor.isEditable;
  const count = Math.max(1, node.textContent.split("\n").length);
  const marked = rangeLines(String(node.attrs.highlight ?? ""));

  return (
    <NodeViewWrapper className="editor-code-pro code-block" data-wrap={wrapped || undefined} data-line-numbers={node.attrs.lineNumbers || undefined}>
      <div className="code-block-header" contentEditable={false}>
        <span className="code-block-title">
          <input
            className="code-file-input"
            value={String(node.attrs.title ?? "")}
            placeholder={languageName(language) === "Text" ? "File name" : `${languageName(language)} · file name`}
            aria-label="File name"
            maxLength={200}
            disabled={!editable}
            onChange={(e) => updateAttributes({ title: e.target.value })}
          />
        </span>
        <span className="code-block-actions">
          <AdminSelect label="Code language" hideLabel value={language} options={options} disabled={!editable} onValueChange={(value) => updateAttributes({ language: value || null })} />
          <input
            className="code-lines-input"
            value={lines}
            placeholder="Lines"
            aria-label="Highlight lines, like 2,4-5"
            title="Highlight lines, like 2,4-5"
            disabled={!editable}
            onChange={(e) => setLines(e.target.value)}
            onBlur={() => {
              const next = normalizeRanges(lines);
              setLines(next);
              updateAttributes({ highlight: next });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <button type="button" className="code-action" aria-pressed={Boolean(node.attrs.lineNumbers)} aria-label="Line numbers" title="Line numbers" disabled={!editable} onClick={() => updateAttributes({ lineNumbers: !node.attrs.lineNumbers })}>
            <ListNumbers size={15} aria-hidden />
          </button>
          <button type="button" className="code-action" aria-pressed={wrapped} aria-label="Wrap code" title="Wrap long lines (view only)" onClick={() => setWrapped((w) => !w)}>
            <TextAlignLeft size={15} aria-hidden />
          </button>
          <CopyButton text={() => node.textContent} copiedTitle={node.attrs.title ? `${node.attrs.title} copied` : "Code copied"} />
        </span>
      </div>
      <div className="code-block-body editor-code-body">
        {node.attrs.lineNumbers || marked.size ? (
          <div className="editor-code-gutter" contentEditable={false} aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} data-highlighted={marked.has(i + 1) || undefined}>{node.attrs.lineNumbers ? i + 1 : ""}</span>
            ))}
          </div>
        ) : null}
        <pre spellCheck={false}>
          <NodeViewContent<"code"> as="code" style={{ whiteSpace: "inherit" }} />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}

/** The code block, with its editing frame. Schema and Markdown: blocks-schema.ts. */
export const WritingCodeBlockPro = CodeBlockPlus.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeView);
  },
});
