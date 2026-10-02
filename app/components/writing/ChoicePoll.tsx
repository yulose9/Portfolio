"use client";

import { useEffect, useId, useState } from "react";

import { SlidingNumber } from "../kit/inputs/counter";

/*
 * A poll readers vote in, after cult-ui's choice poll: pick one option, vote,
 * and the options turn into bars with their share, yours marked. Votes go to
 * /api/polls/<id> (functions/api/polls/[id].ts, a KV namespace bound as
 * POLLS); one per browser. Where that API isn't there (local dev, a preview
 * without the binding), the vote is kept on this device and the poll says so,
 * rather than failing.
 */

type Results = { counts: number[]; total: number; voted: number | null };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const remove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing kept, nothing to remove */
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the vote still counts on the server */
  }
};
function voter(): string {
  const known = read("poll-voter");
  if (known && /^[a-z0-9]{16,40}$/.test(known)) return known;
  const fresh = Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => (b % 36).toString(36)).join("");
  write("poll-voter", fresh);
  return fresh;
}
const localResults = (n: number, voted: number | null): Results => ({
  counts: Array.from({ length: n }, (_, i) => (i === voted ? 1 : 0)),
  total: voted === null ? 0 : 1,
  voted,
});

export default function ChoicePoll({ id, question, options }: { id: string; question: string; options: string[] }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [mode, setMode] = useState<"loading" | "live" | "local">("loading");
  const [busy, setBusy] = useState(false);
  const name = useId();
  const key = `poll:${id}`;

  useEffect(() => {
    let live = true;
    const mine = read(key);
    const stored = mine !== null && /^\d+$/.test(mine) ? Number(mine) : null;
    fetch(`/api/polls/${id}?options=${options.length}`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const body = (await r.json()) as Results;
        if (!live) return;
        const voted = body.voted ?? stored;
        setResults({ ...body, voted });
        setMode("live");
      })
      .catch(() => {
        if (!live) return;
        setMode("local");
        if (stored !== null) setResults(localResults(options.length, stored));
      });
    return () => {
      live = false;
    };
  }, [id, key, options.length]);

  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");

  /** POST to vote or move a vote, DELETE to take it back; local when the API is away. */
  const send = async (method: "POST" | "DELETE", option: number | null) => {
    if (busy) return;
    setBusy(true);
    setError("");
    if (option === null) remove(key);
    else write(key, String(option));
    try {
      if (mode !== "live") throw new TypeError("offline");
      const r = await fetch(`/api/polls/${id}`, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ option, options: options.length, voter: voter() }),
      });
      const body = (await r.json().catch(() => ({}))) as Partial<Results> & { error?: string };
      // Not set up here: keep the vote on this device. Anything else is the reader's to retry.
      if (r.status === 503 || r.status === 404) throw new TypeError("offline");
      if (!r.ok || !Array.isArray(body.counts)) {
        setError(body.error ?? "That didn’t go through. Try again.");
        return;
      }
      setResults({ counts: body.counts, total: body.total ?? 0, voted: body.voted ?? null });
      setChanging(false);
    } catch (e) {
      if (!(e instanceof TypeError)) throw e;
      setMode("local");
      setResults(option === null ? null : localResults(options.length, option));
      setChanging(false);
    } finally {
      setBusy(false);
    }
  };
  const vote = () => (choice === null ? undefined : void send("POST", choice));
  const retract = () => {
    setChoice(null);
    void send("DELETE", null);
  };

  const voted = results?.voted ?? null;
  const showResults = voted !== null && results && !changing;
  const total = results?.total ?? 0;
  const top = Math.max(0, ...(results?.counts ?? [0]));
  const titleId = `${name}-q`;

  return (
    <section className="poll" data-state={showResults ? "results" : "voting"} aria-labelledby={titleId} aria-busy={busy || undefined}>
      <header className="poll-head">
        <span className="poll-kicker">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 13V8M8 13V3M13 13v-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          Poll
        </span>
        <p className="poll-question" id={titleId}>
          {question}
        </p>
      </header>
      <div className="poll-options" role={showResults ? "list" : "radiogroup"} aria-labelledby={titleId}>
        {options.map((option, i) => {
          const count = results?.counts[i] ?? 0;
          const share = total ? Math.round((count / total) * 100) : 0;
          if (showResults) {
            const mine = voted === i;
            return (
              <div
                key={i}
                role="listitem"
                className="poll-result"
                data-mine={mine || undefined}
                data-leading={(count > 0 && count === top) || undefined}
                aria-label={`${option}: ${share}%, ${count} ${count === 1 ? "vote" : "votes"}${mine ? ", your vote" : ""}`}
              >
                <span className="poll-result-row" aria-hidden="true">
                  <span className="poll-label">
                    {option}
                    {mine ? (
                      <svg className="poll-mine" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="7" fill="currentColor" />
                        <path d="M5 8.2 7 10.2 11 6" fill="none" stroke="var(--on-fg)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="poll-share">
                    <SlidingNumber value={share} />%
                  </span>
                </span>
                <span className="poll-track" aria-hidden="true">
                  <span className="poll-fill" style={{ "--share": `${share}%` } as React.CSSProperties} />
                </span>
              </div>
            );
          }
          return (
            <label key={i} className="poll-choice" data-checked={choice === i || undefined}>
              <input type="radio" name={name} value={i} checked={choice === i} onChange={() => setChoice(i)} />
              <span className="poll-indicator" aria-hidden="true" />
              <span className="poll-label">{option}</span>
            </label>
          );
        })}
      </div>
      <footer className="poll-footer">
        {showResults ? (
          <>
            <p className="poll-note" role="status">
              {mode === "live"
                ? `${total.toLocaleString("en-US")} ${total === 1 ? "vote" : "votes"}`
                : "Saved on this device. Live results aren’t available right now."}
            </p>
            <button
              type="button"
              className="poll-link"
              onClick={() => {
                setChoice(voted);
                setChanging(true);
              }}
            >
              Change vote
            </button>
          </>
        ) : (
          <>
            <p className="poll-note" role={error ? "alert" : undefined} data-error={error ? "" : undefined}>
              {error || (mode === "loading" ? "Loading…" : changing ? "Pick another, or take your vote back." : choice === null ? "Pick one to vote." : "You can change it later.")}
            </p>
            <span className="poll-actions">
              {changing ? (
                <>
                  <button type="button" className="poll-link" disabled={busy} onClick={retract}>
                    Remove vote
                  </button>
                  <button type="button" className="poll-link" disabled={busy} onClick={() => setChanging(false)}>
                    Cancel
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="poll-submit"
                disabled={choice === null || busy || mode === "loading" || (changing && choice === voted)}
                onClick={vote}
              >
                {busy ? "Saving…" : changing ? "Update vote" : "Vote"}
              </button>
            </span>
          </>
        )}
      </footer>
    </section>
  );
}
