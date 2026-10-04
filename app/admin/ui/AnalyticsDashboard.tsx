"use client";
import { useEffect, useState } from "react";
import { Table } from "@cloudflare/kumo/components/table";
import { Button } from "@cloudflare/kumo/components/button";
import { ArrowClockwise, ArrowUpRight, ChartLine, CalendarBlank } from "@phosphor-icons/react";
import { Popover } from "@base-ui/react/popover";
import { Calendar } from "../../components/kit/inputs/calendar";
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
  const [metric, setMetric] = useState<"views" | "visitors">("views");
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
  const days = report?.days ?? [];
  const max = Math.max(1, ...days.map((day) => day[metric]));
  const path = days
    .map(
      (day, i) =>
        `${i ? "L" : "M"}${((i / Math.max(1, days.length - 1)) * 960).toFixed(2)},${(160 - (day[metric] / max) * 144).toFixed(2)}`,
    )
    .join(" ");
  return (
    <div className="control-page cc-page">
      <PageHeader
        title={overview ? "Overview" : "Analytics"}
        subtitle={
          overview
            ? "A clear view of your site, and what to do next."
            : "Understand what brings people here and what holds their attention."
        }
        actions={
          <Button variant="primary" onClick={onWrite}>
            Open writing <ArrowUpRight size={16} />
          </Button>
        }
      />
      {overview && <OverviewPublishing onNavigate={onNavigate} />}
      <div className="control-toolbar">
        <div className="control-segments" aria-label="Date presets">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => {
                setRange({ ...initialAnalyticsRange(days), scope: range.scope });
                playSound("tap");
              }}
            >
              {days} days
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
        <>
          <div className="control-metrics">
            {(
              [
                ["Measured visits", "visits"],
                ["Page views", "views"],
                ["Engaged visits", "engaged"],
                ["Meaningful actions", "actions"],
              ] as const
            ).map(([label, key]) => (
              <section key={key}>
                <h2>{label}</h2>
                <strong>{number(report.totals[key])}</strong>
                <span>
                  {comparison(report.totals[key], report.previous[key])}
                </span>
              </section>
            ))}
          </div>
          <section className="control-panel">
            <div className="control-panel-heading">
              <div>
                <h2>Traffic over time</h2>
                <p>
                  {metric === "visitors"
                    ? "Daily visitor estimates; not distinct visitors across the whole period."
                    : "Page views across the selected period."}
                </p>
              </div>
              <div className="control-segments">
                {(["views", "visitors"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={metric === value}
                    onClick={() => setMetric(value)}
                  >
                    {value === "views" ? "Views" : "Visitors"}
                  </button>
                ))}
              </div>
            </div>
            {days.length ? (
              <svg
                className="control-chart"
                viewBox="0 0 960 180"
                role="img"
                aria-label={`${metric} over time; exact values in the table below`}
              >
                <path
                  d="M0 160 H960 M0 88 H960 M0 16 H960"
                  className="control-chart-grid"
                />
                <path d={path} className="control-chart-line" />
              </svg>
            ) : (
              <p className="control-empty-inline">
                No measured traffic in this period.
              </p>
            )}
            <details className="control-chart-data">
              <summary>View chart data</summary>
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
                      <Table.Cell>{day.views}</Table.Cell>
                      <Table.Cell>{day.visitors}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </details>
          </section>
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
            ).map(([kind, title]) => (
              <section className="control-panel" key={kind}>
                <h2>{title}</h2>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>
                        {kind === "page" ? "Page" : "Name"}
                      </Table.Head>
                      <Table.Head>Events</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {report.breakdowns
                      .filter((row) => row.kind === kind)
                      .slice(0, overview ? 5 : 15)
                      .map((row) => (
                        <Table.Row key={row.label}>
                          <Table.Cell>
                            {kind === "page" &&
                            // Visitor-supplied: "/\evil.com" or "/\t/evil.com" would leave the site.
                            /^\/(?:[^/\\\s][^\\\s]*)?$/.test(row.label) ? (
                              <a
                                href={row.label}
                                target="_blank"
                                rel="noreferrer"
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
                {!report.breakdowns.some((row) => row.kind === kind) && (
                  <p className="control-empty-inline">
                    No measured activity yet.
                  </p>
                )}
              </section>
            ))}
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
              {report.journeys.map((journey) => (
                <section className="control-panel" key={journey.name}>
                  <h2>{journey.name}</h2>
                  <p>
                    Ordered steps within the same measured visit, across all
                    content.
                  </p>
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
                </section>
              ))}
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
        </>
      )}
    </div>
  );
}
