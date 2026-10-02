"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import type { ChartModel } from "./Chart";

/* Recharts, in shadcn's chart manner: hairline grid, no axis lines, a small card tooltip. Strokes are theme tokens (globals.css), so the chart follows dark mode. */

const COLORS = ["var(--chart-2)", "var(--chart-5)", "var(--chart-3)", "var(--chart-1)", "var(--chart-4)", "#a1a1aa"];
const fmt = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v ?? ""));

function Tip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && payload.length > 1 ? <p className="chart-tooltip-label">{String(label)}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-row">
          <span className="chart-swatch" style={{ background: String(p.color ?? (p.payload as { fill?: string })?.fill ?? COLORS[i]) }} />
          <span>{payload.length > 1 ? p.name : String(p.name ?? label)}</span>
          <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export default function ChartCanvas({ model }: { model: ChartModel }) {
  const { type, data, series, labelKey } = model;
  const axis = { tickLine: false, axisLine: false, tickMargin: 8, fontSize: 12, stroke: "var(--fg-3)" } as const;
  const legend = series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} /> : null;
  const grid = <CartesianGrid vertical={false} stroke="var(--line)" />;
  const tooltip = <Tooltip cursor={{ fill: "rgb(var(--tint) / 0.04)", stroke: "var(--line-strong)" }} content={<Tip />} />;

  if (type === "pie" || type === "donut") {
    const s = series[0];
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip content={<Tip />} />
          <Pie data={data} dataKey={s?.key ?? "s0"} nameKey={labelKey} innerRadius={type === "donut" ? "55%" : 0} outerRadius="85%" paddingAngle={type === "donut" ? 2 : 0} stroke="var(--paper)" strokeWidth={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey={labelKey} {...axis} />
          <YAxis width={44} {...axis} tickFormatter={fmt} />
          {tooltip}
          {legend}
          {series.map((s, i) => <Line key={s.key} dataKey={s.key} name={s.label} type="natural" stroke={COLORS[i]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />)}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey={labelKey} {...axis} />
          <YAxis width={44} {...axis} tickFormatter={fmt} />
          {tooltip}
          {legend}
          {series.map((s, i) => <Area key={s.key} dataKey={s.key} name={s.label} type="natural" stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.18} strokeWidth={2} />)}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        {grid}
        <XAxis dataKey={labelKey} {...axis} />
        <YAxis width={44} {...axis} tickFormatter={fmt} />
        {tooltip}
        {legend}
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={40} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
