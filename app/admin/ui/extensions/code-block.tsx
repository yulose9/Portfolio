"use client";

import CodeBlock from "@tiptap/extension-code-block";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Check, CopySimple, TextAlignLeft } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import AdminSelect from "../AdminSelect";
import { copy } from "../../../components/menu/actions";

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

function CodeBlockView({ node, editor, updateAttributes }: NodeViewProps) {
  const language = String(node.attrs.language ?? "");
  // Preserve imported fence names (including aliases) until explicitly changed.
  const options = languages.some(option => option.value === language)
    ? languages : [...languages, { value: language, label: language }];
  const [wrapped, setWrapped] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); };
  }, []);

  const copyCode = async () => {
    const ok = await copy(node.textContent, "Code copied");
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setCopied(ok);
    if (ok) timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <NodeViewWrapper className="editor-code-block" data-wrapped={wrapped || undefined}>
      <div className="editor-code-tools" contentEditable={false}>
        <AdminSelect label="Code language" hideLabel value={language} options={options}
          disabled={!editor.isEditable} onValueChange={value => updateAttributes({ language: value || null })} />
        <div className="editor-code-actions">
          <button type="button" aria-label="Wrap code" aria-pressed={wrapped}
            title="Wrap long lines (view only)" onClick={() => setWrapped(value => !value)}>
            <TextAlignLeft size={15} aria-hidden /><span>Wrap</span>
          </button>
          <button type="button" aria-label="Copy code" onClick={() => void copyCode()}>
            {copied ? <Check size={15} aria-hidden /> : <CopySimple size={15} aria-hidden />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre spellCheck={false}><NodeViewContent<"code"> as="code" style={{ whiteSpace: "inherit" }} /></pre>
    </NodeViewWrapper>
  );
}

// Only the editor view changes. Keep Tiptap's code schema, commands, paste,
// HTML and Markdown serializers so toolbar state never becomes document data.
export const WritingCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
