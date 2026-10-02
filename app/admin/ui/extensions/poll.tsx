"use client";

import { ArrowClockwise, ChartBarHorizontal, Plus, Trash, X } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";

import { toast } from "../../../lib/toast";
import { PollBase } from "./blocks-schema";

/*
 * A poll, in the editor: the question and its options (2 to 12), with the
 * live votes beside each option. Readers vote, change or take back their
 * vote on the published page; here the writer sees the counts, refreshes
 * them, and can reset them.
 *
 * Votes are kept by option position, so removing an option that has votes
 * moves the later options' votes up one. The editor asks before that.
 */

type Tally = { counts: number[]; total: number };
type State = { status: "loading" } | { status: "ready"; tally: Tally } | { status: "off"; message: string };

async function fetchTally(pollId: string, options: number): Promise<State> {
  try {
    const r = await fetch(`/api/admin/polls/${pollId}?options=${options}`, { headers: { Accept: "application/json" } });
    const body = (await r.json().catch(() => ({}))) as Partial<Tally> & { error?: string };
    if (!r.ok || !Array.isArray(body.counts)) throw new Error(body.error ?? "Votes aren’t available here.");
    return { status: "ready", tally: { counts: body.counts, total: body.total ?? 0 } };
  } catch (e) {
    return { status: "off", message: e instanceof Error ? e.message : "Votes aren’t available here." };
  }
}

function usePollTally(pollId: string, options: number) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    if (!pollId) return;
    let live = true;
    void fetchTally(pollId, options).then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, [pollId, options]);
  const load = useCallback(() => (pollId ? fetchTally(pollId, options).then(setState) : Promise.resolve()), [pollId, options]);
  // A poll gets its id when it is made; one without can have no votes yet.
  return { state: pollId ? state : ({ status: "off", message: "Saved polls show their votes here." } as State), load, setState };
}

function PollView({ node, editor, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const options: string[] = Array.isArray(node.attrs.options) ? node.attrs.options.map(String) : ["", ""];
  const pollId = String(node.attrs.pollId ?? "");
  const editable = editor.isEditable;
  const { state, load, setState } = usePollTally(pollId, options.length);
  const [confirmReset, setConfirmReset] = useState(false);
  const counts = state.status === "ready" ? state.tally.counts : [];
  const total = state.status === "ready" ? state.tally.total : 0;

  const set = (i: number, value: string) => updateAttributes({ options: options.map((o, n) => (n === i ? value : o)) });
  const remove = (i: number) => {
    const votes = counts[i] ?? 0;
    const later = counts.slice(i + 1).some((n) => n > 0);
    if (votes || later) {
      const why = votes ? `“${options[i] || `Option ${i + 1}`}” has ${votes} ${votes === 1 ? "vote" : "votes"}, which will be lost.` : "";
      const shift = later ? " Votes on the options after it will move up one, onto the option above them." : "";
      if (!window.confirm(`${why}${shift} Remove it anyway?`.trim())) return;
    }
    updateAttributes({ options: options.filter((_, n) => n !== i) });
  };
  const reset = async () => {
    setConfirmReset(false);
    try {
      const r = await fetch(`/api/admin/polls/${pollId}`, { method: "DELETE", headers: { "X-Admin-Request": "1", Accept: "application/json" } });
      const body = (await r.json().catch(() => ({}))) as { removed?: number; error?: string };
      if (!r.ok) throw new Error(body.error ?? "Couldn’t reset the votes.");
      setState({ status: "ready", tally: { counts: options.map(() => 0), total: 0 } });
      toast.add({ type: "success", title: "Votes reset", description: `${body.removed ?? 0} removed.` });
    } catch (e) {
      toast.add({ type: "error", title: "Couldn’t reset the votes", description: e instanceof Error ? e.message : undefined });
    }
  };

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
          {options.map((option, i) => {
            const n = counts[i] ?? 0;
            const share = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={i} className="poll-choice editor-poll-option" style={{ "--share": `${share}%` } as React.CSSProperties}>
                <span className="editor-poll-share" aria-hidden="true" />
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
                {state.status === "ready" ? (
                  <span className="editor-poll-count" title={`${n} ${n === 1 ? "vote" : "votes"}`}>
                    {n}
                    <span className="sr-only"> {n === 1 ? "vote" : "votes"}</span>
                  </span>
                ) : null}
                {editable && options.length > 2 ? (
                  <button type="button" className="code-action" aria-label={`Remove option ${i + 1}`} onClick={() => remove(i)}>
                    <X size={13} aria-hidden />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="poll-footer">
          {editable && options.length < 12 ? (
            <button type="button" className="admin-button" onClick={() => updateAttributes({ options: [...options, ""] })}>
              <Plus size={13} aria-hidden /> Add option
            </button>
          ) : (
            <span />
          )}
          <div className="editor-poll-meta">
            <p className="poll-note" role="status">
              {state.status === "loading"
                ? "Counting votes…"
                : state.status === "ready"
                  ? `${total.toLocaleString("en-US")} ${total === 1 ? "vote" : "votes"} on the published page`
                  : state.message}
            </p>
            <button type="button" className="code-action" aria-label="Refresh votes" title="Refresh votes" onClick={() => void load()}>
              <ArrowClockwise size={13} aria-hidden />
            </button>
            {editable && state.status === "ready" && total > 0 ? (
              confirmReset ? (
                <span className="editor-poll-confirm">
                  <button type="button" className="admin-button admin-button-danger" onClick={() => void reset()}>
                    Reset {total} {total === 1 ? "vote" : "votes"}
                  </button>
                  <button type="button" className="admin-button admin-button-quiet" onClick={() => setConfirmReset(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="admin-button admin-button-quiet" onClick={() => setConfirmReset(true)}>
                  Reset votes
                </button>
              )
            ) : null}
          </div>
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
