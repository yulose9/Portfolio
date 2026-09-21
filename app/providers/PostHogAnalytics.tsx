"use client";

import { Suspense } from "react";
import { CSPostHogProvider } from "./PostHogProvider";
import PostHogPageView from "./PostHogPageView";

export default function PostHogAnalytics() {
  return <CSPostHogProvider><Suspense fallback={null}><PostHogPageView /></Suspense></CSPostHogProvider>;
}
