"use client";
import { useState } from "react";
import type { PostSummary } from "./api";
import { useRecentPages } from "./recent-pages";
export default function PageTree({
  pages,
  onOpen,
}: {
  pages: PostSummary[];
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const recent = useRecentPages();
  const visible = pages.filter((p) => !p.trashedAt),
    ids = new Set(visible.map((p) => p.id));
  const render = (page: PostSummary, path: Set<string>): React.ReactNode => {
    if (path.has(page.id)) return null;
    const next = new Set([...path, page.id]),
      children = visible.filter((p) => p.parentId === page.id);
    const button = (
      <button
        type="button"
        className="page-tree-link"
        onClick={() => onOpen(page.id)}
      >
        {page.icon ? <span aria-hidden>{page.icon}</span> : null}
        {page.title || "Untitled"}
        {page.pinned ? <small>Pinned</small> : null}
      </button>
    );
    return (
      <li key={page.id}>
        {children.length ? (
          <details>
            <summary>
              {page.title || "Untitled"}
              <small>{children.length} subpages</small>
            </summary>
            {button}
            <ul>{children.map((p) => render(p, next))}</ul>
          </details>
        ) : (
          button
        )}
      </li>
    );
  };
  return (
    <details className="page-tree">
      <summary>Browse page hierarchy</summary>
      <nav aria-label="Page hierarchy">
        <label>
          Find a page
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Page title"
          />
        </label>
        {!filter && recent.length ? (
          <>
            <p>Recently opened</p>
            {recent
              .map((id) => visible.find((p) => p.id === id))
              .filter((p): p is PostSummary => !!p)
              .map((p) => (
                <button
                  className="page-tree-link"
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p.id)}
                >
                  {p.title || "Untitled"}
                </button>
              ))}
            <p>All pages</p>
          </>
        ) : null}
        <ul>
          {filter
            ? visible
                .filter((p) =>
                  p.title.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="page-tree-link"
                      onClick={() => onOpen(p.id)}
                    >
                      {p.title || "Untitled"}
                    </button>
                  </li>
                ))
            : visible
                .filter((p) => !p.parentId || !ids.has(p.parentId))
                .map((p) => render(p, new Set()))}
        </ul>
      </nav>
    </details>
  );
}
