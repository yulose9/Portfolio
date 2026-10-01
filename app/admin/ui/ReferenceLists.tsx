"use client";
import { useState } from "react";
import type { api } from "./api";
import { normalizeSearch } from "../../../cms/search";

type References = Awaited<ReturnType<typeof api.references>>;
export default function ReferenceLists({
  refs,
  onPeek,
}: {
  refs: References;
  onPeek: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [context, setContext] = useState(true);
  const matches = (row: { title: string; snippet: string }) =>
    normalizeSearch(`${row.title} ${row.snippet}`).includes(
      normalizeSearch(query).trim(),
    );
  const groups = [
    {
      name: "Pages linking here",
      items: refs.incoming,
      empty:
        "Mention this page with @ from another draft to connect your notes.",
    },
    {
      name: "Referenced pages",
      items: refs.outgoing,
      empty: "Use @ to reference a page while writing.",
    },
    {
      name: "Unlinked mentions",
      items: refs.unlinked?.items ?? [],
      empty: "No other saved pages mention this title without linking here.",
    },
  ];
  return (
    <div className="reference-lists">
      <div className="reference-tools">
        <label className="research-field">
          Filter references
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Page title or surrounding text"
          />
        </label>
        <label className="research-check">
          <input
            type="checkbox"
            checked={context}
            onChange={(event) => setContext(event.target.checked)}
          />
          Show context
        </label>
      </div>
      {groups.map((group) => {
        const rows = group.items.filter(matches);
        return (
          <section
            className="research-reference-section"
            key={group.name}
            aria-label={group.name}
          >
            <h3>
              {group.name}
              <span className="research-count">
                {query ? `${rows.length} / ` : ""}
                {group.items.length}
              </span>
            </h3>
            {group.name === "Unlinked mentions" && (
              <p className="research-help">
                Possible connections based on the saved page title. Preview a
                source, then use @ in its editor to add a link.
              </p>
            )}
            {!rows.length ? (
              <p className="research-empty">
                {query ? "No references match your filter." : group.empty}
              </p>
            ) : (
              rows.map((row, i) => {
                const missing = "missing" in row && row.missing;
                return (
                  <button
                    type="button"
                    className="research-row"
                    key={`${row.id}:${i}`}
                    disabled={missing}
                    onClick={() => onPeek(row.id)}
                  >
                    <strong>{row.title || "Untitled"}</strong>
                    {missing && (
                      <span className="research-error">
                        Unavailable reference · Update or remove this link in
                        your draft.
                      </span>
                    )}
                    {context && (
                      <span>
                        {"start" in row ? (
                          <>
                            {row.snippet.slice(0, row.start)}
                            <mark>
                              {row.snippet.slice(
                                row.start,
                                row.start + row.length,
                              )}
                            </mark>
                            {row.snippet.slice(row.start + row.length)}
                          </>
                        ) : (
                          row.snippet || "Page reference"
                        )}
                      </span>
                    )}
                  </button>
                );
              })
            )}
            {group.name === "Unlinked mentions" &&
              refs.unlinked?.total > group.items.length && (
                <p className="research-help">
                  Showing the 30 most recently edited matching pages out of{" "}
                  {refs.unlinked.total}.
                </p>
              )}
          </section>
        );
      })}
    </div>
  );
}
