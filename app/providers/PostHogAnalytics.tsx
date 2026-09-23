"use client";

import { CSPostHogProvider } from "./PostHogProvider";

/* Nothing to render yet; the provider exists so hooks like usePostHog work. */
export default function PostHogAnalytics() {
  return <CSPostHogProvider>{null}</CSPostHogProvider>;
}
