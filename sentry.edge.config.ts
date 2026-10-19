import { enabled } from "./sentry.settings.json";
import * as Sentry from "@sentry/nextjs";
import { privateSafeError, privateTelemetryCollection } from "./lib/telemetryPrivacy";

if (enabled) Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://7e01158ba3748889e0dfc1e8f00f95d4@o4512213284093952.ingest.us.sentry.io/4512213298184192",

  // Automatic performance telemetry is disabled for private data.
  beforeSend: privateSafeError,
  dataCollection: privateTelemetryCollection,
  beforeSendLog: () => null,
  beforeSendTransaction: () => null,
  beforeSendMetric: () => null,
  tracesSampleRate: 0,
  tracePropagationTargets: [],

  debug: false,
});
