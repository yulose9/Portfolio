"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type PostSummary } from "./api";
import { beginPendingWork } from "./session";
import {
  reviewInput,
  reviewInstant,
  reviewPreset,
  reviewQueue,
} from "../../../cms/review-queue";
import type { Editorial } from "../../../cms/editorial";
import { todayDate } from "../../../cms/mentions";
import { DayTimeFields } from "./DayTimeFields";

const format = (iso: string) =>
  new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

// Read only from event handlers; the React compiler can't see that through
// the date picker's onConfirm, so the clock read lives out here.
const currentTime = () => Date.now();

export default function ReviewQueue({
  posts,
  onChange,
  onOpen,
  onReload,
}: {
  posts: PostSummary[];
  onChange: (id: string, patch: Partial<PostSummary>) => void;
  onOpen: (id: string) => void;
  onReload: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"due" | "later">("due");
  const [now, setNow] = useState(Date.now);
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const timing = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{
    post: PostSummary;
    editorial: Editorial;
  } | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const queues = reviewQueue(posts, now);
  const save = async (
    post: PostSummary,
    editorial: Editorial,
    restoring = false,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const done = beginPendingWork();
    try {
      const { post: saved } = await api.save(post.id, {
        editorial,
        base: post.updatedAt,
      });
      const next = {
        ...post,
        editorial: saved.editorial,
        updatedAt: saved.updatedAt,
        dirty: saved.dirty,
      };
      onChange(post.id, next);
      setUndo(restoring ? null : { post: next, editorial: post.editorial! });
      setNotice(
        restoring
          ? "Review date restored."
          : editorial.reviewAt
            ? "Review moved to Later."
            : "Review date cleared. Editorial stage unchanged.",
      );
      setEditing(null);
      setNow(currentTime());
      timing.current
        ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
        ?.focus();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "This page changed elsewhere. Reload the queue before trying again."
          : e instanceof Error
            ? e.message
            : "Could not save the review date.",
      );
    } finally {
      done();
      lock.current = false;
      setBusy(false);
    }
  };
  // `value` is Manila wall time, "YYYY-MM-DDTHH:MM".
  const schedule = (post: PostSummary, value: string) => {
    const instant = reviewInstant(value);
    if (!instant || Date.parse(instant) <= currentTime()) {
      setError("Choose a future review date and time.");
      return;
    }
    void save(post, { ...post.editorial!, reviewAt: instant });
  };
  return (
    <section
      className="review-queue"
      aria-label="Review queue"
      aria-busy={busy}
    >
      <header>
        <h3>Review queue</h3>
        <p className="research-help">
          Private reminders for your writing. Dates follow Manila time
          (UTC+08:00).
        </p>
      </header>
      <div
        ref={timing}
        className="review-queue-tabs"
        role="group"
        aria-label="Review timing"
      >
        {(["due", "later"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setEditing(null);
            }}
          >
            {value === "due" ? "Due" : "Later"}{" "}
            <span>{queues[value].length}</span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="research-error">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setUndo(null);
              void onReload().then(
                () => setError(""),
                () => setError("Could not reload. Try again."),
              );
            }}
          >
            Reload queue
          </button>
        </p>
      )}
      {notice && (
        <div className="review-queue-notice" role="status">
          {notice}{" "}
          {undo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(undo.post, undo.editorial, true)}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {!queues[tab].length && (
        <p className="research-empty">
          {tab === "due"
            ? "Nothing due. Set a review date in a page’s Details to bring it here when it needs attention."
            : "No upcoming reviews. Move a due review here or set a date in a page’s Details."}
        </p>
      )}
      {queues[tab].map((post) => (
        <article className="review-queue-row" key={post.id}>
          <div className="review-queue-main">
            <button
              type="button"
              className="review-queue-title"
              disabled={busy}
              onClick={() => onOpen(post.id)}
            >
              {post.icon} {post.title || "Untitled"}
            </button>
            <time
              dateTime={post.editorial!.reviewAt!}
              title={new Date(post.editorial!.reviewAt!).toUTCString()}
            >
              {format(post.editorial!.reviewAt!)}
            </time>
          </div>
          <div className="research-actions">
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              aria-expanded={editing === post.id}
              onClick={() => {
                setEditing(editing === post.id ? null : post.id);
                setDate(reviewInput(reviewPreset(1)));
              }}
            >
              Reschedule
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() =>
                void save(post, { ...post.editorial!, reviewAt: null })
              }
            >
              Reviewed
            </button>
          </div>
          {editing === post.id && (
            <form
              className="review-queue-schedule research-form"
              onSubmit={(e) => {
                e.preventDefault();
                schedule(post, date);
              }}
            >
              <div className="research-actions">
                {[
                  [1, "Tomorrow"],
                  [7, "In a week"],
                ].map(([days, label]) => (
                  <button
                    type="button"
                    className="admin-button"
                    key={days}
                    disabled={busy}
                    onClick={() =>
                      void save(post, {
                        ...post.editorial!,
                        reviewAt: reviewPreset(Number(days)),
                      })
                    }
                  >
                    {label} · 9 am
                  </button>
                ))}
              </div>
              <div className="review-queue-custom">
                <span className="field-label">Custom date · Manila</span>
                <DayTimeFields
                  value={{ date: date.slice(0, 10), time: date.slice(11, 16) }}
                  onChange={(value) => setDate(`${value.date}T${value.time ?? "09:00"}`)}
                  onConfirm={(value) => schedule(post, `${value.date}T${value.time ?? "09:00"}`)}
                  today={todayDate()}
                  optionalTime={false}
                  zoneNote="Manila time (UTC+8)"
                />
              </div>
              <div className="research-actions">
                <button
                  className="admin-button admin-button-primary"
                  disabled={busy}
                >
                  Set review date
                </button>
                <button
                  type="button"
                  className="admin-button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
