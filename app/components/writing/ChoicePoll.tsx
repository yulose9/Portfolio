"use client";

import { useEffect, useId, useState } from "react";

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

  const vote = async () => {
    if (choice === null || busy) return;
    setBusy(true);
    write(key, String(choice));
    try {
      if (mode !== "live") throw new Error("offline");
      const r = await fetch(`/api/polls/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ option: choice, options: options.length, voter: voter() }),
      });
      if (!r.ok && r.status !== 409) throw new Error(String(r.status));
      setResults((await r.json()) as Results);
    } catch {
      setMode("local");
      setResults(localResults(options.length, choice));
    } finally {
      setBusy(false);
    }
  };

  const voted = results?.voted ?? null;
  const showResults = voted !== null && results;
  const total = results?.total ?? 0;

  return (
    <fieldset className="poll" data-state={showResults ? "results" : "voting"} aria-busy={busy || undefined}>
      <legend className="poll-question">{question}</legend>
      <div className="poll-options" role={showResults ? "list" : "radiogroup"} aria-label={showResults ? "Results" : question}>
        {options.map((option, i) => {
          const count = results?.counts[i] ?? 0;
          const share = total ? Math.round((count / total) * 100) : 0;
          if (showResults) {
            return (
              <div key={i} role="listitem" className="poll-option" data-mine={voted === i || undefined}
                aria-label={`${option}: ${share}%${voted === i ? ", your vote" : ""}`}>
                <span className="poll-bar" style={{ "--share": `${share}%` } as React.CSSProperties} aria-hidden="true" />
                <span className="poll-label">
                  {option}
                  {voted === i ? <span className="poll-you">You voted</span> : null}
                </span>
                <span className="poll-share" aria-hidden="true">{share}%</span>
              </div>
            );
          }
          return (
            <label key={i} className="poll-option poll-choice" data-checked={choice === i || undefined}>
              <input type="radio" name={name} value={i} checked={choice === i} onChange={() => setChoice(i)} />
              <span className="poll-indicator" aria-hidden="true" />
              <span className="poll-label">{option}</span>
            </label>
          );
        })}
      </div>
      <div className="poll-footer">
        {showResults ? (
          <p className="poll-note" role="status">
            {mode === "live" ? `${total.toLocaleString("en-US")} ${total === 1 ? "vote" : "votes"}` : "Saved on this device. Live results aren’t available right now."}
          </p>
        ) : (
          <>
            <button type="button" className="poll-submit" disabled={choice === null || busy || mode === "loading"} onClick={() => void vote()}>
              {busy ? "Voting…" : "Vote"}
            </button>
            <p className="poll-note">One vote per reader.</p>
          </>
        )}
      </div>
    </fieldset>
  );
}
