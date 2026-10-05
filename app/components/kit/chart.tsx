"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "../../lib/cn";

// Format: { [key: string]: { label?: React.ReactNode; color?: string; icon?: React.ComponentType } }
export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string; size?: number }>;
    color?: string;
    theme?: Record<string, string>;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactElement;
  aspectRatio?: number;
  height?: number | string;
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, aspectRatio, height = 260, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    // Generate CSS variables for series colors
    const styleVariables = React.useMemo(() => {
      const vars: Record<string, string> = {};
      Object.entries(config).forEach(([key, item]) => {
        if (item.color) {
          vars[`--color-${key}`] = item.color;
        }
      });
      return vars;
    }, [config]);

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-slot="chart"
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--control-muted,#697181)] [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[var(--control-line,#e1e5ec)]",
            className
          )}
          style={{ ...styleVariables, height: typeof height === "number" ? `${height}px` : height, ...props.style }}
          {...props}
        >
          <ResponsiveContainer width="100%" height="100%" aspect={aspectRatio}>
            {children}
          </ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = RechartsTooltip;

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  labelFormatter?: (label: any, payload: any[]) => React.ReactNode;
  formatter?: (value: any, name: any, item: any, index: number, payload: any[]) => React.ReactNode;
  color?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "dot" | "line" | "dashed";
  className?: string;
}

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      formatter,
      color,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload || !payload.length) {
      return null;
    }

    const renderLabel = () => {
      if (hideLabel || (!label && label !== 0)) return null;
      if (labelFormatter) {
        return <div className="font-medium text-[var(--control-ink,#20232b)] mb-1">{labelFormatter(label, payload)}</div>;
      }
      return <div className="font-medium text-[var(--control-ink,#20232b)] mb-1">{label}</div>;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8.5rem] items-start gap-1.5 rounded-lg border border-[var(--control-line,#e1e5ec)] bg-[var(--control-surface,#ffffff)] px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-all duration-150 ease-out",
          className
        )}
        style={{
          boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        }}
      >
        {renderLabel()}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = item.dataKey || item.name || "value";
            const itemConfig = config[key] || {};
            const itemColor = color || item.color || item.fill || itemConfig.color || "var(--control-accent,#2456d9)";
            const itemName = itemConfig.label || item.name || key;

            return (
              <div
                key={`${key}-${index}`}
                className="flex w-full items-center justify-between gap-3 text-[12px]"
              >
                <div className="flex items-center gap-1.5">
                  {!hideIndicator && (
                    <span
                      className={cn(
                        "inline-block shrink-0",
                        indicator === "dot" && "h-2 w-2 rounded-full",
                        indicator === "line" && "h-0.5 w-3 rounded-sm",
                        indicator === "dashed" && "h-0.5 w-3 border-b-2 border-dashed"
                      )}
                      style={{
                        backgroundColor: indicator !== "dashed" ? itemColor : undefined,
                        borderColor: itemColor,
                      }}
                    />
                  )}
                  <span className="text-[var(--control-muted,#697181)] capitalize">
                    {itemName}
                  </span>
                </div>
                {formatter ? (
                  formatter(item.value, item.name, item, index, payload)
                ) : (
                  <span className="font-semibold text-[var(--control-ink,#20232b)] tabular-nums">
                    {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";
