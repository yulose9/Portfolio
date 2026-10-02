"use client";

import { ChartBarHorizontal, Plus, Trash, X } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { PollBase } from "./blocks-schema";

/*
 * A poll, in the editor: the question and its options (2 to 12). Readers
 * vote on the published page; votes are keyed by the poll's id and the
 * option's position, so reordering options after votes come in moves them.
 */

function PollView({ node, editor, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const options: string[] = Array.isArray(node.attrs.options) ? node.attrs.options.map(String) : ["", ""];
  const editable = editor.isEditable;
  const set = (i: number, value: string) => updateAttributes({ options: options.map((o, n) => (n === i ? value : o)) });
  return (
    <NodeViewWrapper className="editor-poll" data-selected={selected || undefined}>
      <div className="poll" contentEditable={false}>
        <div className="editor-block-toolbar">
          <ChartBarHorizontal size={16} aria-hidden />
          <input className="editor-block-title poll-question" value={String(node.attrs.question ?? "")} placeholder="Ask a question" aria-label="Poll question" maxLength={200} disabled={!editable}
            onChange={(e) => updateAttributes({ question: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
          {editable ? (
            <button type="button" className="code-action" aria-label="Remove poll" title="Remove poll" onClick={() => deleteNode()}>
              <Trash size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        <ol className="poll-options editor-poll-options">
          {options.map((option, i) => (
            <li key={i} className="poll-option">
              <span className="poll-indicator" aria-hidden="true" />
              <input value={option} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} maxLength={120} disabled={!editable}
                onChange={(e) => set(i, e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && options.length < 12) {
                    e.preventDefault();
                    updateAttributes({ options: [...options.slice(0, i + 1), "", ...options.slice(i + 1)] });
                  }
                }} />
              {editable && options.length > 2 ? (
                <button type="button" className="code-action" aria-label={`Remove option ${i + 1}`} onClick={() => updateAttributes({ options: options.filter((_, n) => n !== i) })}>
                  <X size={13} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="poll-footer">
          {editable && options.length < 12 ? (
            <button type="button" className="admin-button" onClick={() => updateAttributes({ options: [...options, ""] })}>
              <Plus size={13} aria-hidden /> Add option
            </button>
          ) : null}
          <p className="poll-note">Readers vote on the published page · id {String(node.attrs.pollId ?? "")}</p>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const PollBlock = PollBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PollView);
  },
});
