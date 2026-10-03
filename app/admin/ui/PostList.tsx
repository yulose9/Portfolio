"use client";

import { SoundToggle } from "../../components/ui/sound";
import { ThemeToggle } from "../../components/ui/theme";
import { Tabs, TabsList, TabsTrigger } from "../../components/kit/tabs";
import { SlidingNumber } from "../../components/kit/inputs/counter";
import { MultiSelect, type MultiSelectMatch } from "../../components/kit/inputs/multi-select";
import PageTree from "./PageTree";
import MediaLibrary from "./MediaLibrary";

import {
  ArrowSquareOut,
  CalendarBlank,
  CaretDown,
  Checks,
  FileText,
  MagnifyingGlass,
  PaperPlaneTilt,
  PushPin,
  Tag as TagIcon,
  Trash,
  Tray,
  Books,
  ImageSquare,
  SidebarSimple,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import UpdatedAt from "../../components/UpdatedAt";
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
import ResearchWorkspace from "./ResearchWorkspace";
import Sheet from "./Sheet";

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

/*
 * Filtering is frequent, so its motion is quick: rows that still match slide
 * to their new place, rows that stop matching fade out fast, and new ones come
 * in on a light stagger. Long lists skip it; so does reduced motion.
 */
const ROW_MOTION_LIMIT = 60;
const ROW_EASE = [0.23, 1, 0.32, 1] as const;
const ROW_SLIDE = { type: "spring", duration: 0.3, bounce: 0 } as const;
const ROW_EXIT = { opacity: 0, y: -4, transition: { duration: 0.12, ease: ROW_EASE } };
const ROW_STAGGER = 0.03;
const ROW_STAGGER_CAP = 5;

export default function PostList({
  email,
  onOpen,
  onSearch,
  onTags,
}: {
  email: string;
  onOpen: (id: string, panel?: Panel) => void;
  onSearch: () => void;
  onTags: () => void;
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  // A failed load is not an empty list: it gets its own state and a retry.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  // Tags to filter by, and whether a post needs any of them or all of them.
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagMatch, setTagMatch] = useState<MultiSelectMatch>("any");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const anchor = useRef<string | null>(null);
  const search = useRef<HTMLInputElement>(null);

  const [version, setVersion] = useState(0);

  // A different view is a different set of rows: start the selection over.
  const viewKey = `${filter}|${tagFilter.join("\u0000")}|${tagMatch}`;
  const [view, setView] = useState(viewKey);
  if (view !== viewKey) {
    setView(viewKey);
    setSelected(new Set());
  }
  useEffect(() => {
    api
      .list()
      .then(({ posts }) => {
        setPosts(posts);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setPosts((current) => current ?? []);
        setLoadError(error instanceof ApiError ? error.message : "Check your connection and try again.");
        toast.add({
          type: "error",
          title: "Couldn’t load posts",
          description: error instanceof ApiError ? error.message : undefined,
        });
      });
  }, [version]);

  // Another device changed something: fetch the list again.
  usePulse(() => setVersion((v) => v + 1));

  const rowActions = {
    open: onOpen,
    refresh: () => setVersion((v) => v + 1),
    replace: (next: PostSummary | null, id: string) =>
      setPosts((list) =>
        list
          ? next
            ? list.map((p) => (p.id === id ? next : p))
            : list.filter((p) => p.id !== id)
          : list,
      ),
  };

  const create = async (template?: Template) => {
    if (creating) return;
    setCreating(true);
    try {
      const { post } = await api.create(template?.init ?? {});
      onOpen(post.id);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn’t create a post",
        description: error instanceof ApiError ? error.message : undefined,
      });
      setCreating(false);
    }
  };

  const live = useMemo(
    () => (posts ?? []).filter((p) => !p.trashedAt),
    [posts],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: 0,
      draft: 0,
      scheduled: 0,
      published: 0,
      trash: 0,
    };
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

  // The multi-select's options: every tag in use with its post count, plus any
  // picked tag no live post carries any more, so it can still be unpicked.
  const tagOptions = useMemo(() => {
    const options = tags.map(([value, count]) => ({ value, count }));
    for (const t of tagFilter) if (!tags.some(([x]) => x === t)) options.push({ value: t, count: 0 });
    return options;
  }, [tags, tagFilter]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool =
      filter === "trash" ? (posts ?? []).filter((p) => p.trashedAt) : live;
    return pool
      .filter(
        (p) =>
          (filter === "all" || filter === "trash" || p.status === filter) &&
          // Trash has no tag filter: its control is hidden there.
          (filter === "trash" ||
            !tagFilter.length ||
            (tagMatch === "all"
              ? tagFilter.every((t) => p.tags.includes(t))
              : tagFilter.some((t) => p.tags.includes(t)))) &&
          (!q ||
            p.title.toLowerCase().includes(q) ||
            p.dek.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          (a.updatedAt < b.updatedAt ? 1 : -1),
      );
  }, [posts, live, filter, tagFilter, tagMatch, query]);

  // Which rows just came into view, in order, so they can stagger in. Worked
  // out during render, the same way as the view key above.
  const still = useReducedMotion();
  const shownKey = shown.map((p) => p.id).join("\u0000");
  const [rowsKey, setRowsKey] = useState(shownKey);
  const [arrivals, setArrivals] = useState<ReadonlyMap<string, number>>(() => new Map());
  if (rowsKey !== shownKey) {
    const before = new Set(rowsKey.split("\u0000"));
    const next = new Map<string, number>();
    for (const p of shown) if (!before.has(p.id)) next.set(p.id, next.size);
    setRowsKey(shownKey);
    setArrivals(next);
  }
  const animateRows = !still && shown.length < ROW_MOTION_LIMIT;

  // The first paint keeps its short CSS cascade (admin.css); once that has
  // played, rows coming and going are animated here instead.
  const loaded = posts !== null;
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    if (!loaded || !intro) return;
    const timer = window.setTimeout(() => setIntro(false), 600);
    return () => window.clearTimeout(timer);
  }, [loaded, intro]);

  // N for a new post, / to filter: the two things this screen is for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element | null)?.closest?.(
        "input, textarea, [contenteditable]",
      );
      if (typing) return;
      // Anything layered over the list (a sheet, the palette, a menu, a
      // listbox) owns the keyboard: N must not make a post behind a dialog.
      const covered =
        Boolean((e.target as Element | null)?.closest?.("[role=dialog], [role=alertdialog], [role=menu], [role=listbox]")) ||
        Boolean(document.querySelector("[data-open][role=dialog], [data-open][role=alertdialog], .menu-popup, .palette"));
      if (covered) return;
      if (e.key === "Escape" && selected.size) {
        setSelected(new Set());
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "a" &&
        shown.length
      ) {
        e.preventDefault();
        setSelected(new Set(shown.map((p) => p.id)));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Either case: Caps Lock should not switch the shortcut off.
      if (e.key === "n" || e.key === "N") {
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
      title:
        f.id === "all"
          ? "Show all posts"
          : f.id === "trash"
            ? "Open Trash"
            : `Show ${f.label.toLowerCase()}`,
      icon:
        f.id === "trash" ? (
          <Trash {...CI} />
        ) : f.id === "published" ? (
          <PaperPlaneTilt {...CI} />
        ) : f.id === "scheduled" ? (
          <CalendarBlank {...CI} />
        ) : f.id === "draft" ? (
          <FileText {...CI} />
        ) : (
          <Tray {...CI} />
        ),
      keywords: ["filter", "view", f.label],
      run: () => setFilter(f.id),
    })),
    ...tags.map(([t]) => ({
      id: `tag:${t}`,
      group: "Posts" as const,
      title: `Tagged “${t}”`,
      icon: <TagIcon {...CI} />,
      keywords: ["tag", "filter", t],
      checked: tagFilter.includes(t),
      run: () => setTagFilter((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])),
    })),
    {
      id: "select-all",
      group: "Posts",
      title: "Select all shown",
      keys: "⌘A",
      icon: <Checks {...CI} />,
      keywords: ["bulk", "multiple", "check"],
      run: () => setSelected(new Set(shown.map((p) => p.id))),
    },
    {
      id: "filter-focus",
      group: "Posts",
      title: "Filter by title",
      keys: "/",
      icon: <MagnifyingGlass {...CI} />,
      keywords: ["search"],
      run: () => window.setTimeout(() => search.current?.focus(), 50),
    },
  ]);

  return (
    <main className="admin-shell" data-selecting={selecting || undefined}>
      <ResearchWorkspace
        open={workspace}
        onClose={() => {
          setWorkspace(false);
          setVersion((v) => v + 1);
        }}
        onOpen={onOpen}
      />
      <MediaLibrary open={mediaOpen} onClose={() => setMediaOpen(false)} />
      <Sheet
        open={pagesOpen}
        onClose={() => setPagesOpen(false)}
        title="Pages"
        description="Your page hierarchy and shortcuts."
      >
        <PageTree
          embedded
          pages={posts ?? []}
          loading={!posts}
          onOpen={(id) => {
            setPagesOpen(false);
            onOpen(id);
          }}
          onRefresh={() => setVersion((v) => v + 1)}
        />
      </Sheet>
      <header className="admin-list-header">
        <div>
          <p className="admin-eyebrow" title={email}>
            nazarene.dev
          </p>
          <h1 className="admin-list-title">Writing</h1>
        </div>
        <div className="admin-list-actions">
          <SoundToggle className="size-8 rounded-full text-[color:var(--a-ink-2)]" />
          <ThemeToggle className="size-8 rounded-full text-[color:var(--a-ink-2)]" />
          <Menu.Root modal={false}>
            <Menu.Trigger className="admin-button admin-button-quiet">
              Workspace
              <CaretDown size={12} />
            </Menu.Trigger>
            <MenuSurface align="end">
              <MItem
                icon={<Books size={16} />}
                onSelect={() => setWorkspace(true)}
              >
                Research
              </MItem>
              <MItem
                icon={<ImageSquare size={16} />}
                onSelect={() => setMediaOpen(true)}
              >
                Media library
              </MItem>
              <MItem icon={<TagIcon size={16} />} onSelect={onTags}>
                Tag pages
              </MItem>
              <Menu.Item className="menu-item" render={<a href="/admin/shortcuts" target="_blank" rel="noopener"/>}><span className="menu-item-text">Keyboard shortcuts</span></Menu.Item>
              <Menu.Item
                className="menu-item"
                render={<a href="/writing" target="_blank" rel="noopener" />}
              >
                <span className="menu-item-icon">
                  <ArrowSquareOut size={16} />
                </span>
                <span className="menu-item-text">View on site</span>
              </Menu.Item>
            </MenuSurface>
          </Menu.Root>
          <div className="split-button">
            <button
              type="button"
              className="admin-button admin-button-primary split-main"
              data-keycap
              onClick={() => void create()}
              disabled={creating}
            >
              New post
              <kbd className="admin-kbd">N</kbd>
            </button>
            <Menu.Root modal={false}>
              <Menu.Trigger
                className="admin-button admin-button-primary split-more"
                aria-label="New from a template"
                disabled={creating}
              >
                <CaretDown size={12} weight="bold" />
              </Menu.Trigger>
              <MenuSurface align="end">
                <MLabel>Start from</MLabel>
                {TEMPLATES.map((t) => (
                  <MItem
                    key={t.id}
                    icon={<Fluent emoji={t.emoji} size={16} />}
                    onSelect={() => void create(t)}
                  >
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

      <div className="writing-list-tools">
        <button
          type="button"
          className="admin-button admin-button-quiet"
          onClick={() => setPagesOpen(true)}
        >
          <SidebarSimple size={16} />
          Pages
        </button>
        <label className="admin-search">
          <MagnifyingGlass size={15} aria-hidden />
          <input
            ref={search}
            type="search"
            placeholder="Filter posts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter posts by title"
          />
          <kbd className="admin-kbd">/</kbd>
        </label>
        <button
          type="button"
          className="admin-button admin-button-quiet writing-search-all"
          onClick={onSearch}
          title="Search all writing and actions"
        >
          <MagnifyingGlass size={15} />
          <span>Search all</span>
          <kbd className="admin-kbd">{keys("⌘K")}</kbd>
        </button>
      </div>
      <div className="admin-toolbar writing-status-toolbar">
        {/* Kobra's sliding tabs: the pill glides to the chosen filter. */}
        <Tabs value={filter} onValueChange={(next) => setFilter(next as Filter)}>
          <TabsList aria-label="Filter posts">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.id} value={f.id} data-trash={f.id === "trash" || undefined}>
                {f.id === "trash" ? <Trash size={13} aria-hidden="true" /> : null}
                {f.label}
                <span className="admin-segment-count"><SlidingNumber value={counts[f.id]} /></span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* Several tags at once, any or all of them, in the manner of Kobra's multi-select.
            Its own row under the tabs, flush with "All". */}
        {tagOptions.length && filter !== "trash" ? (
          <MultiSelect
            className="writing-tag-filter"
            align="start"
            label="Tags"
            icon={<TagIcon size={14} aria-hidden="true" />}
            placeholder="Search tags…"
            emptyText="No matching tags"
            options={tagOptions}
            value={tagFilter}
            onValueChange={setTagFilter}
            match={tagMatch}
            onMatchChange={setTagMatch}
            itemProps={(t) => ({ "data-tint": tagTint(t) })}
          />
        ) : null}
      </div>

      {loadError && !posts?.length ? (
        <div className="admin-empty" role="alert">
          <p className="admin-empty-title">Couldn’t load your posts</p>
          <p className="admin-empty-text">{loadError}</p>
          <button type="button" className="admin-button" onClick={() => setVersion((v) => v + 1)}>
            Try again
          </button>
        </div>
      ) : posts === null ? (
        <ul className="admin-rows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="admin-row admin-row-skeleton kit-skeleton skeleton-shimmer" />
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <div className="admin-empty">
          {filter === "trash" ? (
            <p className="admin-empty-text">
              Trash is empty. Posts you move to Trash stay here until you delete
              them permanently.
            </p>
          ) : live.length === 0 ? (
            <>
              <p className="admin-empty-title">Nothing written yet</p>
              <p className="admin-empty-text">
                Drafts stay private until you publish them. Press N to start
                one.
              </p>
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
              onToggle={() =>
                setSelected(
                  allChecked ? new Set() : new Set(shown.map((p) => p.id)),
                )
              }
            />
            <span className="rows-head-label">
              {selecting
                ? `${picked.length} of ${shown.length}`
                : <><SlidingNumber value={shown.length} /> {shown.length === 1 ? "post" : "posts"}</>}
            </span>
          </div>
          {/* Positioned: a leaving row is lifted out of the flow against it. */}
          <ul className="admin-rows" data-intro={intro || undefined} style={{ position: "relative" }}>
            <AnimatePresence initial={!intro} mode="popLayout">
            {shown.map((p) => (
              <motion.li
                key={p.id}
                data-selected={selected.has(p.id) || undefined}
                layout={animateRows ? "position" : false}
                initial={animateRows ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={animateRows ? ROW_EXIT : undefined}
                transition={{
                  duration: 0.2,
                  ease: ROW_EASE,
                  delay: Math.min(arrivals.get(p.id) ?? 0, ROW_STAGGER_CAP) * ROW_STAGGER,
                  layout: ROW_SLIDE,
                }}
              >
                <Checkbox
                  checked={selected.has(p.id)}
                  label={`Select “${p.title.trim() || "Untitled"}”`}
                  onToggle={(e) => toggle(p.id, e.shiftKey)}
                />
                <PostRow
                  post={p}
                  actions={rowActions}
                  onSelect={() => toggle(p.id, false)}
                  selection={
                    picked.length > 1 && selected.has(p.id)
                      ? bulk.commands
                      : undefined
                  }
                >
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
                        {p.pinned ? (
                          <PushPin
                            size={14}
                            weight="fill"
                            className="row-pin"
                            aria-label="Pinned"
                          />
                        ) : null}
                        {p.icon ? <Fluent emoji={p.icon} size={18} /> : null}
                        {p.title.trim() || <em>Untitled</em>}
                      </span>
                      {p.dek ? (
                        <span className="admin-row-dek">{p.dek}</span>
                      ) : null}
                    </span>
                    <span className="admin-row-meta">
                      <StatusDot status={p.status} dirty={p.dirty} />
                      <span>
                        {p.trashedAt
                          ? `Trashed ${relative(p.trashedAt)}`
                          : statusLabel(p)}
                      </span>
                      <span aria-hidden="true">·</span>
                      {p.status === "scheduled" && p.publishAt ? (
                        <>
                          <span>{relative(p.publishAt)}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      ) : null}
                      <UpdatedAt at={p.updatedAt} nested />
                      {p.parentId ? (
                        <span className="admin-parent-label">
                          In{" "}
                          {posts?.find((parent) => parent.id === p.parentId)
                            ?.title || "parent page"}
                        </span>
                      ) : null}
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="tag tag-sm"
                          data-tint={tagTint(t)}
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                    {p.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="admin-row-thumb"
                        src={p.cover}
                        alt=""
                        loading="lazy"
                      />
                    ) : null}
                  </button>
                </PostRow>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <BulkBar
        bulk={bulk}
        total={shown.length}
        onSelectAll={() => setSelected(new Set(shown.map((p) => p.id)))}
        onClear={() => setSelected(new Set())}
      />
    </main>
  );
}
