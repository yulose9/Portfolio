"use client";

import { ArrowSquareOut, CalendarBlank, CaretDown, Checks, FileText, MagnifyingGlass, PaperPlaneTilt, PushPin, Tag as TagIcon, TextAlignLeft, Trash, Tray } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { useEffect, useMemo, useRef, useState } from "react";

import { tagTint } from "../../components/writing/Tag";
import { toast } from "../../lib/toast";
import { api, ApiError, type PostSummary } from "./api";
import { relative, StatusDot, statusLabel } from "./bits";
import type { Panel } from "./Editor";
import { Fluent } from "./extensions/emoji";
import { usePulse } from "./live";
import BulkBar, { Checkbox, useBulk } from "./BulkBar";
import { keys, MenuSurface, MItem, MLabel } from "./menu";
import { useCommands } from "./registry";
import { PostRow } from "./PostActions";
import { TEMPLATES, type Template } from "./templates";

const CI = { size: 16, "aria-hidden": true } as const;

/*
 * The list: every post, pinned first, then newest edit. Filter by state or by
 * tag, search the titles here and the words inside with ⌘K. Rows, not cards:
 * this is a table of work to get back to, not a gallery. Deleted posts wait
 * in Trash until permanently deleted, restorable in one click.
 *
 * Check a row's box (or ⌘-click it) to select; Shift-click selects the run
 * between; ⌘A selects every row shown, Esc lets go. While anything is
 * selected, a click on a row checks it rather than opening it.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "published", label: "Published" },
  { id: "trash", label: "Trash" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

export default function PostList({ email, onOpen, onSearch }: { email: string; onOpen: (id: string, panel?: Panel) => void; onSearch: () => void }) {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const anchor = useRef<string | null>(null);
  const search = useRef<HTMLInputElement>(null);

  const [version, setVersion] = useState(0);

  // A different view is a different set of rows: start the selection over.
  const [view, setView] = useState(`${filter}|${tag}`);
  if (view !== `${filter}|${tag}`) {
    setView(`${filter}|${tag}`);
    setSelected(new Set());
  }
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
  usePulse(() => setVersion((v) => v + 1));

  const rowActions = {
    open: onOpen,
    refresh: () => setVersion((v) => v + 1),
    replace: (next: PostSummary | null, id: string) =>
      setPosts((list) => (list ? (next ? list.map((p) => (p.id === id ? next : p)) : list.filter((p) => p.id !== id)) : list)),
  };

  const create = async (template?: Template) => {
    if (creating) return;
    setCreating(true);
    try {
      const { post } = await api.create(template?.init ?? {});
      onOpen(post.id);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t create a post", description: error instanceof ApiError ? error.message : undefined });
      setCreating(false);
    }
  };

  const live = useMemo(() => (posts ?? []).filter((p) => !p.trashedAt), [posts]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, draft: 0, scheduled: 0, published: 0, trash: 0 };
    for (const p of posts ?? []) {
      if (p.trashedAt) c.trash++;
      else {
        c.all++;
        c[p.status]++;
      }
    }
    return c;
  }, [posts]);

  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of live) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [live]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = filter === "trash" ? (posts ?? []).filter((p) => p.trashedAt) : live;
    return pool
      .filter(
        (p) =>
          (filter === "all" || filter === "trash" || p.status === filter) &&
          (!tag || p.tags.includes(tag)) &&
          (!q || p.title.toLowerCase().includes(q) || p.dek.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [posts, live, filter, tag, query]);

  // N for a new post, / to filter: the two things this screen is for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element | null)?.closest?.("input, textarea, [contenteditable]");
      if (typing) return;
      if (e.key === "Escape" && selected.size && !document.querySelector("[data-open][role=dialog], .menu-popup")) {
        setSelected(new Set());
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && shown.length) {
        e.preventDefault();
        setSelected(new Set(shown.map((p) => p.id)));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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

  const picked = shown.filter((p) => selected.has(p.id));
  const selecting = picked.length > 0;

  /** Toggle one row; with Shift, everything between it and the last one toggled. */
  const toggle = (id: string, range: boolean) => {
    // Read the anchor now: the updater runs later, after it has moved on.
    const start = anchor.current;
    anchor.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = shown.map((p) => p.id);
      const from = start ? ids.indexOf(start) : -1;
      if (range && from !== -1) {
        const to = ids.indexOf(id);
        const on = prev.has(start as string);
        for (const x of ids.slice(Math.min(from, to), Math.max(from, to) + 1)) {
          if (on) next.add(x);
          else next.delete(x);
        }
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = shown.length > 0 && picked.length === shown.length;

  const bulk = useBulk({
    selected: picked,
    inTrash: filter === "trash",
    onClear: () => setSelected(new Set()),
    onDone: () => setVersion((v) => v + 1),
    onOpen: (id) => onOpen(id),
  });

  useCommands(() => [
    ...bulk.commands,
    ...FILTERS.map((f) => ({
      id: `filter:${f.id}`,
      group: "Posts" as const,
      title: f.id === "all" ? "Show all posts" : f.id === "trash" ? "Open Trash" : `Show ${f.label.toLowerCase()}`,
      icon: f.id === "trash" ? <Trash {...CI} /> : f.id === "published" ? <PaperPlaneTilt {...CI} /> : f.id === "scheduled" ? <CalendarBlank {...CI} /> : f.id === "draft" ? <FileText {...CI} /> : <Tray {...CI} />,
      keywords: ["filter", "view", f.label],
      run: () => setFilter(f.id),
    })),
    ...tags.map(([t]) => ({
      id: `tag:${t}`,
      group: "Posts" as const,
      title: `Tagged “${t}”`,
      icon: <TagIcon {...CI} />,
      keywords: ["tag", "filter", t],
      checked: tag === t,
      run: () => setTag((cur) => (cur === t ? null : t)),
    })),
    { id: "select-all", group: "Posts", title: "Select all shown", keys: "⌘A", icon: <Checks {...CI} />, keywords: ["bulk", "multiple", "check"], run: () => setSelected(new Set(shown.map((p) => p.id))) },
    { id: "filter-focus", group: "Posts", title: "Filter by title", keys: "/", icon: <MagnifyingGlass {...CI} />, keywords: ["search"], run: () => window.setTimeout(() => search.current?.focus(), 50) },
  ]);

  return (
    <main className="admin-shell" data-selecting={selecting || undefined}>
      <header className="admin-list-header">
        <div>
          <p className="admin-eyebrow">nazarene.dev · {email}</p>
          <h1 className="admin-list-title">Writing</h1>
        </div>
        <div className="admin-list-actions">
        <a className="admin-button admin-button-quiet" href="/writing" target="_blank" rel="noopener" title="Open nazarene.dev/writing in a new tab">
          <ArrowSquareOut size={14} aria-hidden="true" />
          <span className="admin-hide-sm">View on site</span>
          <span className="admin-show-sm">Site</span>
        </a>
        <div className="split-button">
          <button type="button" className="admin-button admin-button-primary split-main" data-keycap onClick={() => void create()} disabled={creating}>
            New post
            <kbd className="admin-kbd">N</kbd>
          </button>
          <Menu.Root modal={false}>
            <Menu.Trigger className="admin-button admin-button-primary split-more" aria-label="New from a template" disabled={creating}>
              <CaretDown size={12} weight="bold" />
            </Menu.Trigger>
            <MenuSurface align="end">
              <MLabel>Start from</MLabel>
              {TEMPLATES.map((t) => (
                <MItem key={t.id} icon={<Fluent emoji={t.emoji} size={16} />} onSelect={() => void create(t)}>
                  <span className="template-item">
                    <span>{t.title}</span>
                    <span className="template-hint">{t.hint}</span>
                  </span>
                </MItem>
              ))}
            </MenuSurface>
          </Menu.Root>
        </div>
        </div>
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
              data-trash={f.id === "trash" || undefined}
              onClick={() => setFilter(f.id)}
            >
              {f.id === "trash" ? <Trash size={13} aria-hidden="true" /> : null}
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
          <button type="button" className="admin-button" onClick={onSearch} title="Search every post, and run actions">
            <TextAlignLeft size={14} aria-hidden="true" />
            <span className="admin-hide-sm">Search</span>
            <kbd className="admin-kbd">{keys("⌘K")}</kbd>
          </button>
        </div>
      </div>

      {tags.length && filter !== "trash" ? (
        <div className="tag-filter" role="group" aria-label="Filter by tag">
          {tags.map(([t, n]) => (
            <button key={t} type="button" className="tag" data-tint={tagTint(t)} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
              <span className="tag-count">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {posts === null ? (
        <ul className="admin-rows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="admin-row admin-row-skeleton" />
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <div className="admin-empty">
          {filter === "trash" ? (
            <p className="admin-empty-text">Trash is empty. Posts you move to Trash stay here until you delete them permanently.</p>
          ) : live.length === 0 ? (
            <>
              <p className="admin-empty-title">Nothing written yet</p>
              <p className="admin-empty-text">Drafts stay private until you publish them. Press N to start one.</p>
            </>
          ) : (
            <p className="admin-empty-text">No posts match.</p>
          )}
        </div>
      ) : (
        <>
        <div className="rows-head">
          <Checkbox
            checked={allChecked}
            mixed={selecting && !allChecked}
            label={allChecked ? "Select none" : "Select all"}
            onToggle={() => setSelected(allChecked ? new Set() : new Set(shown.map((p) => p.id)))}
          />
          <span className="rows-head-label">{selecting ? `${picked.length} of ${shown.length}` : `${shown.length} ${shown.length === 1 ? "post" : "posts"}`}</span>
        </div>
        <ul className="admin-rows">
          {shown.map((p) => (
            <li key={p.id} data-selected={selected.has(p.id) || undefined}>
              <Checkbox checked={selected.has(p.id)} label={`Select “${p.title.trim() || "Untitled"}”`} onToggle={(e) => toggle(p.id, e.shiftKey)} />
              <PostRow post={p} actions={rowActions} onSelect={() => toggle(p.id, false)} selection={picked.length > 1 && selected.has(p.id) ? bulk.commands : undefined}>
                <button
                  type="button"
                  className="admin-row"
                  aria-pressed={selecting ? selected.has(p.id) : undefined}
                  onClick={(e) => {
                    if (selecting || e.metaKey || e.ctrlKey || e.shiftKey) {
                      e.preventDefault();
                      toggle(p.id, e.shiftKey);
                    } else onOpen(p.id);
                  }}
                  data-trashed={p.trashedAt ? "" : undefined}
                >
                  <span className="admin-row-main">
                    <span className="admin-row-title">
                      {p.pinned ? <PushPin size={14} weight="fill" className="row-pin" aria-label="Pinned" /> : null}
                      {p.icon ? <Fluent emoji={p.icon} size={18} /> : null}
                      {p.title.trim() || <em>Untitled</em>}
                    </span>
                    {p.dek ? <span className="admin-row-dek">{p.dek}</span> : null}
                  </span>
                  <span className="admin-row-meta">
                    <StatusDot status={p.status} dirty={p.dirty} />
                    <span>{p.trashedAt ? `Trashed ${relative(p.trashedAt)}` : statusLabel(p)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.status === "scheduled" && p.publishAt ? relative(p.publishAt) : `edited ${relative(p.updatedAt)}`}</span>
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag tag-sm" data-tint={tagTint(t)}>
                        {t}
                      </span>
                    ))}
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
        </>
      )}

      <BulkBar bulk={bulk} total={shown.length} onSelectAll={() => setSelected(new Set(shown.map((p) => p.id)))} onClear={() => setSelected(new Set())} />
    </main>
  );
}
