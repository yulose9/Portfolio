"use client";
import { useRef, useState } from "react";
import {
  CaretDown,
  CaretRight,
  DotsSixVertical,
  DotsThree,
  FileText,
  Plus,
  PushPin,
} from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
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

type Props = {
  pages: PostSummary[];
  onOpen: (id: string) => void;
  currentId?: string;
  embedded?: boolean;
  beforeNavigate?: () => Promise<boolean>;
  onRefresh?: () => void;
  onPinCurrent?: () => Promise<void>;
};
export default function PageTree({
  pages,
  onOpen,
  currentId,
  embedded,
  beforeNavigate,
  onRefresh,
  onPinCurrent,
}: Props) {
  const [rows, setRows] = useState(pages),
    [query, setQuery] = useState("");
  const [expanded, expand] = useExpandedPages();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [dragged, setDragged] = useState<string | null>(null),
    [over, setOver] = useState<string | null>(null);
  const running = useRef(false),
    createRequests = useRef(new Map<string, string>());
  const recent = useRecentPages();
  const [sourcePages, setSourcePages] = useState(pages);
  if (sourcePages !== pages) {
    setSourcePages(pages);
    setRows(pages);
  }
  const refresh = async () => {
    const result = await api.list();
    setRows(result.posts);
    onRefresh?.();
  };
  const perform = async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
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
  const shortcut = (p: PostSummary) => (
    <button
      type="button"
      className="page-tree-link"
      key={p.id}
      disabled={busy}
      aria-current={p.id === currentId ? "page" : undefined}
      onClick={() => open(p.id)}
    >
      <span aria-hidden>{p.icon || <FileText size={15} />}</span>
      <span>{p.title || "Untitled"}</span>
    </button>
  );
  const render = (p: PostSummary, path: Set<string>): React.ReactNode => {
    if (path.has(p.id) || (filtered && !filtered.has(p.id))) return null;
    const nested = children.get(p.id) || [],
      next = new Set([...path, p.id]);
    const isOpen = !!filtered || expanded.has(p.id),
      siblings = (children.get(p.parentId || "root") || []).map((s) => s.id),
      index = siblings.indexOf(p.id);
    const canDrop =
      dragged &&
      dragged !== p.id &&
      (byId.get(dragged)?.parentId ?? null) === (p.parentId ?? null);
    return (
      <li key={p.id}>
        <div
          className="page-tree-row"
          data-page-id={p.id}
          data-current={p.id === currentId || undefined}
          data-drop={over === p.id || undefined}
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
              disabled={!!filtered}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${p.title || "Untitled"}`}
              aria-expanded={isOpen}
              onClick={() => {
                const value = new Set(expanded);
                if (isOpen) value.delete(p.id);
                else value.add(p.id);
                expand(value);
              }}
            >
              {isOpen ? <CaretDown size={12} /> : <CaretRight size={12} />}
            </button>
          ) : (
            <span className="page-tree-toggle" />
          )}
          <button
            className="page-tree-grip"
            type="button"
            disabled={!!filtered}
            aria-disabled={busy || undefined}
            draggable={!busy && !filtered}
            aria-label={`Reorder ${p.title || "Untitled"}`}
            title="Drag between siblings, or use Alt + ↑ / ↓"
            onKeyDown={(e) => {
              if (e.altKey && ["ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                const target = siblings[index + (e.key === "ArrowUp" ? -1 : 1)];
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
            <DotsSixVertical size={14} />
          </button>
          {shortcut(p)}
          {p.pinned ? (
            <PushPin size={12} weight="fill" aria-label="Pinned" />
          ) : null}
          <Menu.Root>
            <Menu.Trigger
              className="admin-icon-button page-tree-actions"
              disabled={busy}
              aria-label={`Actions for ${p.title || "Untitled"}`}
            >
              <DotsThree size={18} />
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
        </div>
        {nested.length && isOpen && path.size < 40 ? (
          <ul>{nested.map((child) => render(child, next))}</ul>
        ) : null}
      </li>
    );
  };
  const content = (
    <nav aria-label="Page navigator" aria-busy={busy}>
      <details className="folder-disclosure"><summary>Folders</summary><Folders pages={rows} beforeMove={beforeNavigate}/></details>
      <label className="page-tree-search">
        Find a page
        <input
          type="search"
          placeholder="Search page titles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="page-tree-tools">
        <button
          type="button"
          disabled={!!filtered}
          onClick={() => expand(new Set(visible.map((p) => p.id)))}
        >
          Expand all
        </button>
        <button
          type="button"
          disabled={!!filtered}
          onClick={() => expand(new Set())}
        >
          Collapse all
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void perform(refresh)}
        >
          Refresh
        </button>
      </div>
      {error ? (
        <p role="alert" className="page-tree-error">
          {error}
        </p>
      ) : null}
      <p className="page-tree-status" role="status">
        {message}
      </p>
      {!filtered && visible.some((p) => p.pinned) ? (
        <section aria-label="Pinned pages">
          <h3>Pinned</h3>
          {visible.filter((p) => p.pinned).map(shortcut)}
        </section>
      ) : null}
      {!filtered && recent.some((id) => byId.has(id)) ? (
        <section aria-label="Recently opened pages">
          <h3>Recently opened</h3>
          {recent
            .map((id) => byId.get(id))
            .filter((p): p is PostSummary => !!p)
            .slice(0, 5)
            .map(shortcut)}
        </section>
      ) : null}
      <h3>{filtered ? "Matching pages" : "All pages"}</h3>
      {!visible.length ? (
        <p className="field-help">Your pages will appear here.</p>
      ) : filtered?.size === 0 ? (
        <p className="field-help">No pages match “{query}”.</p>
      ) : (
        <ul>{roots.map((p) => render(p, new Set()))}</ul>
      )}
      <p className="page-tree-help">
        Reorder pages within the same parent. Page actions also offer Move up
        and Move down.
      </p>
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
