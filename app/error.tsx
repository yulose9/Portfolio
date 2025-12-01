'use client'

import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const posthog = usePostHog()

  useEffect(() => {
    // Log the error to PostHog
    if (posthog) {
        posthog.captureException(error)
    }
    console.error(error)
  }, [error, posthog])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Something went wrong!
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        We apologize for the inconvenience.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-neutral-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Try again
      </button>
    </div>
  )
}
