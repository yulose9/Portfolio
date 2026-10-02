"use client";

import { Plus, Trash, X } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

import type { CodeTab } from "../../../../cms/blocks";
import CopyButton from "../../../components/code/CopyButton";
import AdminSelect from "../AdminSelect";
import { CodeTabsBase, DEFAULT_TABS } from "./blocks-schema";

/*
 * Code tabs, in the editor: the tab strip the site shows, where each tab's
 * name, language and code are edited in place. Tab inserts two spaces in the
 * code; Escape leaves the block.
 */

const LANGS = ["", "bash", "css", "go", "html", "javascript", "json", "jsx", "python", "rust", "sql", "toml", "tsx", "typescript", "yaml"]
  .map((value) => ({ value, label: value || "Plain text" }));

function TabsView({ node, editor, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const tabs: CodeTab[] = Array.isArray(node.attrs.tabs) && node.attrs.tabs.length ? node.attrs.tabs : DEFAULT_TABS;
  const [active, setActive] = useState(0);
  const i = Math.min(active, tabs.length - 1);
  const tab = tabs[i];
  const editable = editor.isEditable;
  const set = (patch: Partial<CodeTab>) => updateAttributes({ tabs: tabs.map((t, n) => (n === i ? { ...t, ...patch } : t)) });
  const options = LANGS.some((l) => l.value === tab.language) ? LANGS : [...LANGS, { value: tab.language, label: tab.language }];

  return (
    <NodeViewWrapper className="editor-code-tabs code-tabs" data-selected={selected || undefined}>
      <div className="code-tabs-header" contentEditable={false}>
        <div className="code-tabs-list" role="tablist" aria-label="Code tabs">
          {tabs.map((t, n) => (
            <button key={n} type="button" role="tab" aria-selected={n === i} className="code-tabs-tab" data-active={n === i || undefined}
              onClick={() => setActive(n)}>
              {t.label || `Tab ${n + 1}`}
            </button>
          ))}
          {editable ? (
            <button type="button" className="code-action" aria-label="Add a tab" title="Add a tab"
              onClick={() => {
                updateAttributes({ tabs: [...tabs, { label: `Tab ${tabs.length + 1}`, language: tab.language, code: "" }] });
                setActive(tabs.length);
              }}>
              <Plus size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        <span className="code-block-actions">
          <CopyButton text={() => tab.code} copiedTitle={`${tab.label} copied`} />
          {editable ? (
            <button type="button" className="code-action" aria-label="Remove code tabs" title="Remove block" onClick={() => deleteNode()}>
              <Trash size={14} aria-hidden />
            </button>
          ) : null}
        </span>
      </div>
      <div className="editor-code-tabs-meta" contentEditable={false}>
        <input value={tab.label} aria-label="Tab name" placeholder="Tab name" maxLength={60} disabled={!editable} onChange={(e) => set({ label: e.target.value })} />
        <AdminSelect label="Tab language" hideLabel value={tab.language} options={options} disabled={!editable} onValueChange={(language) => set({ language })} />
        {editable && tabs.length > 1 ? (
          <button type="button" className="code-action" aria-label={`Remove the ${tab.label} tab`} title="Remove this tab"
            onClick={() => {
              updateAttributes({ tabs: tabs.filter((_, n) => n !== i) });
              setActive(Math.max(0, i - 1));
            }}>
            <X size={14} aria-hidden />
          </button>
        ) : null}
      </div>
      <textarea
        className="editor-code-tabs-code"
        contentEditable={false}
        spellCheck={false}
        value={tab.code}
        disabled={!editable}
        rows={Math.min(24, Math.max(2, tab.code.split("\n").length))}
        aria-label={`${tab.label} code`}
        onChange={(e) => set({ code: e.target.value })}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: a, selectionEnd: b } = el;
            const code = `${tab.code.slice(0, a)}  ${tab.code.slice(b)}`;
            set({ code });
            requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
          } else if (e.key === "Escape") {
            editor.commands.focus();
          }
        }}
      />
    </NodeViewWrapper>
  );
}

export const CodeTabsBlock = CodeTabsBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TabsView);
  },
});
