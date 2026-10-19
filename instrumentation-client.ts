import { enabled } from "./sentry.settings.json";
import * as Sentry from "@sentry/nextjs";
import { isPrivateTelemetryPath, privateSafeError, privateTelemetryCollection } from "./lib/telemetryPrivacy";

// Never load on private pages (admin, Seneca, API): beforeSend also drops
// their events, for navigations that start on the public site.
const privatePage = typeof window !== "undefined" && isPrivateTelemetryPath(window.location.href);

if (enabled && !privatePage) Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://7e01158ba3748889e0dfc1e8f00f95d4@o4512213284093952.ingest.us.sentry.io/4512213298184192",

  beforeSend: privateSafeError,
  dataCollection: privateTelemetryCollection,
  beforeSendLog: () => null,
  beforeSendTransaction: () => null,
  beforeSendMetric: () => null,

  // Private pages share this client: disable traces, profiles and replay.
  tracesSampleRate: 0,

  // Trace propagation targets
  tracePropagationTargets: [],

  // Browser Profiling
  profileSessionSampleRate: 0,
  profileLifecycle: "trace",

  // Private journals and financial records must not be recorded by default.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Enable debug in development so you can see Sentry sending events in DevTools console
  debug: false,
});

export const onRouterTransitionStart = enabled && !privatePage ? Sentry.captureRouterTransitionStart : () => {};
