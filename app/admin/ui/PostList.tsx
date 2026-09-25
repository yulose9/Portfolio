"use client";

import { MagnifyingGlass, Plus, TextAlignLeft } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "../../lib/toast";
import { api, ApiError, type PostSummary } from "./api";
import { relative, StatusDot, statusLabel } from "./bits";
import type { Panel } from "./Editor";
import { Fluent } from "./extensions/emoji";
import { usePulse } from "./live";
import { PostRow } from "./PostActions";

/*
 * The list: every post, newest edit first, filterable by state. Rows, not
 * cards — the Claude blog's list, Apple's newsroom rows — because this is a
 * table of work to get back to, not a gallery.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

export default function PostList({ email, onOpen, onSearch }: { email: string; onOpen: (id: string, panel?: Panel) => void; onSearch: () => void }) {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  const [version, setVersion] = useState(0);
  useEffect(() => {
    api
      .list()
      .then(({ posts }) => setPosts(posts))
      .catch((error: unknown) => {
        setPosts([]);
        toast.add({ type: "error", title: "Couldn’t load posts", description: error instanceof ApiError ? error.message : undefined });
      });
  }, [version]);

  // Another device changed something: fetch the list again.
  usePulse(useCallback(() => setVersion((v) => v + 1), []));

  const rowActions = {
    open: onOpen,
    refresh: () => setVersion((v) => v + 1),
    replace: (next: PostSummary | null, id: string) =>
      setPosts((list) => (list ? (next ? list.map((p) => (p.id === id ? next : p)) : list.filter((p) => p.id !== id)) : list)),
  };

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { post } = await api.create();
      onOpen(post.id);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t start a post", description: error instanceof ApiError ? error.message : undefined });
      setCreating(false);
    }
  };

  // N for a new post, / to search: the two things this screen is for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element | null)?.closest?.("input, textarea, [contenteditable]");
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        void create();
      } else if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, draft: 0, scheduled: 0, published: 0 };
    for (const p of posts ?? []) {
      c.all++;
      c[p.status]++;
    }
    return c;
  }, [posts]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (posts ?? []).filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (!q || p.title.toLowerCase().includes(q) || p.dek.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [posts, filter, query]);

  return (
    <main className="admin-shell">
      <header className="admin-list-header">
        <div>
          <p className="admin-eyebrow">nazarene.dev · {email}</p>
          <h1 className="admin-list-title">Writing</h1>
        </div>
        <button type="button" className="admin-button admin-button-primary" data-keycap onClick={create} disabled={creating}>
          <Plus size={14} weight="bold" aria-hidden="true" />
          New post
          <kbd className="admin-kbd">N</kbd>
        </button>
      </header>

      <div className="admin-toolbar">
        <div className="admin-segments" role="tablist" aria-label="Filter posts">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className="admin-segment"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="admin-segment-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="admin-toolbar-end">
          <label className="admin-search">
            <MagnifyingGlass size={14} aria-hidden="true" />
            <input ref={search} type="search" placeholder="Filter" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter posts by title" />
            <kbd className="admin-kbd">/</kbd>
          </label>
          <button type="button" className="admin-button" onClick={onSearch} title="Search the words inside every post">
            <TextAlignLeft size={14} aria-hidden="true" />
            <span className="admin-hide-sm">Search text</span>
            <kbd className="admin-kbd">⌘K</kbd>
          </button>
        </div>
      </div>

      {posts === null ? (
        <ul className="admin-rows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="admin-row admin-row-skeleton" />
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <div className="admin-empty">
          {posts.length === 0 ? (
            <>
              <p className="admin-empty-title">Nothing written yet</p>
              <p className="admin-empty-text">Drafts stay private until you publish them. Press N to start one.</p>
            </>
          ) : (
            <p className="admin-empty-text">No posts match.</p>
          )}
        </div>
      ) : (
        <ul className="admin-rows">
          {shown.map((p) => (
            <li key={p.id}>
              <PostRow post={p} actions={rowActions}>
              <button type="button" className="admin-row" onClick={() => onOpen(p.id)}>
                <span className="admin-row-main">
                  <span className="admin-row-title">
                    {p.icon ? <Fluent emoji={p.icon} size={18} /> : null}
                    {p.title.trim() || <em>Untitled</em>}
                  </span>
                  {p.dek ? <span className="admin-row-dek">{p.dek}</span> : null}
                </span>
                <span className="admin-row-meta">
                  <StatusDot status={p.status} dirty={p.dirty} />
                  <span>{statusLabel(p)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.status === "scheduled" && p.publishAt ? relative(p.publishAt) : `edited ${relative(p.updatedAt)}`}</span>
                </span>
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="admin-row-thumb" src={p.cover} alt="" loading="lazy" />
                ) : null}
              </button>
              </PostRow>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
