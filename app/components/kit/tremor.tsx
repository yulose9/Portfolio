"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Minus, ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

/* -------------------------------------------------------------------------
 * Tremor BarList Component
 * Visualizes ranked categorical data with animated relative horizontal bars.
 * ------------------------------------------------------------------------- */

export interface BarListItem {
  name: string;
  value: number;
  href?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  color?: string;
}

export interface BarListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: BarListItem[];
  valueFormatter?: (value: number) => string;
  color?: string;
  showPercentage?: boolean;
  emptyMessage?: string;
  maxItems?: number;
}

export function BarList({
  data,
  valueFormatter = (val: number) => val.toLocaleString(),
  color = "var(--control-accent, #2456d9)",
  showPercentage = true,
  emptyMessage = "No data available",
  maxItems,
  className,
  ...props
}: BarListProps) {
  const items = maxItems ? data.slice(0, maxItems) : data;
  const maxValue = React.useMemo(() => {
    return Math.max(...data.map((item) => item.value), 1);
  }, [data]);

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, item) => acc + item.value, 0) || 1;
  }, [data]);

  if (!items.length) {
    return (
      <div className="py-6 text-center text-xs text-[var(--control-muted,#697181)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      data-slot="bar-list"
      className={cn("flex flex-col space-y-2.5 w-full", className)}
      {...props}
    >
      {items.map((item, index) => {
        const percentage = Math.round((item.value / totalValue) * 100);
        const barWidth = Math.max(3, Math.round((item.value / maxValue) * 100));
        const itemColor = item.color || color;

        return (
          <div
            key={`${item.name}-${index}`}
            className="group relative flex flex-col justify-center rounded-lg p-1.5 transition-colors duration-150 hover:bg-[var(--control-tint,#f1f3f7)]"
          >
            {/* Top row: Name & Value */}
            <div className="flex items-center justify-between gap-3 text-xs mb-1.5 z-10">
              <div className="flex items-center gap-1.5 min-w-0 max-w-[75%]">
                {item.icon && (
                  <item.icon
                    size={14}
                    className="shrink-0 text-[var(--control-muted,#697181)] group-hover:text-[var(--control-ink,#20232b)] transition-colors"
                  />
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate font-medium text-[var(--control-ink,#20232b)] hover:text-[var(--control-accent,#2456d9)] hover:underline decoration-[var(--control-accent,#2456d9)] underline-offset-2 transition-colors"
                  >
                    <span className="truncate">{item.name}</span>
                    <ArrowUpRight
                      size={12}
                      className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    />
                  </a>
                ) : (
                  <span
                    className="truncate font-medium text-[var(--control-ink,#20232b)]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="font-semibold text-[var(--control-ink,#20232b)]">
                  {valueFormatter(item.value)}
                </span>
                {showPercentage && (
                  <span className="text-[11px] text-[var(--control-muted,#697181)] opacity-75">
                    {percentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Bottom row: Smooth Progress Bar Track */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--control-tint,#f1f3f7)] dark:bg-[var(--control-line,#37393e)]/50">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: itemColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Tremor CategoryBar Component
 * Multi-segment proportional visualizer for categories (e.g. Device breakdown)
 * ------------------------------------------------------------------------- */

export interface CategoryBarItem {
  name: string;
  value: number;
  color: string;
}

export interface CategoryBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CategoryBarItem[];
  showLegend?: boolean;
  valueFormatter?: (val: number) => string;
}

export function CategoryBar({
  items,
  showLegend = true,
  valueFormatter = (v) => v.toLocaleString(),
  className,
  ...props
}: CategoryBarProps) {
  const total = React.useMemo(
    () => items.reduce((acc, cur) => acc + cur.value, 0) || 1,
    [items]
  );

  return (
    <div className={cn("w-full flex flex-col gap-2.5", className)} {...props}>
      {/* Segmented bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--control-tint,#f1f3f7)] gap-0.5 p-0.5">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={i}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: item.color,
              }}
              title={`${item.name}: ${valueFormatter(item.value)} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--control-muted,#697181)]">
          {items.map((item, i) => {
            const pct = Math.round((item.value / total) * 100);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-[var(--control-ink,#20232b)]">{item.name}</span>
                <span className="tabular-nums opacity-75">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Tremor MetricCard Component
 * Modern KPI card with uppercase subhead, tabular figures, and delta badge.
 * ------------------------------------------------------------------------- */

export interface TremorMetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  metric: string | number;
  comparisonText?: string;
  sparklineData?: number[];
  variant?: "default" | "active";
}

export function TremorMetricCard({
  title,
  metric,
  comparisonText,
  sparklineData,
  className,
  ...props
}: TremorMetricCardProps) {
  // Parse trend from comparisonText e.g. "+15% vs previous period"
  const isPositive = comparisonText?.startsWith("+");
  const isNegative = comparisonText?.startsWith("-");
  const isNeutral = !isPositive && !isNegative;

  return (
    <div
      data-slot="metric-card"
      className={cn(
        "group relative flex flex-col justify-between p-5 rounded-xl border border-[var(--control-line,#e1e5ec)] bg-[var(--control-surface,#ffffff)] transition-all duration-150 hover:border-[var(--control-muted,#697181)]/40 hover:shadow-sm active:scale-[0.99]",
        className
      )}
      {...props}
    >
      <div>
        <h3 className="text-[11px] font-semibold tracking-wider uppercase text-[var(--control-muted,#697181)] mb-1.5">
          {title}
        </h3>
        <div className="text-3xl font-semibold tracking-tight text-[var(--control-ink,#20232b)] tabular-nums">
          {metric}
        </div>
      </div>

      {comparisonText && (
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px]">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium text-[11px] tabular-nums shrink-0",
              isPositive && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              isNegative && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              isNeutral && "bg-[var(--control-tint,#f1f3f7)] text-[var(--control-muted,#697181)]"
            )}
          >
            {isPositive && <ArrowUp size={11} weight="bold" />}
            {isNegative && <ArrowDown size={11} weight="bold" />}
            {isNeutral && <Minus size={11} />}
            {comparisonText.split(" ")[0]}
          </span>
          <span className="text-[var(--control-muted,#697181)] truncate">
            {comparisonText.split(" ").slice(1).join(" ") || "vs previous period"}
          </span>
        </div>
      )}
    </div>
  );
}
