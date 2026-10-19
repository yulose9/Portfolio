import { enabled } from "./sentry.settings.json";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!enabled) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = enabled ? Sentry.captureRequestError : () => {};
