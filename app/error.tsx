"use client";

import { GlassStatusState } from "@/app/components/shared/GlassStatusState";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {


  useEffect(() => {
    // Keep your existing PostHog logging
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      void import("posthog-js").then(({ default: posthog }) => {
        if (posthog.__loaded) posthog.captureException(error);
      }).catch(() => {});
    }
    console.error(error);
  }, [error]);

  return <GlassStatusState code="500" onRetry={reset} />;
}
