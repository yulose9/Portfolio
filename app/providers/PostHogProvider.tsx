'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
      // Check if environment variables are defined before initializing
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

      if (key) {
        posthog.init(key, {
          api_host: host,
          person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
          capture_pageview: false // Disable automatic pageview capture, as we capture manually
        })
      }
    }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
