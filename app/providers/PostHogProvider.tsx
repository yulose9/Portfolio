'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
      // Check if environment variables are defined before initializing
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      // Same-origin by default, through the Pages Function in functions/ingest,
      // so ad blockers that list *.posthog.com do not drop the events.
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest'

      if (key) {
        posthog.init(key, {
          api_host: host,
          ui_host: 'https://us.posthog.com', // Required when using a reverse proxy
          person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
          capture_pageview: false, // Disable automatic pageview capture, as we capture manually
          // Carried over from the old instrumentation-client.ts, which used to
          // init PostHog a second time with its own config. This is now the
          // single init: deferred, and guarded on the key being present.
          capture_exceptions: true,
          debug: process.env.NODE_ENV === 'development',
          // Matches the snippet PostHog's project settings currently generate.
          defaults: '2026-05-30',
          autocapture: {
            dom_event_allowlist: ['click', 'change', 'submit'], // Track clicks, input changes, and form submissions
          },
        })
      }
    }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
