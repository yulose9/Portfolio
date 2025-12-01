'use client'

import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const posthog = usePostHog()

  useEffect(() => {
    if (posthog) {
        posthog.captureException(error)
    }
    console.error(error)
  }, [error, posthog])

  return (
    <html>
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <button
            onClick={reset}
            className="rounded-full bg-black px-6 py-2 text-white hover:bg-gray-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
