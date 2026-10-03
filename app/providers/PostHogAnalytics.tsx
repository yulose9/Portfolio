"use client";

import { CSPostHogProvider } from "./PostHogProvider";
import PortfolioEvents from "./PortfolioEvents";

/* Nothing to render yet; the provider exists so hooks like usePostHog work. */
export default function PostHogAnalytics() {
  return <CSPostHogProvider><PortfolioEvents /></CSPostHogProvider>;
}
