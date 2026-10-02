"use client";

import { ChartBar, ChartDonut, ChartLine, ChartLineUp, ChartPie, Trash } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

import { CHART_TYPES, parseCsv, toCsv, type ChartType } from "../../../../cms/blocks";
import Chart from "../../../components/writing/Chart";
import { ChartBase } from "./blocks-schema";

/*
 * A chart, in the editor: the live chart the site draws, with its type, a
 * title, and the data as a small grid (or CSV, for pasting from a sheet).
 * The first row names the series; the first column labels the points.
 */

const ICONS: Record<ChartType, React.ReactNode> = {
  bar: <ChartBar size={15} aria-hidden />,
  line: <ChartLine size={15} aria-hidden />,
  area: <ChartLineUp size={15} aria-hidden />,
  pie: <ChartPie size={15} aria-hidden />,
  donut: <ChartDonut size={15} aria-hidden />,
};

function ChartView({ node, editor, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const type = (CHART_TYPES as readonly string[]).includes(node.attrs.chartType) ? (node.attrs.chartType as ChartType) : "bar";
  const csv = String(node.attrs.data ?? "");
  const rows = parseCsv(csv);
  const [mode, setMode] = useState<"grid" | "csv">("grid");
  const [draft, setDraft] = useState(csv);
  const editable = editor.isEditable;
  const width = Math.max(2, ...rows.map((r) => r.length));
  const setCell = (r: number, c: number, value: string) => {
    const next = rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""));
    next[r][c] = value;
    updateAttributes({ data: toCsv(next) });
  };
  const grid = rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""));

  return (
    <NodeViewWrapper className="editor-chart" data-selected={selected || undefined}>
      <div contentEditable={false}>
        <div className="editor-block-toolbar">
          <div className="editor-segment" role="radiogroup" aria-label="Chart type">
            {CHART_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={t === type} aria-label={t} title={t[0].toUpperCase() + t.slice(1)} disabled={!editable} onClick={() => updateAttributes({ chartType: t })}>
                {ICONS[t]}
              </button>
            ))}
          </div>
          <input className="editor-block-title" value={String(node.attrs.title ?? "")} placeholder="Chart title" aria-label="Chart title" maxLength={200} disabled={!editable} onChange={(e) => updateAttributes({ title: e.target.value })} />
          {editable ? (
            <button type="button" className="code-action" aria-label="Remove chart" title="Remove chart" onClick={() => deleteNode()}>
              <Trash size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        <Chart type={type} title="" rows={rows} />
        <details className="editor-chart-data" open={editable}>
          <summary>
            Data
            <span className="editor-chart-mode" onClick={(e) => e.preventDefault()}>
              <button type="button" aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>Grid</button>
              <button type="button" aria-pressed={mode === "csv"} onClick={() => { setDraft(csv); setMode("csv"); }}>CSV</button>
            </span>
          </summary>
          {mode === "csv" ? (
            <textarea
              className="editor-chart-csv"
              value={draft}
              spellCheck={false}
              rows={Math.min(14, Math.max(4, draft.split("\n").length + 1))}
              aria-label="Chart data as CSV"
              disabled={!editable}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => updateAttributes({ data: toCsv(parseCsv(draft)) })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="editor-chart-grid">
              <table>
                <tbody>
                  {grid.map((row, r) => (
                    <tr key={r}>
                      {row.map((value, c) => (
                        <td key={c}>
                          <input value={value} disabled={!editable} aria-label={r === 0 ? `Column ${c + 1} name` : `Row ${r}, column ${c + 1}`}
                            inputMode={r > 0 && c > 0 ? "decimal" : undefined} data-head={r === 0 || undefined}
                            onChange={(e) => setCell(r, c, e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {editable ? (
                <div className="editor-chart-grid-actions">
                  <button type="button" className="admin-button" onClick={() => updateAttributes({ data: toCsv([...grid, Array.from({ length: width }, (_, i) => (i ? "0" : `Point ${grid.length}`))]) })}>Add row</button>
                  <button type="button" className="admin-button" disabled={width >= 7} onClick={() => updateAttributes({ data: toCsv(grid.map((row, r) => [...row, r ? "0" : `Series ${width}`])) })}>Add series</button>
                  <button type="button" className="admin-button" disabled={grid.length <= 2} onClick={() => updateAttributes({ data: toCsv(grid.slice(0, -1)) })}>Remove last row</button>
                  <button type="button" className="admin-button" disabled={width <= 2} onClick={() => updateAttributes({ data: toCsv(grid.map((row) => row.slice(0, -1))) })}>Remove last series</button>
                </div>
              ) : null}
            </div>
          )}
        </details>
      </div>
    </NodeViewWrapper>
  );
}

export const ChartBlock = ChartBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ChartView);
  },
});
