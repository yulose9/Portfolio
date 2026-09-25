"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "../../lib/toast";
import { api, ApiError, type Draft, type Revision } from "./api";
import { exactTime, relative } from "./bits";
import { diffWords, wordDelta, type Piece } from "./diff";
import { keys } from "./menu";
import Sheet from "./Sheet";

/*
 * History: the post's timeline. Autosave keeps a revision every ten minutes
 * while you write, and ⌘S, publishing, scheduling and restoring each keep one
 * on the spot. Every entry says how many words it added and removed since the
 * one before; open one to see exactly what changed, word by word, and restore
 * it if you want it back (the current text is kept as a revision first).
 */

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, new Date())) return "Today";
  if (same(d, new Date(Date.now() - 864e5))) return "Yesterday";
  return dayFormat.format(d);
}

/** Long unchanged stretches fold down to their ends, so the changes are what you read. */
function Diff({ pieces }: { pieces: Piece[] }) {
  if (!pieces.some((p) => p.op !== "eq")) return <p className="field-help">No changes in the text.</p>;
  return (
    <div className="diff">
      {pieces.map((p, i) => {
        if (p.op === "ins") return <ins key={i}>{p.text}</ins>;
        if (p.op === "del") return <del key={i}>{p.text}</del>;
        const t = p.text;
        if (t.length <= 220) return <span key={i}>{t}</span>;
        const head = i === 0 ? "" : t.slice(0, 100);
        const tail = i === pieces.length - 1 ? "" : t.slice(-100);
        return (
          <span key={i}>
            {head}
            <span className="diff-fold">⋯</span>
            {tail}
          </span>
        );
      })}
    </div>
  );
}

export default function RevisionsSheet({
  open,
  onClose,
  doc,
  currentBody,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  doc: Draft;
  currentBody: string;
  onRestored: () => void;
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [against, setAgainst] = useState<"previous" | "current">("previous");
  const [restoring, setRestoring] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRevisions(null);
      setSelected(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    api
      .revisions(doc.id)
      .then(({ revisions }) => live && setRevisions(revisions))
      .catch(() => live && setRevisions([]));
    return () => {
      live = false;
    };
  }, [open, doc.id]);

  // Revision bodies load on demand and stay cached while the sheet is open.
  const loading = useRef(new Set<string>());
  const need = (at: string | undefined) => {
    if (!at || bodies[at] !== undefined || loading.current.has(at)) return;
    loading.current.add(at);
    api
      .revision(doc.id, at)
      .then(({ revision }) => setBodies((b) => ({ ...b, [at]: revision.body })))
      .catch(() => setBodies((b) => ({ ...b, [at]: "" })))
      .finally(() => loading.current.delete(at));
  };

  const index = revisions && selected ? revisions.findIndex((r) => r.at === selected) : -1;
  const previous = index >= 0 ? revisions?.[index + 1] : undefined;

  const choose = (at: string) => {
    setSelected(at);
    need(at);
    const i = revisions?.findIndex((r) => r.at === at) ?? -1;
    need(revisions?.[i + 1]?.at);
  };

  const pieces = useMemo(() => {
    if (!selected || bodies[selected] === undefined) return null;
    if (against === "current") return diffWords(bodies[selected], currentBody);
    if (previous && bodies[previous.at] === undefined) return null;
    return diffWords(previous ? bodies[previous.at] : "", bodies[selected]);
  }, [selected, bodies, against, previous, currentBody]);

  // Newest first, by day. Each delta compares an entry's word count with the one before it.
  const groups = useMemo(() => {
    const out: { day: string; rows: (Revision & { delta: number | null })[] }[] = [];
    (revisions ?? []).forEach((r, i) => {
      const older = revisions?.[i + 1];
      const delta = older ? r.words - older.words : null;
      const day = dayLabel(r.at);
      const group = out[out.length - 1];
      if (group?.day === day) group.rows.push({ ...r, delta });
      else out.push({ day, rows: [{ ...r, delta }] });
    });
    return out;
  }, [revisions]);

  const restore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      await api.restore(doc.id, selected);
      toast.add({ type: "success", title: "Revision restored", description: "The text you had is kept in History too." });
      onRestored();
    } catch (error) {
      setRestoring(false);
      toast.add({ type: "error", title: "Couldn’t restore", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  const delta = pieces ? wordDelta(pieces) : null;

  return (
    <Sheet open={open} onClose={onClose} title="History" description="Every save you make on purpose, and one every ten minutes while you write.">
      <dl className="history-facts">
        <div>
          <dt>Created</dt>
          <dd title={exactTime(doc.createdAt)}>{relative(doc.createdAt)}</dd>
        </div>
        <div>
          <dt>Last edited</dt>
          <dd title={exactTime(doc.updatedAt)}>{relative(doc.updatedAt)}</dd>
        </div>
        <div>
          <dt>{doc.status === "scheduled" ? "Goes live" : "Published"}</dt>
          <dd>{doc.status === "scheduled" && doc.publishAt ? exactTime(doc.publishAt) : doc.publishedAt ? exactTime(doc.publishedAt) : "Not yet"}</dd>
        </div>
      </dl>

      {revisions === null ? (
        <ul className="rev-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rev-skeleton" />
          ))}
        </ul>
      ) : revisions.length === 0 ? (
        <p className="field-help">Nothing yet. Press {keys("⌘S")} to keep a revision.</p>
      ) : (
        <div className="timeline">
          {groups.map((g) => (
            <section key={g.day} className="timeline-day">
              <h3 className="timeline-day-title">{g.day}</h3>
              <ul className="rev-list">
                {g.rows.map((r) => (
                  <li key={r.at}>
                    <button
                      type="button"
                      className="rev-row"
                      aria-pressed={selected === r.at}
                      onClick={() => choose(r.at)}
                      title={exactTime(r.at)}
                      data-kind={/publish|schedul/i.test(r.label) ? "publish" : /restore|duplicat/i.test(r.label) ? "restore" : undefined}
                    >
                      <span className="rev-dot" aria-hidden="true" />
                      <span className="rev-label">{r.label}</span>
                      <span className="rev-time">{timeFormat.format(new Date(r.at))}</span>
                      <span className="rev-meta">
                        {r.words.toLocaleString()} {r.words === 1 ? "word" : "words"}
                        {r.delta ? (
                          <span className="rev-delta" data-sign={r.delta > 0 ? "up" : "down"}>
                            {r.delta > 0 ? `+${r.delta}` : `−${-r.delta}`}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <div className="rev-preview">
          <div className="rev-preview-head">
            <div className="admin-segments" role="radiogroup" aria-label="Compare">
              <button type="button" role="radio" aria-checked={against === "previous"} className="admin-segment" onClick={() => setAgainst("previous")}>
                What changed
              </button>
              <button type="button" role="radio" aria-checked={against === "current"} className="admin-segment" onClick={() => setAgainst("current")}>
                Compared with now
              </button>
            </div>
            {delta ? (
              <span className="rev-meta">
                <span className="rev-delta" data-sign="up">
                  +{delta.added}
                </span>{" "}
                <span className="rev-delta" data-sign="down">
                  −{delta.removed}
                </span>{" "}
                words
              </span>
            ) : null}
          </div>
          {pieces ? <Diff pieces={pieces} /> : <div className="rev-skeleton" />}
          <button type="button" className="admin-button admin-button-primary" data-keycap onClick={restore} disabled={restoring || !pieces}>
            {restoring ? "Restoring…" : "Restore this revision"}
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}
