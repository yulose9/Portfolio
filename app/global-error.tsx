"use client";

import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0b] text-[#f4f4f5] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#141416] border border-[#27272a] text-center shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-[#a1a1aa] mb-6">
            An unexpected error occurred. You can reload the page or try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-[#e4e4e7] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
