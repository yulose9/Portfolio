"use client";
import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { api, type PostSummary } from "./api";
import {
  inCollection,
  type ResearchItem,
  type CollectionRules,
} from "../../../cms/research";
import type { Panel } from "./Editor";
import { todayDate } from "../../../cms/mentions";
import { useResearchForm } from "./use-research-form";

/** Saved metadata views; publication remains an explicit action in the editor. */
export default function ResearchWorkspace({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string, panel?: Panel) => void;
}) {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [view, setView] = useState("board");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useResearchForm<ResearchItem>(
    "research:collection-form",
  );
  const [month, setMonth] = useState(() => todayDate().slice(0, 7));
  const [captureForm, setCaptureForm] = useResearchForm<{
    id: string;
    title: string;
    url: string;
    body: string;
  }>("research:capture-form");
  const [captureId, setCaptureId] = useState(() => crypto.randomUUID());
  const capture = captureForm ?? {
    id: captureId,
    title: "",
    url: "",
    body: "",
  };
  const setCapture = (next: typeof capture) => {
    setCaptureForm(next.title || next.body || next.url ? next : null);
    if (!next.title && !next.body && !next.url) setCaptureId(next.id);
  };
  const load = async () => {
    const [a, b] = await Promise.all([api.research(), api.list()]);
    setError("");
    setItems(a.items);
    setPosts(b.posts.filter((p) => !p.trashedAt));
  };
  useEffect(() => {
    let alive = true;
    if (open)
      void Promise.all([api.research(), api.list()])
        .then(([a, b]) => {
          if (alive) {
            setError("");
            setItems(a.items);
            setPosts(b.posts.filter((p) => !p.trashedAt));
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [open]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  const navigate = (id: string, panel?: Panel) => {
    onClose();
    onOpen(id, panel);
  };
  const collections = items.filter((i) => i.kind === "collection");
  const collection = collections.find((i) => i.id === view);
  const rows = collection
    ? posts
        .filter((p) => inCollection(p, collection.rules ?? {}))
        .sort((a, b) =>
          collection.rules?.sort === "title"
            ? a.title.localeCompare(b.title)
            : collection.rules?.sort === "scheduled"
              ? (a.publishAt ?? "9999").localeCompare(b.publishAt ?? "9999")
              : b.updatedAt.localeCompare(a.updatedAt),
        )
    : posts;
  const postRow = (p: PostSummary) => (
    <button
      type="button"
      className="research-row"
      key={p.id}
      onClick={() => navigate(p.id)}
    >
      <strong>
        {p.icon} {p.title || "Untitled"}
      </strong>
      <span>
        {p.status}
        {p.dirty ? " · Unpublished edits" : ""}
        {p.publishAt ? ` · ${new Date(p.publishAt).toLocaleString()}` : ""}
      </span>
    </button>
  );
  const patchRules = (patch: Partial<CollectionRules>) => {
    if (editing)
      setEditing({ ...editing, rules: { ...editing.rules, ...patch } });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Writing workspace"
      description="Organize drafts, collect sources and plan publication."
    >
      <div className="research-panel">
        <label className="research-field">
          View
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="board">Editorial board</option>
            <option value="calendar">Publication calendar</option>
            <option value="inbox">Capture inbox</option>
            <option value="templates">Templates</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p role="alert" className="research-error">
            {error}
          </p>
        ) : null}
        <div className="research-actions">
          <button
            type="button"
            className="admin-button"
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                kind: "collection",
                title: "",
                body: "",
                rules: { sort: "updated" },
                createdAt: "",
                updatedAt: "",
              })
            }
          >
            New collection
          </button>
          {collection ? (
            <button
              type="button"
              className="admin-button"
              onClick={() => setEditing(collection)}
            >
              Edit collection
            </button>
          ) : null}
        </div>
        {editing ? (
          <form
            className="research-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const { item } = await api.saveResearch(editing);
                await load();
                setView(item.id);
                setEditing(null);
              });
            }}
          >
            <h3>Collection rules</h3>
            <label>
              Name
              <input
                required
                maxLength={200}
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            <label>
              Title or description contains
              <input
                value={editing.rules?.query ?? ""}
                onChange={(e) => patchRules({ query: e.target.value })}
              />
            </label>
            <label>
              Tag
              <select
                value={editing.rules?.tag ?? ""}
                onChange={(e) => patchRules({ tag: e.target.value })}
              >
                <option value="">Any tag</option>
                {[...new Set(posts.flatMap((p) => p.tags))].sort().map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={editing.rules?.status ?? ""}
                onChange={(e) =>
                  patchRules({
                    status: e.target.value as CollectionRules["status"],
                  })
                }
              >
                <option value="">Any status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label>
              Sort
              <select
                value={editing.rules?.sort ?? "updated"}
                onChange={(e) =>
                  patchRules({
                    sort: e.target.value as CollectionRules["sort"],
                  })
                }
              >
                <option value="updated">Recently edited</option>
                <option value="title">Title</option>
                <option value="scheduled">Scheduled date</option>
              </select>
            </label>
            <label className="research-check">
              <input
                type="checkbox"
                checked={!!editing.rules?.pinned}
                onChange={(e) => patchRules({ pinned: e.target.checked })}
              />
              Pinned pages only
            </label>
            <details>
              <summary>Always include specific pages</summary>
              {posts.map((p) => (
                <label className="research-check" key={p.id}>
                  <input
                    type="checkbox"
                    checked={editing.rules?.include?.includes(p.id) ?? false}
                    onChange={(e) =>
                      patchRules({
                        include: e.target.checked
                          ? [...(editing.rules?.include ?? []), p.id]
                          : (editing.rules?.include ?? []).filter(
                              (id) => id !== p.id,
                            ),
                      })
                    }
                  />
                  {p.title || "Untitled"}
                </label>
              ))}
            </details>
            <div className="research-actions">
              <button
                className="admin-button admin-button-primary"
                disabled={busy}
              >
                Save collection
              </button>
              <button
                className="admin-button"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {view === "board" ? (
          <div className="research-board">
            {(["draft", "scheduled", "published"] as const).map((status) => (
              <section key={status}>
                <h3>
                  {status === "draft"
                    ? "Drafts"
                    : status === "scheduled"
                      ? "Scheduled"
                      : "Published"}{" "}
                  <span>{posts.filter((p) => p.status === status).length}</span>
                </h3>
                {posts.filter((p) => p.status === status).map(postRow)}
                {!posts.some((p) => p.status === status) ? (
                  <p className="research-help">No {status} pages.</p>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}
        {view === "calendar" ? (
          <>
            <label className="research-field">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  if (/^\d{4}-\d{2}$/.test(e.target.value))
                    setMonth(e.target.value);
                }}
              />
            </label>
            <p className="research-help">
              Dates follow Manila time. Open a page and use Publish to change
              its schedule.
            </p>
            <div className="research-calendar">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
              {Array.from(
                { length: new Date(`${month}-01T00:00:00Z`).getUTCDay() },
                (_, i) => (
                  <span key={`pad:${i}`} aria-hidden />
                ),
              )}
              {Array.from(
                {
                  length: new Date(
                    Number(month.slice(0, 4)),
                    Number(month.slice(5, 7)),
                    0,
                  ).getDate(),
                },
                (_, i) => {
                  const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                  const scheduled = posts.filter((p) => {
                    const at = p.publishAt ?? p.publishedAt;
                    return at && todayDate(Date.parse(at)) === date;
                  });
                  return (
                    <section
                      key={date}
                      data-today={date === todayDate() || undefined}
                    >
                      <time dateTime={date}>{i + 1}</time>
                      {scheduled.map(postRow)}
                    </section>
                  );
                },
              )}
            </div>
            <h3>Unscheduled drafts</h3>
            {posts.filter((p) => p.status === "draft").map(postRow)}
          </>
        ) : null}
        {view === "inbox" ? (
          <>
            <form
              className="research-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api.saveResearch({ ...capture, kind: "capture" });
                  setCapture({
                    id: crypto.randomUUID(),
                    title: "",
                    url: "",
                    body: "",
                  });
                  await load();
                });
              }}
            >
              <h3>Capture a source</h3>
              <label>
                Title
                <input
                  required
                  maxLength={200}
                  value={capture.title}
                  onChange={(e) =>
                    setCapture({ ...capture, title: e.target.value })
                  }
                />
              </label>
              <label>
                Source address
                <input
                  type="url"
                  value={capture.url}
                  onChange={(e) =>
                    setCapture({ ...capture, url: e.target.value })
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={4}
                  value={capture.body}
                  onChange={(e) =>
                    setCapture({ ...capture, body: e.target.value })
                  }
                />
              </label>
              <button
                className="admin-button admin-button-primary"
                disabled={busy}
              >
                Save to inbox
              </button>
            </form>
            {items
              .filter((i) => i.kind === "capture")
              .map((i) => (
                <article className="research-item" key={i.id}>
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                  {i.url ? (
                    <a href={i.url} target="_blank" rel="noopener noreferrer">
                      Open source
                    </a>
                  ) : null}
                </article>
              ))}
          </>
        ) : null}
        {view === "templates" ? (
          <>
            <p className="research-help">
              Save a page as a template from its Research panel. A new draft
              gets its own block identities.
            </p>
            {items
              .filter((i) => i.kind === "template")
              .map((i) => (
                <article className="research-item" key={i.id}>
                  <strong>{i.title}</strong>
                  <p>{i.body.slice(0, 180)}</p>
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const { post } = await api.create({
                          title: i.title,
                          body: i.body,
                        });
                        navigate(post.id);
                      })
                    }
                  >
                    New draft
                  </button>
                </article>
              ))}
          </>
        ) : null}
        {collection ? (
          <section>
            <h3>
              {collection.title} <span>{rows.length}</span>
            </h3>
            {rows.map(postRow)}
            {!rows.length ? (
              <p className="research-help">No pages match these rules yet.</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}
