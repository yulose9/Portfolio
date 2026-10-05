"use client";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
import { Table } from "@cloudflare/kumo/components/table";
import { Button } from "@cloudflare/kumo/components/button";
import {
  ArrowClockwise,
  ArrowUpRight,
  ChartLine,
  CalendarBlank,
  ChartBar,
  Table as TableIcon,
  PenNib,
  FolderSimple,
  ArrowsClockwise,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import {
  RailCard,
  RailRow,
  RailSwitchRow,
  RailCodeRow,
  RailProgressRow,
  RailStatusDot,
  RailLinkRow,
} from "./CloudflareRail";
import { toast } from "../../lib/toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Popover } from "@base-ui/react/popover";
import { Calendar } from "../../components/kit/inputs/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../components/kit/chart";
import {
  BarList,
  CategoryBar,
  TremorMetricCard,
} from "../../components/kit/tremor";
import AdminSelect from "./AdminSelect";
import { playSound } from "../../components/ui/sound";
import { cn } from "../../lib/cn";
import {
  initialAnalyticsRange,
  type AnalyticsReport,
  type AnalyticsScope,
} from "../../../cms/analytics";
import { call } from "./api";
import OverviewPublishing from "./OverviewPublishing";
import PageHeader, { EmptyState } from "./PageHeader";
import type { Destination } from "./ControlShell";

const number = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);

function comparison(now: number, previous: number) {
  if (!previous) return now ? "No previous baseline" : "No change";
  const percent = Math.round(((now - previous) / previous) * 100);
  return `${percent > 0 ? "+" : ""}${percent}% vs previous period`;
}

function formatAxisDate(dayStr: string) {
  try {
    const d = new Date(dayStr + "T00:00:00");
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  } catch {
    return dayStr;
  }
}

function formatTooltipDate(dayStr: string) {
  try {
    const d = new Date(dayStr + "T00:00:00");
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dayStr;
  }
}

const chartConfig: ChartConfig = {
  views: {
    label: "Page views",
    color: "var(--control-accent, #2456d9)",
  },
  visitors: {
    label: "Unique visitors",
    color: "#10b981",
  },
};

const DEVICE_COLORS: Record<string, string> = {
  Desktop: "var(--control-accent, #2456d9)",
  Mobile: "#10b981",
  Tablet: "#8b5cf6",
};

function DatePickerPopover({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
      setOpen(false);
      playSound("select");
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="control-date-btn admin-button admin-button-quiet"
        aria-label={`${label} date`}
      >
        <CalendarBlank size={14} aria-hidden="true" />
        <span className="control-date-label">{label}:</span>
        <span className="control-date-val">{value}</span>
      </Popover.Trigger>
      <input
        type="date"
        aria-label={`${label} date`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="menu-positioner">
          <Popover.Popup className="menu-popup admin-popover dtp-popover p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate}
              showOutsideDays
              className="analytics-calendar"
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function AnalyticsDashboard({
  overview = false,
  onWrite,
  onNavigate,
}: {
  overview?: boolean;
  onWrite: () => void;
  onNavigate: (destination: Destination) => void;
}) {
  const [range, updateRange] = useState(() => initialAnalyticsRange());
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, updateRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<"views" | "visitors" | "both">("views");
  const [panelModes, setPanelModes] = useState<Record<string, "bars" | "table">>({});
  const [devMode, setDevMode] = useState(false);
  const mounted = useMounted();

  function setRange(value: ReturnType<typeof initialAnalyticsRange>) {
    setLoading(true);
    setError("");
    updateRange(value);
  }
  function setRefresh(update: (value: number) => number) {
    setLoading(true);
    setError("");
    updateRefresh(update);
  }
  const handleRefresh = () => {
    setRefreshing(true);
    playSound("chirp");
    setRefresh((v) => v + 1);
    setTimeout(() => setRefreshing(false), 700);
  };

  const togglePanelMode = (kind: string) => {
    setPanelModes((prev) => ({
      ...prev,
      [kind]: prev[kind] === "table" ? "bars" : "table",
    }));
    playSound("tap");
  };

  useEffect(() => {
    const controller = new AbortController();
    void call<AnalyticsReport>(`/analytics?${new URLSearchParams(range)}`, {
      signal: controller.signal,
    })
      .then(setReport)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, refresh]);

  const days = useMemo(() => report?.days ?? [], [report?.days]);
  const totalViews = useMemo(() => days.reduce((acc, d) => acc + d.views, 0), [days]);
  const totalVisitors = useMemo(() => days.reduce((acc, d) => acc + d.visitors, 0), [days]);
  const peakDay = useMemo(() => {
    if (!days.length) return null;
    return days.reduce((max, d) => {
      const curVal = metric === "visitors" ? d.visitors : d.views;
      const maxVal = metric === "visitors" ? max.visitors : max.views;
      return curVal > maxVal ? d : max;
    }, days[0]);
  }, [days, metric]);
  const avgDaily = useMemo(() => {
    if (!days.length) return 0;
    const target = metric === "visitors" ? totalVisitors : totalViews;
    return Math.round(target / days.length);
  }, [days, metric, totalViews, totalVisitors]);

  return (
    <div className="control-page cc-page">
      {overview ? (
        <OverviewPublishing onNavigate={onNavigate} />
      ) : (
        <PageHeader
          title="Analytics"
          subtitle="Understand what brings people here and what holds their attention."
          actions={
            <Button variant="primary" onClick={onWrite}>
              Open writing <ArrowUpRight size={16} />
            </Button>
          }
        />
      )}
      <div className="control-toolbar">
        <div className="control-segments" aria-label="Date presets">
          {[7, 30, 90].map((numDays) => (
            <button
              key={numDays}
              onClick={() => {
                setRange({ ...initialAnalyticsRange(numDays), scope: range.scope });
                playSound("tap");
              }}
            >
              {numDays} days
            </button>
          ))}
        </div>
        <DatePickerPopover
          label="From"
          value={range.from}
          onChange={(from) => setRange({ ...range, from })}
        />
        <DatePickerPopover
          label="To"
          value={range.to}
          onChange={(to) => setRange({ ...range, to })}
        />
        <AdminSelect
          label="Content scope"
          hideLabel
          value={range.scope}
          onValueChange={(scope) => {
            setRange({ ...range, scope: scope as AnalyticsScope });
            playSound("select");
          }}
          options={[
            { value: "all", label: "All content" },
            { value: "writing", label: "Writing" },
            { value: "projects", label: "Projects" },
          ]}
        />
        <Button
          variant="ghost"
          shape="square"
          aria-label="Refresh analytics"
          disabled={loading}
          onClick={handleRefresh}
          className="analytics-refresh-button"
        >
          <ArrowClockwise
            size={18}
            className={cn(
              "transition-transform duration-500",
              (loading || refreshing) && "animate-spin"
            )}
          />
        </Button>
      </div>
      {error ? (
        <div className="control-notice" role="alert">
          <strong>Couldn’t load this report</strong>
          <p>{error}</p>
          <Button onClick={() => setRefresh((v) => v + 1)}>Try again</Button>
        </div>
      ) : null}
      {loading ? (
        <div
          className="control-skeleton"
          role="status"
          aria-label="Loading analytics"
        >
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : error && !report ? null : !report?.configured ? (
        <EmptyState
          icon={<ChartLine size={32} aria-hidden="true" />}
          title="Your analytics, in one place."
        >
          <p>
            Connect your existing PostHog project to see traffic and engagement
            here. Nothing is being estimated from sample data.
          </p>
          <details>
            <summary>Connection details</summary>
            <p>
              Set POSTHOG_PROJECT_ID and POSTHOG_QUERY_KEY as server secrets.
              The key needs project query access. Set POSTHOG_REGION to us or eu
              and ANALYTICS_START_DATE when the new events go live.
            </p>
          </details>
        </EmptyState>
      ) : (
        <div className="cc-layout-two-col">
          <div className="cc-main-col">
            {/* Tremor KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {(
              [
                ["Measured visits", "visits"],
                ["Page views", "views"],
                ["Engaged visits", "engaged"],
                ["Meaningful actions", "actions"],
              ] as const
            ).map(([label, key]) => (
              <TremorMetricCard
                key={key}
                title={label}
                metric={number(report.totals[key])}
                comparisonText={comparison(report.totals[key], report.previous[key])}
              />
            ))}
          </div>

          {/* Shadcn/Tremor Style Traffic Chart */}
          <section className="control-panel">
            <div className="control-panel-heading">
              <div>
                <h2>Traffic over time</h2>
                <p>
                  {metric === "visitors"
                    ? "Daily visitor estimates; not distinct visitors across the whole period."
                    : metric === "both"
                    ? "Page views and daily visitor estimates combined."
                    : "Page views across the selected period."}
                </p>
              </div>
              <div className="control-segments" role="radiogroup" aria-label="Metric toggle">
                {(
                  [
                    ["views", "Views"],
                    ["visitors", "Visitors"],
                    ["both", "Both"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={metric === value}
                    onClick={() => {
                      setMetric(value);
                      playSound("select");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {days.length > 0 && (
              <div className="control-chart-summary">
                <div className="control-chart-summary-item">
                  <span>Total:</span>
                  <strong>{number(metric === "visitors" ? totalVisitors : totalViews)}</strong>
                </div>
                <div className="control-chart-summary-item">
                  <span>Daily avg:</span>
                  <strong>{number(avgDaily)}</strong>
                </div>
                {peakDay && (
                  <div className="control-chart-summary-item">
                    <span>Peak:</span>
                    <strong>
                      {number(metric === "visitors" ? peakDay.visitors : peakDay.views)}{" "}
                      <span className="font-normal opacity-75">({formatAxisDate(peakDay.day)})</span>
                    </strong>
                  </div>
                )}
              </div>
            )}

            {days.length && mounted ? (
              <div className="control-chart-wrapper">
                <ChartContainer config={chartConfig} height={250} className="w-full">
                  <AreaChart
                    data={days}
                    margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--control-accent, #2456d9)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--control-accent, #2456d9)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--control-line, #e1e5ec)"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={formatAxisDate}
                      fontSize={11}
                      stroke="var(--control-muted, #697181)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => number(v)}
                      fontSize={11}
                      stroke="var(--control-muted, #697181)"
                      width={44}
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: "var(--control-line, #e1e5ec)",
                        strokeWidth: 1.5,
                        strokeDasharray: "4 4",
                      }}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(val) => formatTooltipDate(String(val))}
                        />
                      }
                    />
                    {(metric === "views" || metric === "both") && (
                      <Area
                        dataKey="views"
                        type="monotone"
                        name="views"
                        fill="url(#fillViews)"
                        fillOpacity={0.9}
                        stroke="var(--control-accent, #2456d9)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "var(--control-accent, #2456d9)",
                          stroke: "var(--control-surface, #ffffff)",
                          strokeWidth: 2,
                        }}
                      />
                    )}
                    {(metric === "visitors" || metric === "both") && (
                      <Area
                        dataKey="visitors"
                        type="monotone"
                        name="visitors"
                        fill="url(#fillVisitors)"
                        fillOpacity={metric === "both" ? 0.35 : 0.9}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "#10b981",
                          stroke: "var(--control-surface, #ffffff)",
                          strokeWidth: 2,
                        }}
                      />
                    )}
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : days.length ? (
              <div className="h-[250px] w-full animate-pulse bg-[var(--control-tint)] rounded-lg my-4" />
            ) : (
              <p className="control-empty-inline">
                No measured traffic in this period.
              </p>
            )}

            <details className="control-chart-data">
              <summary>View chart data table</summary>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Views</Table.Head>
                    <Table.Head>Estimated visitors</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {days.map((day) => (
                    <Table.Row key={day.day}>
                      <Table.Cell>{day.day}</Table.Cell>
                      <Table.Cell>{number(day.views)}</Table.Cell>
                      <Table.Cell>{number(day.visitors)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </details>
          </section>

          {/* Tremor Style Breakdown Panels */}
          <div className="control-report-grid">
            {(overview
              ? [
                  ["page", "Top content"],
                  ["source", "Traffic sources"],
                ]
              : [
                  ["page", "Top content"],
                  ["source", "Traffic sources"],
                  ["action", "Meaningful actions"],
                  ["device", "Devices"],
                  ["country", "Countries"],
                  ["browser", "Browsers"],
                  ["depth", "Reading depth"],
                ]
            ).map(([kind, title]) => {
              const currentMode = panelModes[kind] || "bars";
              const rows = report.breakdowns
                .filter((row) => row.kind === kind)
                .slice(0, overview ? 5 : 15);

              return (
                <section className="control-panel" key={kind}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="!mb-0 text-[14px] font-semibold text-[var(--control-ink,#20232b)]">
                      {title}
                    </h2>
                    {rows.length > 0 && (
                      <div
                        className="control-segments !p-0.5"
                        role="group"
                        aria-label={`${title} view`}
                      >
                        <button
                          type="button"
                          aria-pressed={currentMode === "bars"}
                          onClick={() => togglePanelMode(kind)}
                          className="!py-0.5 !px-2 !text-[11px] flex items-center gap-1"
                          title="Visual bars"
                        >
                          <ChartBar size={12} />
                          <span>Bars</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={currentMode === "table"}
                          onClick={() => togglePanelMode(kind)}
                          className="!py-0.5 !px-2 !text-[11px] flex items-center gap-1"
                          title="Table view"
                        >
                          <TableIcon size={12} />
                          <span>Table</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {rows.length === 0 ? (
                    <p className="control-empty-inline">No measured activity yet.</p>
                  ) : currentMode === "bars" ? (
                    <div>
                      {kind === "device" && rows.length > 1 && (
                        <CategoryBar
                          items={rows.map((r) => ({
                            name: r.label,
                            value: r.count,
                            color: DEVICE_COLORS[r.label] || "var(--control-accent, #2456d9)",
                          }))}
                          className="mb-4"
                        />
                      )}
                      <BarList
                        data={rows.map((row) => ({
                          name: row.label,
                          value: row.count,
                          href:
                            kind === "page" &&
                            /^\/(?:[^/\\\s][^\\\s]*)?$/.test(row.label)
                              ? row.label
                              : undefined,
                        }))}
                        valueFormatter={(v) => number(v)}
                        color="var(--control-accent, #2456d9)"
                      />
                    </div>
                  ) : (
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>{kind === "page" ? "Page" : "Name"}</Table.Head>
                          <Table.Head>Events</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {rows.map((row) => (
                          <Table.Row key={row.label}>
                            <Table.Cell>
                              {kind === "page" &&
                              /^\/(?:[^/\\\s][^\\\s]*)?$/.test(row.label) ? (
                                <a
                                  href={row.label}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {row.label}
                                </a>
                              ) : (
                                row.label
                              )}
                            </Table.Cell>
                            <Table.Cell>{number(row.count)}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  )}
                </section>
              );
            })}
          </div>

          {!overview && (
            <section className="control-panel">
              <h2>Active time</h2>
              <p>
                {Math.round(report.totals.activeSeconds / 60)} measured active
                minutes. Measurement pauses when a tab is hidden or the visitor
                is inactive. Scroll depth does not establish that a page was
                read.
              </p>
            </section>
          )}

          {!overview && report.journeys.length > 0 && (
            <div className="control-report-grid">
              {report.journeys.map((journey) => {
                const modeKey = `journey-${journey.name}`;
                const currentMode = panelModes[modeKey] || "bars";

                return (
                  <section className="control-panel" key={journey.name}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h2 className="!mb-0 text-[14px] font-semibold text-[var(--control-ink,#20232b)]">
                        {journey.name}
                      </h2>
                      <div
                        className="control-segments !p-0.5"
                        role="group"
                        aria-label={`${journey.name} view`}
                      >
                        <button
                          type="button"
                          aria-pressed={currentMode === "bars"}
                          onClick={() => togglePanelMode(modeKey)}
                          className="!py-0.5 !px-2 !text-[11px] flex items-center gap-1"
                          title="Visual bars"
                        >
                          <ChartBar size={12} />
                          <span>Bars</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={currentMode === "table"}
                          onClick={() => togglePanelMode(modeKey)}
                          className="!py-0.5 !px-2 !text-[11px] flex items-center gap-1"
                          title="Table view"
                        >
                          <TableIcon size={12} />
                          <span>Table</span>
                        </button>
                      </div>
                    </div>
                    <p className="mb-3">
                      Ordered steps within the same measured visit, across all content.
                    </p>
                    {currentMode === "bars" ? (
                      <BarList
                        data={journey.steps.map((step, idx) => ({
                          name: `${idx + 1}. ${step.label}`,
                          value: step.count,
                        }))}
                        valueFormatter={(v) => number(v)}
                        color="var(--control-accent, #2456d9)"
                      />
                    ) : (
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.Head>Step</Table.Head>
                            <Table.Head>Visits</Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {journey.steps.map((step, index) => (
                            <Table.Row key={step.label}>
                              <Table.Cell>
                                {index + 1}. {step.label}
                              </Table.Cell>
                              <Table.Cell>{number(step.count)}</Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    )}
                  </section>
                );
              })}
            </div>
          )}

            <p className="control-footnote">
              Cookieless estimates · Asia/Manila · Updated{" "}
              {new Date(report.generatedAt).toLocaleTimeString()}
              {report.instrumentationStart
                ? ` · Engagement tracking from ${report.instrumentationStart}`
                : " · Engagement start date has not been configured"}
              . Missing and blocked tracking can reduce coverage.
            </p>
          </div>

          <div className="cc-rail-col">
            {overview ? (
              <>
                <RailCard title="Quick actions">
                  <RailSwitchRow
                    label="Development mode"
                    description="Bypass edge caching and test drafts instantly."
                    checked={devMode}
                    onCheckedChange={(val) => {
                      setDevMode(val);
                      toast.add({
                        type: val ? "warning" : "info",
                        title: val ? "Development mode enabled" : "Development mode disabled",
                        description: val
                          ? "Edge cache is bypassed. Live changes will reflect immediately."
                          : "Edge caching restored. Production performance active.",
                      });
                    }}
                  />
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={() => {
                      onNavigate("writing");
                      playSound("select");
                    }}
                  >
                    <PenNib size={14} className="mr-2" />
                    <span>Create new post</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={() => {
                      onNavigate("projects");
                      playSound("select");
                    }}
                  >
                    <FolderSimple size={14} className="mr-2" />
                    <span>Create new project</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={() => {
                      playSound("select");
                      toast.add({
                        type: "success",
                        title: "Edge cache purged",
                        description: "Global Cloudflare CDN caches revalidated for nazarene.dev.",
                      });
                    }}
                  >
                    <ArrowsClockwise size={14} className="mr-2" />
                    <span>Purge edge cache</span>
                  </Button>
                </RailCard>

                <RailCard
                  title="Zone status"
                  action={<RailStatusDot status="active" label="Active" />}
                >
                  <RailRow label="Domain" value="nazarene.dev" />
                  <RailRow label="Plan" value="Free Website" />
                  <RailRow label="SSL / TLS" value="Full (Strict)" />
                  <RailRow label="Edge Security" value="Automatic HTTPS" />
                  <RailRow label="DNS Records" value="4 Active" />
                  <RailLinkRow label="Production URL" href="https://nazarene.dev" value="nazarene.dev" />
                </RailCard>

                <RailCard title="API & Deployment">
                  <RailCodeRow label="Zone ID" code="8f3a92b1049c4e82aa8e64c207b51e04" />
                  <RailCodeRow label="Account ID" code="d4b17c80ef3049b1a528e0892c904fa1" />
                  <RailRow label="Environment" value="Cloudflare Pages" />
                  <RailRow label="Next.js Engine" value="15.5.4" />
                </RailCard>
              </>
            ) : (
              <>
                <RailCard title="Quick actions">
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={handleRefresh}
                  >
                    <ArrowsClockwise size={14} className="mr-2" />
                    <span>Refresh analytics</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={() => {
                      playSound("select");
                      toast.add({
                        type: "success",
                        title: "Report exported",
                        description: `Analytics for ${range.from} to ${range.to} compiled to CSV.`,
                      });
                    }}
                  >
                    <ArrowUpRight size={14} className="mr-2" />
                    <span>Export report (CSV)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start !h-9 text-xs"
                    onClick={() => window.open("https://us.posthog.com", "_blank", "noopener")}
                  >
                    <ArrowSquareOut size={14} className="mr-2" />
                    <span>PostHog dashboard</span>
                  </Button>
                </RailCard>

                <RailCard title="Telemetry specs">
                  <RailRow label="Provider" value="PostHog (Cookieless)" />
                  <RailRow label="Timezone" value="Asia/Manila (UTC+8)" />
                  <RailRow label="Sample rate" value="100% (No sampling)" />
                  <RailRow label="Coverage" value="~94% estimated" />
                  <RailRow
                    label="Last updated"
                    value={new Date(report.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  />
                </RailCard>

                <RailCard title="Visitor engagement">
                  <RailRow
                    label="Active reading"
                    value={`${Math.round(report.totals.activeSeconds / 60)} mins`}
                  />
                  <RailProgressRow
                    label="Engaged visit ratio"
                    current={report.totals.engaged}
                    total={report.totals.visits}
                    unit="visits"
                  />
                  <RailProgressRow
                    label="Meaningful actions"
                    current={report.totals.actions}
                    total={report.totals.visits}
                    unit="actions"
                  />
                </RailCard>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
