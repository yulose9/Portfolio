"use client";

import { ArrowClockwise, ChartBarHorizontal, DotsSixVertical, Plus, Trash, X } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

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

const MAX_OPTIONS = 12;
const MIN_OPTIONS = 2;

/** Votes are kept by position; say how many a move would leave behind, and ask. */
function confirmMove(counts: number[], from: number, to: number, label: string) {
  const touched = counts.slice(Math.min(from, to), Math.max(from, to) + 1).reduce((a, n) => a + n, 0);
  if (!touched) return true;
  return window.confirm(
    `Votes are counted by position, so moving “${label}” leaves ${touched} ${touched === 1 ? "vote" : "votes"} counting for whichever option lands in ${touched === 1 ? "its" : "their"} place. Move it anyway?`,
  );
}

/** Tracks editor.isEditable, which can change without this node changing. */
function useEditable(editor: ReactNodeViewProps["editor"]) {
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const sync = () => setEditable(editor.isEditable);
    editor.on("update", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("update", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);
  return editable;
}

function PollView({ node, editor, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const options: string[] = Array.isArray(node.attrs.options) ? node.attrs.options.map(String) : ["", ""];
  const pollId = String(node.attrs.pollId ?? "");
  const editable = useEditable(editor);
  const { state, load, setState } = usePollTally(pollId, options.length);
  const [confirmReset, setConfirmReset] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const counts = state.status === "ready" ? state.tally.counts : [];
  const total = state.status === "ready" ? state.tally.total : 0;
  const question = useRef<HTMLInputElement>(null);
  const fields = useRef<(HTMLInputElement | null)[]>([]);
  const rows = useRef<HTMLOListElement>(null);
  // Where focus goes once the options have re-rendered after a change.
  const focusNext = useRef<number | null>(null);
  useEffect(() => {
    const i = focusNext.current;
    if (i === null) return;
    focusNext.current = null;
    focusField(i);
  });
  function focusField(i: number) {
    const field = i < 0 ? question.current : fields.current[i];
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }

  const set = (i: number, value: string) => updateAttributes({ options: options.map((o, n) => (n === i ? value : o)) });
  const insert = (at: number) => {
    if (options.length >= MAX_OPTIONS) return;
    updateAttributes({ options: [...options.slice(0, at), "", ...options.slice(at)] });
    focusNext.current = at;
  };
  const remove = (i: number) => {
    const votes = counts[i] ?? 0;
    const later = counts.slice(i + 1).some((n) => n > 0);
    if (votes || later) {
      const why = votes ? `“${options[i] || `Option ${i + 1}`}” has ${votes} ${votes === 1 ? "vote" : "votes"}, which will be lost.` : "";
      const shift = later ? " Votes on the options after it will move up one, onto the option above them." : "";
      if (!window.confirm(`${why}${shift} Remove it anyway?`.trim())) return false;
    }
    updateAttributes({ options: options.filter((_, n) => n !== i) });
    return true;
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= options.length || to === from) return;
    if (!confirmMove(counts, from, to, options[from] || `Option ${from + 1}`)) return;
    const next = [...options];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateAttributes({ options: next });
    focusNext.current = to;
  };
  const optionKeys = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.nativeEvent.isComposing) return;
    const field = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      insert(i + 1);
    } else if (e.key === "Backspace" && !field.value) {
      e.preventDefault();
      if (options.length <= MIN_OPTIONS) focusField(i - 1);
      else if (remove(i)) focusNext.current = Math.max(0, i - 1);
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.altKey) {
      e.preventDefault();
      move(i, e.key === "ArrowUp" ? i - 1 : i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusField(i - 1);
    } else if (e.key === "ArrowDown" && i < options.length - 1) {
      e.preventDefault();
      focusField(i + 1);
    }
  };
  // Reordering by the handle uses pointer events rather than drag and drop,
  // so ProseMirror's own dragging never picks up the poll block instead.
  const rowAt = (y: number) => {
    const items = Array.from(rows.current?.children ?? []);
    const i = items.findIndex((el) => {
      const box = el.getBoundingClientRect();
      return y < box.top + box.height / 2;
    });
    return i === -1 ? items.length - 1 : i;
  };
  const reset = async () => {
    setConfirmReset(false);
    try {
      const r = await fetch(`/api/admin/polls/${pollId}`, { method: "DELETE", headers: { "X-Admin-Request": "1", Accept: "application/json" } });
      const body = (await r.json().catch(() => ({}))) as { removed?: number; error?: string };
      if (!r.ok) throw new Error(body.error ?? "Couldn’t reset the votes.");
      setState({ status: "ready", tally: { counts: options.map(() => 0), total: 0 } });
      toast.add({ type: "success", title: "Votes reset", description: `${body.removed ?? 0} ${body.removed === 1 ? "vote" : "votes"} cleared.` });
    } catch (e) {
      toast.add({ type: "error", title: "Couldn’t reset the votes", description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <NodeViewWrapper className="editor-poll" data-selected={selected || undefined}>
      <div className="poll" contentEditable={false}>
        <div className="editor-block-toolbar">
          <ChartBarHorizontal size={16} aria-hidden />
          <input ref={question} className="editor-block-title poll-question" value={String(node.attrs.question ?? "")} placeholder="Ask a question" aria-label="Poll question" maxLength={200} disabled={!editable}
            onChange={(e) => updateAttributes({ question: e.target.value })}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                focusField(0);
              }
            }} />
          {editable ? (
            <button type="button" className="code-action" aria-label="Remove poll" title="Remove poll" onClick={() => deleteNode()}>
              <Trash size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        <ol ref={rows} className="poll-options editor-poll-options">
          {options.map((option, i) => {
            const n = counts[i] ?? 0;
            const share = total ? Math.round((n / total) * 100) : 0;
            const drop = drag && drag.from !== i && drag.over === i ? (i < drag.from ? "before" : "after") : undefined;
            return (
              <li key={i} className="poll-choice editor-poll-option" data-drop={drop} data-dragging={drag?.from === i || undefined}
                style={{ "--share": `${share}%` } as React.CSSProperties}
                // A press on the row's padding lands in its field, not on the block.
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget || !editable) return;
                  e.preventDefault();
                  focusField(i);
                }}>
                <span className="editor-poll-share" aria-hidden="true" />
                {editable ? (
                  <button type="button" className="editor-poll-handle" aria-label={`Move option ${i + 1}`} title="Drag to reorder, or Alt+↑/↓ in the field"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag({ from: i, over: i });
                    }}
                    onPointerMove={(e) => {
                      if (drag) setDrag({ ...drag, over: rowAt(e.clientY) });
                    }}
                    onPointerUp={() => {
                      if (drag) move(drag.from, drag.over);
                      setDrag(null);
                    }}
                    onPointerCancel={() => setDrag(null)}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                      e.preventDefault();
                      e.stopPropagation();
                      move(i, e.key === "ArrowUp" ? i - 1 : i + 1);
                    }}>
                    <DotsSixVertical size={14} weight="bold" aria-hidden />
                  </button>
                ) : (
                  <span className="poll-indicator" aria-hidden="true" />
                )}
                <input ref={(el) => { fields.current[i] = el; }} value={option} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} maxLength={120} disabled={!editable}
                  onChange={(e) => set(i, e.target.value)}
                  onKeyDown={optionKeys(i)} />
                {state.status === "ready" ? (
                  <span className="editor-poll-count" title={`${n} ${n === 1 ? "vote" : "votes"}`}>
                    {n}
                    <span className="sr-only"> {n === 1 ? "vote" : "votes"}</span>
                  </span>
                ) : null}
                {editable && options.length > MIN_OPTIONS ? (
                  <button type="button" className="code-action" aria-label={`Remove option ${i + 1}`} onClick={() => remove(i)}>
                    <X size={13} aria-hidden />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="poll-footer">
          {editable && options.length < MAX_OPTIONS ? (
            <button type="button" className="admin-button" onClick={() => insert(options.length)}>
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
