"use client";

import { useMemo, useState } from "react";

/*
 * The "data" table style: a CRM-like table with a sticky header, numbers
 * aligned on the right in tabular figures, and columns that sort when their
 * header is pressed (ascending, descending, back to the written order).
 * The cells arrive already rendered (links and emphasis intact); only the
 * plain-text keys are used for sorting.
 */

export type DataTableCell = { node: React.ReactNode; key: string; align?: string };
export type DataTableProps = { head: DataTableCell[]; rows: DataTableCell[][]; numeric: boolean[] };

const num = (s: string) => Number(s.replace(/^[$€£¥₱]/, "").replace(/[,%\s]/g, ""));

export default function DataTable({ head, rows, numeric }: DataTableProps) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const shown = useMemo(() => {
    if (!sort) return rows;
    const { col, dir } = sort;
    return [...rows].sort((a, b) => {
      const x = a[col]?.key ?? "";
      const y = b[col]?.key ?? "";
      const d = numeric[col] ? num(x) - num(y) : x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
      return d * dir;
    });
  }, [rows, sort, numeric]);

  const cycle = (col: number) =>
    setSort((s) => (!s || s.col !== col ? { col, dir: 1 } : s.dir === 1 ? { col, dir: -1 } : null));

  return (
    <div className="data-table" role="region" aria-label="Table" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {head.map((h, i) => {
              const state = sort?.col === i ? (sort.dir === 1 ? "ascending" : "descending") : "none";
              const align = h.align ?? (numeric[i] ? "right" : undefined);
              return (
                <th key={i} scope="col" aria-sort={state} data-align={align}>
                  <button type="button" className="data-table-sort" onClick={() => cycle(i)}>
                    <span>{h.node}</span>
                    <svg viewBox="0 0 16 16" aria-hidden="true" data-dir={state}>
                      <path d="M5 6.5 8 3.5l3 3M5 9.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
              {head.map((_, ci) => (
                <td key={ci} data-align={r[ci]?.align ?? (numeric[ci] ? "right" : undefined)} data-numeric={numeric[ci] || undefined}>
                  {r[ci]?.node}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
