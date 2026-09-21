"use client";

import { GlassStatusState } from "@/app/components/shared/GlassStatusState";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {


  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      void import("posthog-js").then(({ default: posthog }) => {
        if (posthog.__loaded) posthog.captureException(error);
      }).catch(() => {});
    }
    console.error(error);
  }, [error]);

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
