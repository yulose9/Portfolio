import { analyticsRange, type AnalyticsReport } from "../analytics";
import { HttpError } from "./http";
import type { AdminEnv } from "./http";

export async function analyticsReport(
  env: AdminEnv,
  input: URLSearchParams,
): Promise<AnalyticsReport> {
  let range: ReturnType<typeof analyticsRange>;
  try {
    range = analyticsRange(
      input.get("from") ?? "",
      input.get("to") ?? "",
      input.get("scope") ?? "all",
    );
  } catch (e) {
    throw new HttpError((e as Error).message);
  }
  const empty = {
    views: 0,
    visits: 0,
    engaged: 0,
    actions: 0,
    activeSeconds: 0,
  };
  const report: AnalyticsReport = {
    configured: false,
    generatedAt: new Date().toISOString(),
    instrumentationStart: env.ANALYTICS_START_DATE ?? null,
    range,
    days: [],
    totals: { ...empty },
    previous: { ...empty },
    breakdowns: [],
    journeys: [],
  };
  const rawProjectId = env.POSTHOG_PROJECT_ID?.trim().replace(/^['"]|['"]$/g, "");
  const rawQueryKey = env.POSTHOG_QUERY_KEY?.trim().replace(/^['"]|['"]$/g, "");
  const cleanKey = rawQueryKey?.replace(/^Bearer\s+/i, "");

  if (!cleanKey || !rawProjectId) return report;
  if (!/^\d+$/.test(rawProjectId))
    throw new HttpError(
      `Analytics project configuration is invalid: POSTHOG_PROJECT_ID must be the numeric project ID from PostHog Project Settings, not a key.`,
      503,
    );
  const rawRegion = env.POSTHOG_REGION?.trim().toLowerCase();
  const isEu = rawRegion === "eu" || !!rawRegion?.includes("eu.") || !!rawRegion?.includes("eu-");
  const host = isEu ? "https://eu.posthog.com" : "https://us.posthog.com";
  const regionSlug = isEu ? "eu" : "us";
  const cacheKey = `analytics/v2/${regionSlug}/${rawProjectId}/${range.scope}/${range.from}/${range.to}.json`;
  const cached = await env.WRITING.get(cacheKey);
  if (cached) {
    const value = await cached.json<AnalyticsReport>();
    if (Date.now() - Date.parse(value.generatedAt) < 300000) return value;
  }
  const previousFrom = new Date(Date.parse(range.from) - range.days * 86400000)
    .toISOString()
    .slice(0, 10);
  const scope =
    range.scope === "all"
      ? ""
      : `AND properties.$pathname LIKE '/${range.scope}/%'`;
  const window = `timestamp >= toDateTime('${previousFrom} 00:00:00', 'Asia/Manila') AND timestamp < toDateTime('${range.to} 00:00:00', 'Asia/Manila') + INTERVAL 1 DAY AND properties.$host = 'nazarene.dev' AND properties.$pathname NOT LIKE '/admin%' ${scope}`;
  const current = `timestamp >= toDateTime('${range.from} 00:00:00', 'Asia/Manila')`;
  async function query(sql: string): Promise<unknown[][]> {
    const response = await fetch(
      `${host}/api/projects/${rawProjectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query: sql },
          name: "Portfolio dashboard",
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!response.ok) {
      let detail = "";
      try {
        const errJson = (await response.json()) as { detail?: string; error?: string; message?: string };
        detail = errJson.detail || errJson.error || errJson.message || "";
      } catch {
        detail = await response.text().catch(() => "");
      }
      throw new HttpError(
        response.status === 429
          ? "Analytics is busy. Try again shortly."
          : `Analytics could not be loaded (PostHog ${response.status}): ${detail || "Check reporting credentials and project access."}`,
        503,
      );
    }
    const data = (await response.json()) as {
      results?: unknown[][];
      error?: string;
    };
    if (!Array.isArray(data.results) || data.error)
      throw new HttpError(`Analytics returned an incomplete report: ${data.error ?? "Invalid results format."}`, 503);
    return data.results;
  }
  // Fixed queries only: dates and scope are validated above; the browser cannot supply SQL.
  const daily = await query(
    `SELECT toString(toDate(toTimeZone(timestamp, 'Asia/Manila'))), count(), uniq(distinct_id) FROM events WHERE ${window} AND event = '$pageview' GROUP BY 1 ORDER BY 1`,
  );
  const visits = await query(
    `SELECT period, count(), countIf(active >= 10 OR actions > 0), sum(views), sum(actions), sum(active) FROM (SELECT if(${current}, 'current', 'previous') AS period, properties.$session_id AS session, countIf(event = '$pageview') AS views, countIf(event = 'portfolio_action') AS actions, sumIf(toFloatOrZero(properties.seconds), event = 'portfolio_active') AS active FROM events WHERE ${window} AND event IN ('$pageview', 'portfolio_action', 'portfolio_active') AND notEmpty(toString(properties.$session_id)) GROUP BY period, session) GROUP BY period`,
  );
  const breakdowns = await query(
    `SELECT kind, label, count() FROM (SELECT 'page' AS kind, toString(properties.$pathname) AS label FROM events WHERE ${window} AND ${current} AND event = '$pageview' UNION ALL SELECT 'source', if(empty(toString(properties.$referring_domain)), 'Direct / unknown', toString(properties.$referring_domain)) FROM events WHERE ${window} AND ${current} AND event = '$pageview' UNION ALL SELECT 'device', toString(properties.$device_type) FROM events WHERE ${window} AND ${current} AND event = '$pageview' UNION ALL SELECT 'country', toString(properties.$geoip_country_name) FROM events WHERE ${window} AND ${current} AND event = '$pageview' UNION ALL SELECT 'browser', toString(properties.$browser) FROM events WHERE ${window} AND ${current} AND event = '$pageview' UNION ALL SELECT 'action', toString(properties.action) FROM events WHERE ${window} AND ${current} AND event = 'portfolio_action' UNION ALL SELECT 'depth', concat(toString(properties.milestone), '%') FROM events WHERE ${window} AND ${current} AND event = 'portfolio_depth') GROUP BY kind, label ORDER BY count() DESC LIMIT 500`,
  );
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  report.configured = true;
  const dailyCounts = new Map(
    daily.map(([day, views, visitors]) => [
      String(day),
      { views: n(views), visitors: n(visitors) },
    ]),
  );
  report.days = Array.from({ length: range.days }, (_, index) => {
    const day = new Date(Date.parse(range.from) + index * 86400000)
      .toISOString()
      .slice(0, 10);
    return { day, ...(dailyCounts.get(day) ?? { views: 0, visitors: 0 }) };
  });
  for (const [period, count, engaged, views, actions, active] of visits) {
    report[period === "current" ? "totals" : "previous"] = {
      visits: n(count),
      engaged: n(engaged),
      views: n(views),
      actions: n(actions),
      activeSeconds: n(active),
    };
  }
  report.breakdowns = breakdowns.map(([kind, label, count]) => ({
    kind: String(kind),
    label: String(label || "Unknown"),
    count: n(count),
  }));
  const funnelWindow = window.slice(0, window.length - scope.length);
  const funnels = await query(
    `WITH bounded AS (SELECT timestamp, event, properties.$session_id AS session, properties.$pathname AS path, properties.source_kind AS source, properties.destination_kind AS destination, properties.action AS action FROM events WHERE ${funnelWindow} AND ${current} AND notEmpty(toString(properties.$session_id))), starts AS (SELECT session, minIf(timestamp, event = '$pageview' AND path = '/') AS home, minIf(timestamp, event = '$pageview' AND path LIKE '/writing/%') AS article FROM bounded GROUP BY session), steps AS (SELECT s.session AS session, s.home AS home, s.article AS article, minIf(e.timestamp, e.event = '$pageview' AND e.path LIKE '/projects/%' AND e.timestamp > s.home) AS project, minIf(e.timestamp, e.event = 'portfolio_navigation' AND e.source = 'writing' AND e.destination IN ('writing', 'projects') AND e.timestamp >= s.article) AS navigation, maxIf(e.timestamp, e.event = 'portfolio_action' AND e.action IN ('email_click', 'resume_click', 'phone_click')) AS contact FROM starts s JOIN bounded e ON s.session = e.session GROUP BY s.session, s.home, s.article) SELECT countIf(home > toDateTime(0)), countIf(home > toDateTime(0) AND project > home), countIf(home > toDateTime(0) AND project > home AND contact > project), countIf(article > toDateTime(0)), countIf(article > toDateTime(0) AND navigation >= article), countIf(article > toDateTime(0) AND navigation >= article AND contact > navigation) FROM steps`,
  );
  const counts = funnels[0] ?? [];
  report.journeys = [
    {
      name: "Discover your work",
      steps: ["Homepage", "Project", "Résumé / contact click"].map(
        (label, i) => ({ label, count: n(counts[i]) }),
      ),
    },
    {
      name: "Read and explore",
      steps: [
        "Article",
        "Another article / project",
        "Résumé / contact click",
      ].map((label, i) => ({ label, count: n(counts[i + 3]) })),
    },
  ];
  // Daily views include older events without session IDs; don't silently discard them.
  report.totals.views = report.days.reduce((sum, day) => sum + day.views, 0);
  report.previous.views = daily.reduce(
    (sum, [day, views]) => (String(day) < range.from ? sum + n(views) : sum),
    0,
  );
  await env.WRITING.put(cacheKey, JSON.stringify(report), {
    httpMetadata: { contentType: "application/json" },
  });
  return report;
}
