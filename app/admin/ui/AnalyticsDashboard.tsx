"use client";
import { useEffect, useState } from "react";
import { Table } from "@cloudflare/kumo/components/table";
import { Button } from "@cloudflare/kumo/components/button";
import { ArrowClockwise, ArrowUpRight, ChartLine } from "@phosphor-icons/react";
import {
  initialAnalyticsRange,
  type AnalyticsReport,
  type AnalyticsScope,
} from "../../../cms/analytics";
import { call } from "./api";
import OverviewPublishing from "./OverviewPublishing";
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
    <div className="control-page">
      <header className="control-heading">
        <div>
          <p className="control-eyebrow">
            nazarene.dev /{" "}
            {overview ? "Your workspace" : "Audience & engagement"}
          </p>
          <h1>{overview ? "Overview" : "Analytics"}</h1>
          <p>
            {overview
              ? "A clear view of your site, and what to do next."
              : "Understand what brings people here and what holds their attention."}
          </p>
        </div>
        <Button variant="primary" onClick={onWrite}>
          Open writing <ArrowUpRight size={16} />
        </Button>
      </header>
      {overview && <OverviewPublishing onNavigate={onNavigate} />}
      <div className="control-toolbar">
        <div className="control-segments" aria-label="Date presets">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() =>
                setRange({ ...initialAnalyticsRange(days), scope: range.scope })
              }
            >
              {days} days
            </button>
          ))}
        </div>
        <label className="control-date">
          From
          <input
            aria-label="From date"
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </label>
        <label className="control-date">
          To
          <input
            aria-label="To date"
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </label>
        <select
          aria-label="Content type"
          value={range.scope}
          onChange={(e) =>
            setRange({ ...range, scope: e.target.value as AnalyticsScope })
          }
        >
          <option value="all">All content</option>
          <option value="writing">Writing</option>
          <option value="projects">Projects</option>
        </select>
        <Button
          variant="ghost"
          shape="square"
          aria-label="Refresh analytics"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          <ArrowClockwise size={18} />
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
        <section className="control-empty">
          <ChartLine size={32} />
          <h2>Your analytics, in one place.</h2>
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
        </section>
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
