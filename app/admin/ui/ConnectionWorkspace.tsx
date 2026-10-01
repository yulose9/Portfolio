"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { ConnectionRow } from "../../../cms/connections";
import { normalizeSearch } from "../../../cms/search";
import AdminSelect from "./AdminSelect";

export default function ConnectionWorkspace({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<ConnectionRow[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [view, setView] = useState("isolated");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let alive = true;
    void api.connections().then(
      (result) => {
        if (alive) {
          setRows(result.pages);
          setError("");
        }
      },
      (e) => {
        if (alive)
          setError(
            e instanceof Error ? e.message : "Could not load connections.",
          );
      },
    );
    return () => {
      alive = false;
    };
  }, [version]);
  const groups = {
    isolated: (p: ConnectionRow) => !p.incoming && !p.outgoing && !p.missing,
    incoming: (p: ConnectionRow) => !p.incoming,
    missing: (p: ConnectionRow) => p.missing > 0,
    all: () => true,
  };
  const filtered =
    rows
      ?.filter(groups[view as keyof typeof groups])
      .filter((p) =>
        normalizeSearch(p.title).includes(normalizeSearch(query).trim()),
      ) ?? [];
  return (
    <section className="connections-workspace" aria-label="Connections">
      <header>
        <h3>Connections</h3>
        <p className="research-help">
          Find pages worth connecting and references that need attention. Counts
          use saved page links; folders and self-links are excluded.
        </p>
      </header>
      <div className="research-form-grid">
        <AdminSelect
          label="Connection view"
          value={view}
          onValueChange={setView}
          options={[
            {
              value: "isolated",
              label: `Isolated pages (${rows?.filter(groups.isolated).length ?? 0})`,
            },
            {
              value: "incoming",
              label: `No incoming links (${rows?.filter(groups.incoming).length ?? 0})`,
            },
            {
              value: "missing",
              label: `Broken references (${rows?.filter(groups.missing).length ?? 0})`,
            },
            { value: "all", label: `All pages (${rows?.length ?? 0})` },
          ]}
        />
        <label className="research-field">
          Filter pages
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Page title"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="research-error">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setVersion((v) => v + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : !rows ? (
        <p role="status">Checking saved page connections…</p>
      ) : (
        <>
          <p className="research-help" role="status">
            {filtered.length} {filtered.length === 1 ? "page" : "pages"}
            {view === "isolated"
              ? " with no connections. A standalone page can be intentional."
              : "."}
          </p>
          {filtered.map((row) => (
            <button
              type="button"
              className="research-row"
              key={row.id}
              onClick={() => onOpen(row.id)}
            >
              <strong>
                {row.icon} {row.title || "Untitled"}
              </strong>
              <span>
                {row.incoming} incoming · {row.outgoing} outgoing
                {row.missing ? ` · ${row.missing} unavailable` : ""}
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="research-empty">No pages match this view.</p>
          )}
        </>
      )}
    </section>
  );
}
