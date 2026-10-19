/** Only public error locations leave the app; journals and admin stay private. */
// Sentry 11 defaults these categories to collection; opt out explicitly.
export const privateTelemetryCollection = {
  userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
  urlQueryParams: false, graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false }, databaseQueryData: false,
  queues: false, stackFrameVariables: false, frameContextLines: 0,
};

export function isPrivateTelemetryPath(value: string): boolean {
  try {
    const path = decodeURIComponent(new URL(value, "https://local.invalid").pathname);
    return /^\/(?:admin|seneca|api)(?:\/|$)/i.test(path);
  } catch { return true; }
}

export function publicTelemetryUrl(value: string): string {
  try {
    const url = new URL(value, "https://local.invalid");
    return url.origin + url.pathname;
  } catch { return "[redacted]"; }
}

// Structural typing keeps this policy independent of the optional Sentry SDK.
export function privateSafeError<T extends {
  event_id?: string; timestamp?: number; platform?: string; level?: unknown; sdk?: unknown;
  request?: { url?: string }; transaction?: string;
  exception?: { values?: Array<{ type?: string; stacktrace?: { frames?: Array<{
    filename?: string; function?: string; lineno?: number; colno?: number; in_app?: boolean;
  }> } }> };
}>(event: T): T | null {
  if ((typeof window !== "undefined" && isPrivateTelemetryPath(window.location.href)) ||
      (event.request?.url && isPrivateTelemetryPath(event.request.url)) ||
      (event.transaction && isPrivateTelemetryPath(event.transaction))) return null;
  // Do not spread the event: messages, breadcrumbs, headers, user context,
  // console arguments and request bodies can all contain private records.
  return {
    event_id: event.event_id, timestamp: event.timestamp, platform: event.platform,
    level: event.level,
    // The SDK block carries settings.infer_ip = "never" (no IP stored); no personal data.
    sdk: event.sdk,
    exception: { values: event.exception?.values?.map(value => ({
      type: value.type, value: "Error details withheld by privacy policy",
      stacktrace: { frames: value.stacktrace?.frames?.map(frame => ({
        filename: frame.filename ? publicTelemetryUrl(frame.filename) : undefined,
        function: frame.function, lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app,
      })) },
    })) },
  } as T;
}
