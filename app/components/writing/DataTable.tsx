"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { scrollEdges } from "./scroll-edges";

/*
 * The "data" table style: a CRM-like table. Columns sort when their header
 * is pressed (ascending, descending, back to the written order), a filter
 * above it narrows the rows to the ones that mention what you type, numbers
 * sit on the right in tabular figures, and a tall table scrolls inside its
 * frame with the header held at the top (and, with a header column, the
 * first column held at the left while it scrolls sideways).
 *
 * The cells arrive already rendered (links and emphasis intact); only the
 * plain-text keys are used for sorting and filtering.
 */

export type DataTableCell = { node: React.ReactNode; key: string; align?: string };
export type DataTableProps = {
  head: DataTableCell[];
  rows: DataTableCell[][];
  numeric: boolean[];
  /** Each row's first cell is its header (<th scope="row">). */
  rowHeaders?: boolean;
  width?: "fit" | "wide";
};

const num = (s: string) => Number(s.replace(/^[$€£¥₱]/, "").replace(/[,%\s]/g, ""));
/** Filtering only makes sense once there are a few rows to look through. */
const FILTER_FROM = 6;

export default function DataTable({ head, rows, numeric, rowHeaders = false, width = "fit" }: DataTableProps) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [query, setQuery] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const filterId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const kept = q ? rows.filter((r) => r.some((c) => c.key.toLocaleLowerCase().includes(q))) : rows;
    if (!sort) return kept;
    const { col, dir } = sort;
    return [...kept].sort((a, b) => {
      const x = a[col]?.key ?? "";
      const y = b[col]?.key ?? "";
      // Empty cells go last whichever way it sorts.
      if (!x || !y) return x ? -1 : y ? 1 : 0;
      const d = numeric[col] ? num(x) - num(y) : x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
      return d * dir;
    });
  }, [rows, sort, numeric, query]);

  useEffect(() => (scroller.current ? scrollEdges(scroller.current, { label: "Data table" }) : undefined), []);

  const cycle = (col: number) =>
    setSort((s) => (!s || s.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));
  const alignOf = (cell: DataTableCell | undefined, i: number) => cell?.align ?? (numeric[i] ? "right" : undefined);

  return (
    <div className="data-table" data-table-width={width !== "fit" ? width : undefined}>
      {rows.length >= FILTER_FROM ? (
        <div className="data-table-bar">
          <label className="data-table-filter" htmlFor={filterId}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.25 10.25 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={input}
              id={filterId}
              type="search"
              placeholder="Filter rows"
              aria-label="Filter rows"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
            />
          </label>
          <span className="data-table-count" aria-live="polite">
            {query.trim() ? `${shown.length} of ${rows.length} rows` : `${rows.length} rows`}
          </span>
        </div>
      ) : null}
      <div className="data-table-frame">
        <div className="data-table-scroll" ref={scroller} data-row-headers={rowHeaders || undefined}>
          <table>
            <thead>
              <tr>
                {head.map((h, i) => {
                  const state = sort?.col === i ? (sort.dir === 1 ? "ascending" : "descending") : "none";
                  return (
                    <th key={i} scope="col" aria-sort={state} data-align={alignOf(h, i)}>
                      <button type="button" className="data-table-sort" onClick={() => cycle(i)}>
                        <span className="data-table-sort-label">{h.node}</span>
                        <svg viewBox="0 0 16 16" aria-hidden="true" data-dir={state}>
                          <path className="data-table-sort-up" d="M5.5 6.5 8 4l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path className="data-table-sort-down" d="M5.5 9.5 8 12l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, ri) => (
                <tr key={ri}>
                  {head.map((_, ci) => {
                    const props = { "data-align": alignOf(r[ci], ci), "data-numeric": numeric[ci] || undefined };
                    return ci === 0 && rowHeaders ? (
                      <th key={ci} scope="row" {...props}>
                        {r[ci]?.node}
                      </th>
                    ) : (
                      <td key={ci} {...props}>
                        {r[ci]?.node}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr>
                  <td className="data-table-empty" colSpan={head.length}>
                    <span>No rows match “{query.trim()}”.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        // The button goes with the message; the caret goes back to the filter.
                        input.current?.focus();
                      }}
                    >
                      Clear filter
                    </button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
