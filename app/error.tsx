"use client";

import { GlassStatusState } from "@/app/components/shared/GlassStatusState";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    // Keep your existing PostHog logging
    if (posthog) {
      posthog.captureException(error);
    }
    console.error(error);
  }, [error, posthog]);

  return <GlassStatusState code="500" onRetry={reset} />;
}
