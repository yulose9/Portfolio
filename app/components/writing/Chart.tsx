"use client";

import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";

import { isNumeric, toNumber, type ChartType } from "../../../cms/blocks";

/*
 * A chart block: bar, line, area, pie or donut, after shadcn's charts, drawn
 * by Recharts. Recharts is loaded only when a chart scrolls near, so an
 * article without one never downloads it. The figure is named by a one-line
 * summary of the data, and the data itself stays on the page as a table
 * under "Show data" (the same table GitHub and the feed show).
 */

const ChartCanvas = lazy(() => import("./ChartCanvas"));

export type ChartSeries = { key: string; label: string };
export type ChartModel = { type: ChartType; labelKey: string; series: ChartSeries[]; data: Record<string, string | number>[] };

/** Rows (header first) → what Recharts draws. Non-numeric cells count as 0. */
export function chartModel(type: ChartType, rows: string[][]): ChartModel {
  const [head = [], ...body] = rows;
  const series = head.slice(1).map((label, i) => ({ key: `s${i}`, label: label || `Series ${i + 1}` }));
  const data = body.map((r) => {
    const point: Record<string, string | number> = { label: r[0] ?? "" };
    series.forEach((s, i) => (point[s.key] = isNumeric(r[i + 1] ?? "") ? toNumber(r[i + 1]) : 0));
    return point;
  });
  return { type, labelKey: "label", series: type === "pie" || type === "donut" ? series.slice(0, 1) : series.slice(0, 6), data };
}

function summary(title: string, m: ChartModel): string {
  const kind = { bar: "Bar chart", line: "Line chart", area: "Area chart", pie: "Pie chart", donut: "Donut chart" }[m.type];
  const parts = m.series.map((s) => {
    const values = m.data.map((d) => Number(d[s.key]));
    if (!values.length) return s.label;
    const max = Math.max(...values);
    const top = m.data[values.indexOf(max)]?.label;
    return `${s.label}: highest ${max.toLocaleString("en-US")} (${top})`;
  });
  return `${kind}${title ? `, ${title}` : ""}, ${m.data.length} points. ${parts.join("; ")}.`;
}

export default function Chart({ type, title, rows, children }: { type: ChartType; title?: string; rows: string[][]; children?: React.ReactNode }) {
  const model = chartModel(type, rows);
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const titleId = useId();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure className="chart-block" aria-labelledby={title ? titleId : undefined}>
      {title ? <figcaption id={titleId} className="chart-title">{title}</figcaption> : null}
      <div ref={box} className="chart-canvas" role="img" aria-label={summary(title ?? "", model)} data-type={type}>
        {near ? (
          <Suspense fallback={<div className="chart-skeleton" />}>
            <ChartCanvas model={model} />
          </Suspense>
        ) : (
          <div className="chart-skeleton" />
        )}
      </div>
      {children ? (
        <details className="chart-data">
          <summary>Show data</summary>
          {children}
        </details>
      ) : null}
    </figure>
  );
}
