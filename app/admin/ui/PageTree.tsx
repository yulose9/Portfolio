"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowsInLineVertical,
  ArrowsOutLineVertical,
  CaretRight,
  DotsSixVertical,
  DotsThree,
  FileText,
  Info,
  MagnifyingGlass,
  Plus,
  PushPin,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Kbd } from "../../components/kit/kbd";
import { api, type PostSummary } from "./api";
import { useRecentPages } from "./recent-pages";
import { useExpandedPages } from "./page-tree-preferences";
import {
  comparePages,
  matchingPageIds,
  sameIds,
  siblingIds,
} from "../../../cms/page-order";
import { MenuSurface, MItem } from "./menu";
import Folders from "./Folders";
import { Skeleton } from "../../components/kit/skeleton";
import { Tooltip } from "../../components/kit/tooltip";

type Props = {
  pages: PostSummary[];
  onOpen: (id: string) => void;
  currentId?: string;
  embedded?: boolean;
  beforeNavigate?: () => Promise<boolean>;
  onRefresh?: () => void;
  onPinCurrent?: () => Promise<void>;
  /** The page list is still on its way: rows give way to a skeleton. */
  loading?: boolean;
  /** The page list could not be loaded; `onRetry` asks for it again. */
  loadError?: string;
  onRetry?: () => void;
};

/* Expand and collapse: height and opacity on the strong ease-out. */
const EASE = [0.23, 1, 0.32, 1] as const;
const fold = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

const plain = (value: string) =>
  value.normalize("NFKD").toLocaleLowerCase().replace(/\p{M}/gu, "");

/** The title with the matched run marked, matching as matchingPageIds does (case and accents ignored). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = plain(query.trim());
  if (!q) return <>{text}</>;
  let folded = "";
  const origin: number[] = [];
  let offset = 0;
  for (const char of text) {
    for (const c of plain(char)) {
      folded += c;
      origin.push(offset);
    }
    offset += char.length;
  }
  const at = folded.indexOf(q);
  if (at < 0) return <>{text}</>;
  const start = origin[at],
    end = at + q.length < origin.length ? origin[at + q.length] : text.length;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

/** A long title shows in full on hover, and only when it is cut off. */
const revealTitle = (e: React.PointerEvent<HTMLElement>) => {
  const label = e.currentTarget.querySelector<HTMLElement>(
    ".page-tree-title",
  );
  if (!label) return;
  e.currentTarget.title =
    label.scrollWidth > label.clientWidth ? label.textContent || "" : "";
};

/** A ghost icon button in the toolbar, named by its tooltip and its aria-label alike. */
function Tool({
  name,
  disabled,
  spinning,
  onClick,
  children,
}: {
  name: string;
  disabled: boolean;
  spinning?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={name} side="bottom">
      <button
        type="button"
        className="page-tree-tool"
        aria-label={name}
        disabled={disabled}
        data-spinning={spinning || undefined}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export default function PageTree({
  pages,
  onOpen,
  currentId,
  embedded,
  beforeNavigate,
  onRefresh,
  onPinCurrent,
  loading,
  loadError,
  onRetry,
}: Props) {
  const [rows, setRows] = useState(pages),
    [query, setQuery] = useState("");
  const [expanded, expand] = useExpandedPages();
  const [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [foldersOpen, setFoldersOpen] = useState(false),
    [failed, setFailed] = useState<(() => Promise<void>) | null>(null);
  const [dragged, setDragged] = useState<string | null>(null),
    [over, setOver] = useState<string | null>(null);
  const running = useRef(false),
    createRequests = useRef(new Map<string, string>()),
    nav = useRef<HTMLElement>(null),
    search = useRef<HTMLInputElement>(null);
  const recent = useRecentPages();
  const still = useReducedMotion();
  const motionTiming = { duration: still ? 0 : 0.2, ease: EASE };
  const [sourcePages, setSourcePages] = useState(pages);
  if (sourcePages !== pages) {
    setSourcePages(pages);
    setRows(pages);
  }

  /* "/" jumps to the search from anywhere in the sheet, as it does in the list. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']") ||
        !nav.current?.isConnected
      )
        return;
      const dialog = nav.current.closest("[role='dialog']");
      if (dialog && target && !dialog.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      search.current?.focus();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await api.list();
      setRows(result.posts);
      onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };
  const perform = async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setFailed(null);
    } catch (e) {
      setFailed(() => work);
      setError(
        e instanceof Error ? e.message : "This action could not finish.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const leave = async () => {
    if (beforeNavigate && !(await beforeNavigate()))
      throw new Error("Save or recover the current page before continuing.");
  };
  const open = (id: string) =>
    void perform(async () => {
      await leave();
      onOpen(id);
    });
  const create = (parent: PostSummary) =>
    void perform(async () => {
      await leave();
      const requestId =
        createRequests.current.get(parent.id) || crypto.randomUUID();
      createRequests.current.set(parent.id, requestId);
      const result = await api.create({ parentId: parent.id, requestId });
      createRequests.current.delete(parent.id);
      expand(new Set([...expanded, parent.id]));
      onOpen(result.post.id);
    });
  const pin = (p: PostSummary) =>
    void perform(async () => {
      if (p.id === currentId && onPinCurrent) {
        await onPinCurrent();
        await refresh();
        setMessage("Page pin updated.");
        return;
      }
      await leave();
      const { post } = await api.get(p.id);
      await api.save(p.id, { pinned: !post.pinned, base: post.updatedAt });
      await refresh();
      setMessage(post.pinned ? "Page unpinned." : "Page pinned.");
    });
  const reorder = (p: PostSummary, targetId: string) =>
    void perform(async () => {
      const parentId = p.parentId ?? null,
        previous = siblingIds(rows, parentId);
      const from = previous.indexOf(p.id),
        to = previous.indexOf(targetId);
      if (from < 0 || to < 0)
        throw new Error("Only pages with the same parent can be reordered.");
      const next = [...previous];
      next.splice(from, 1);
      next.splice(to, 0, p.id);
      if (sameIds(previous, next)) return;
      await api.reorderPages(parentId, previous, next);
      setRows((value) =>
        value.map((row) =>
          (row.parentId ?? null) === parentId
            ? { ...row, navigationOrder: next.indexOf(row.id) }
            : row,
        ),
      );
      setMessage(
        `Moved ${p.title || "Untitled"} to position ${to + 1} of ${next.length}.`,
      );
      onRefresh?.();
    });

  const visible = rows.filter((p) => !p.trashedAt).sort(comparePages);
  const byId = new Map(visible.map((p) => [p.id, p]));
  const filtered = query.trim() ? matchingPageIds(visible, query) : null;
  const matches = (p: PostSummary) =>
    plain(p.title || "").includes(plain(query.trim()));
  const children = new Map<string, PostSummary[]>();
  for (const p of visible) {
    const key = p.parentId || "root";
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(p);
  }
  const roots = visible.filter((p) => !p.parentId || !byId.has(p.parentId));
  const reached = new Set<string>();
  const mark = (start: string) => {
    const queue = [start];
    while (queue.length) {
      const id = queue.pop()!;
      if (reached.has(id)) continue;
      reached.add(id);
      queue.push(...(children.get(id) || []).map((p) => p.id));
    }
  };
  roots.forEach((p) => mark(p.id));
  for (const p of visible)
    if (!reached.has(p.id)) {
      roots.push(p);
      mark(p.id);
    }
  const toggle = (id: string, isOpen: boolean) => {
    const value = new Set(expanded);
    if (isOpen) value.delete(id);
    else value.add(id);
    expand(value);
  };

  /* Arrow keys walk the rows; Right and Left open and close a branch. */
  const items = () =>
    [
      ...(nav.current?.querySelectorAll<HTMLElement>("[data-nav-item]") ??
        []),
    ];
  const onNavKey = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target === search.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items()[0]?.focus();
      } else if (e.key === "Enter" && filtered) {
        e.preventDefault();
        nav.current
          ?.querySelector<HTMLElement>("[data-nav-item][data-match]")
          ?.click();
      } else if (e.key === "Escape" && query) {
        e.preventDefault();
        e.stopPropagation();
        setQuery("");
      }
      return;
    }
    if (!target.matches("[data-nav-item]")) return;
    const list = items(),
      at = list.indexOf(target);
    const id = target.dataset.navId,
      page = id ? byId.get(id) : undefined;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      if (!page || !target.closest(".page-tree-row")) return;
      e.preventDefault();
      const siblings = (children.get(page.parentId || "root") || []).map(
        (s) => s.id,
      );
      const swap =
        siblings[siblings.indexOf(page.id) + (e.key === "ArrowUp" ? -1 : 1)];
      if (swap && !busy && !filtered) reorder(page, swap);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = list[at + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) next.focus();
      else if (e.key === "ArrowUp") search.current?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (
      page &&
      target.closest(".page-tree-row") &&
      (e.key === "ArrowRight" || e.key === "ArrowLeft")
    ) {
      e.preventDefault();
      const branch = (children.get(page.id) || []).length > 0,
        isOpen = !!filtered || expanded.has(page.id);
      if (e.key === "ArrowRight") {
        if (branch && !isOpen) toggle(page.id, false);
        else if (branch) list[at + 1]?.focus();
      } else if (branch && isOpen && !filtered) toggle(page.id, true);
      else if (page.parentId && byId.has(page.parentId))
        list
          .find(
            (el) =>
              el.dataset.navId === page.parentId &&
              el.closest(".page-tree-row"),
          )
          ?.focus();
    }
  };

  const label = (p: PostSummary) => (
    <>
      <span className="page-tree-icon" aria-hidden>
        {p.icon || <FileText size={16} />}
      </span>
      <span className="page-tree-title">
        <Highlight text={p.title || "Untitled"} query={query} />
      </span>
      {p.pinned ? (
        <PushPin
          className="page-tree-pin"
          size={12}
          weight="fill"
          aria-label="Pinned"
        />
      ) : null}
    </>
  );
  const shortcut = (p: PostSummary) => (
    <li key={p.id}>
      <button
        type="button"
        className="page-tree-link page-tree-shortcut"
        data-nav-item=""
        data-nav-id={p.id}
        data-match={filtered ? "" : undefined}
        disabled={busy}
        aria-current={p.id === currentId ? "page" : undefined}
        onPointerEnter={revealTitle}
        onClick={() => open(p.id)}
      >
        {label(p)}
      </button>
    </li>
  );
  const render = (p: PostSummary, path: Set<string>): React.ReactNode => {
    if (path.has(p.id) || (filtered && !filtered.has(p.id))) return null;
    const nested = children.get(p.id) || [],
      next = new Set([...path, p.id]);
    const isOpen = !!filtered || expanded.has(p.id),
      siblings = (children.get(p.parentId || "root") || []).map((s) => s.id),
      index = siblings.indexOf(p.id),
      title = p.title || "Untitled",
      direct = !filtered || matches(p);
    const canDrop =
      dragged &&
      dragged !== p.id &&
      (byId.get(dragged)?.parentId ?? null) === (p.parentId ?? null);
    return (
      <li key={p.id}>
        <div
          className="page-tree-row"
          style={{ "--depth": path.size } as React.CSSProperties}
          data-page-id={p.id}
          data-current={p.id === currentId || undefined}
          data-drop={over === p.id || undefined}
          data-context={direct ? undefined : ""}
          onDragOver={(e) => {
            if (canDrop && !busy && !filtered) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(p.id);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setOver(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const source = dragged && byId.get(dragged);
            setOver(null);
            setDragged(null);
            if (source && canDrop && !busy && !filtered) reorder(source, p.id);
          }}
        >
          {nested.length ? (
            <button
              className="page-tree-toggle"
              type="button"
              tabIndex={-1}
              disabled={!!filtered}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
              aria-expanded={isOpen}
              data-open={isOpen || undefined}
              onClick={() => toggle(p.id, isOpen)}
            >
              <CaretRight size={12} weight="bold" />
            </button>
          ) : (
            <span className="page-tree-toggle" aria-hidden />
          )}
          <button
            type="button"
            className="page-tree-link"
            data-nav-item=""
            data-nav-id={p.id}
            data-match={filtered && direct ? "" : undefined}
            disabled={busy}
            aria-current={p.id === currentId ? "page" : undefined}
            aria-expanded={nested.length && !filtered ? isOpen : undefined}
            onPointerEnter={revealTitle}
            onClick={() => open(p.id)}
          >
            {label(p)}
          </button>
          <span className="page-tree-row-actions">
            <button
              className="page-tree-grip"
              type="button"
              disabled={!!filtered}
              aria-disabled={busy || undefined}
              draggable={!busy && !filtered}
              aria-label={`Reorder ${title}`}
              title="Drag to reorder, or Alt + ↑ / ↓"
              onKeyDown={(e) => {
                if (e.altKey && ["ArrowUp", "ArrowDown"].includes(e.key)) {
                  e.preventDefault();
                  e.stopPropagation();
                  const target =
                    siblings[index + (e.key === "ArrowUp" ? -1 : 1)];
                  if (target && !busy && !filtered) reorder(p, target);
                }
              }}
              onDragStart={(e) => {
                if (busy || filtered) {
                  e.preventDefault();
                  return;
                }
                setDragged(p.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", p.id);
              }}
              onDragEnd={() => {
                setDragged(null);
                setOver(null);
              }}
            >
              <DotsSixVertical size={14} weight="bold" />
            </button>
            <Menu.Root>
              <Menu.Trigger
                className="page-tree-actions"
                disabled={busy}
                aria-label={`Actions for ${title}`}
              >
                <DotsThree size={16} weight="bold" />
              </Menu.Trigger>
              <MenuSurface align="end">
                <MItem
                  icon={<Plus size={15} />}
                  disabled={p.page === false}
                  onSelect={() => create(p)}
                >
                  New subpage
                </MItem>
                <MItem icon={<PushPin size={15} />} onSelect={() => pin(p)}>
                  {p.pinned ? "Unpin page" : "Pin page"}
                </MItem>
                <MItem
                  disabled={!!filtered || index <= 0}
                  onSelect={() => reorder(p, siblings[index - 1])}
                >
                  Move up
                </MItem>
                <MItem
                  disabled={
                    !!filtered || index < 0 || index >= siblings.length - 1
                  }
                  onSelect={() => reorder(p, siblings[index + 1])}
                >
                  Move down
                </MItem>
              </MenuSurface>
            </Menu.Root>
          </span>
        </div>
        <AnimatePresence initial={false}>
          {nested.length && isOpen && path.size < 40 ? (
            <motion.ul
              key="children"
              className="page-tree-children"
              style={{ "--depth": path.size + 1 } as React.CSSProperties}
              {...fold}
              transition={filtered ? { duration: 0 } : motionTiming}
            >
              {nested.map((child) => render(child, next))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </li>
    );
  };

  const pinned = visible.filter((p) => p.pinned);
  const recentPages = recent
    .map((id) => byId.get(id))
    .filter((p): p is PostSummary => !!p && (!filtered || matches(p)))
    .slice(0, 5);
  const matchCount = filtered ? visible.filter(matches).length : 0;
  const heading = (title: string, count?: number) => (
    <h3 className="page-tree-heading">
      <span>{title}</span>
      {count !== undefined ? (
        <span className="page-tree-count">{count}</span>
      ) : null}
    </h3>
  );
  const content = (
    <nav
      ref={nav}
      aria-label="Page navigator"
      aria-busy={busy || loading || undefined}
      onKeyDown={onNavKey}
    >
      <label className="page-tree-search">
        <MagnifyingGlass size={15} aria-hidden />
        <input
          ref={search}
          type="search"
          aria-label="Find a page"
          placeholder="Find a page"
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={loading || !!loadError}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? null : (
          <Kbd size="sm" aria-hidden>
            /
          </Kbd>
        )}
      </label>
      <div className="page-tree-tools">
        <p className="page-tree-status" role="status">
          {loading
            ? "Loading pages…"
            : refreshing
              ? "Refreshing pages…"
              : message}
        </p>
        <div className="page-tree-tool-group">
          <Tool
            name="Expand all"
            disabled={!!filtered || !!loading || !!loadError}
            onClick={() => expand(new Set(visible.map((p) => p.id)))}
          >
            <ArrowsOutLineVertical size={15} />
          </Tool>
          <Tool
            name="Collapse all"
            disabled={!!filtered || !!loading || !!loadError}
            onClick={() => expand(new Set())}
          >
            <ArrowsInLineVertical size={15} />
          </Tool>
          <Tool
            name="Refresh"
            disabled={busy || !!loading}
            spinning={refreshing || loading}
            onClick={() =>
              onRetry && loadError ? onRetry() : void perform(refresh)
            }
          >
            <ArrowClockwise size={15} />
          </Tool>
        </div>
      </div>
      {error ? (
        <div role="alert" className="page-tree-error">
          <p>{error}</p>
          {failed ? (
            <button
              type="button"
              className="admin-button admin-button-quiet"
              disabled={busy}
              onClick={() => void perform(failed)}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {loadError ? (
        <div role="alert" className="page-tree-error">
          <p>{loadError}</p>
          {onRetry ? (
            <button type="button" className="admin-button" onClick={onRetry}>
              Retry loading pages
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div className="page-tree-skeleton" aria-hidden>
          <Skeleton className="page-tree-skeleton-heading" />
          {[72, 54, 64, 40, 58, 46].map((width, i) => (
            <div key={i} className="page-tree-skeleton-row">
              <Skeleton className="page-tree-skeleton-icon" />
              <Skeleton style={{ width: `${width}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {!filtered && pinned.length ? (
            <section aria-label="Pinned pages">
              {heading("Pinned", pinned.length)}
              <ul>{pinned.map(shortcut)}</ul>
            </section>
          ) : null}
          {recentPages.length ? (
            <section aria-label="Recently opened pages">
              {heading("Recently opened", recentPages.length)}
              <ul>{recentPages.map(shortcut)}</ul>
            </section>
          ) : null}
          {!filtered ? (
            <div className="page-tree-folders">
              <h3 className="page-tree-heading">
                <button
                  type="button"
                  className="page-tree-section-toggle"
                  aria-expanded={foldersOpen}
                  aria-controls="page-tree-folders"
                  data-open={foldersOpen || undefined}
                  onClick={() => setFoldersOpen((v) => !v)}
                >
                  Folders
                  <CaretRight size={10} weight="bold" aria-hidden />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {foldersOpen ? (
                  <motion.div
                    key="folders"
                    id="page-tree-folders"
                    className="page-tree-folders-body"
                    {...fold}
                    transition={motionTiming}
                  >
                    <Folders pages={rows} beforeMove={beforeNavigate} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
          <h3 className="page-tree-heading">
            <span>{filtered ? "Matching pages" : "All pages"}</span>
            <span className="page-tree-count">
              {filtered ? matchCount : visible.length}
            </span>
            {filtered ? null : (
              <Tooltip
                side="bottom"
                className="page-tree-tip"
                content="Drag a page by its grip, or press Alt + ↑ / ↓, to reorder it among pages with the same parent. Page actions also offer Move up and Move down."
              >
                <button
                  type="button"
                  className="page-tree-info"
                  aria-label="How reordering works"
                >
                  <Info size={13} />
                </button>
              </Tooltip>
            )}
          </h3>
          {!visible.length ? (
            <p className="page-tree-empty">
              No pages yet. Pages you create appear here.
            </p>
          ) : filtered?.size === 0 ? (
            <div className="page-tree-empty">
              <p>No pages match “{query.trim()}”</p>
              <button
                type="button"
                className="admin-button admin-button-quiet"
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul>{roots.map((p) => render(p, new Set()))}</ul>
          )}
        </>
      )}
    </nav>
  );
  return embedded ? (
    <div className="page-tree page-tree-embedded">{content}</div>
  ) : (
    <details className="page-tree">
      <summary>Browse pages</summary>
      {content}
    </details>
  );
}
