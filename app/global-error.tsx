"use client";

import { GlassStatusState } from "@/app/components/shared/GlassStatusState";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      posthog.captureException(error);
    }
    console.error(error);
  }, [error, posthog]);

  return (
    <html lang="en">
      <body>
        <GlassStatusState
          code="500"
          title="Critical System Error"
          message="A critical error occurred. We apologize for the inconvenience."
          onRetry={reset}
          className="min-h-screen"
        />
      </body>
    </html>
  );
}
