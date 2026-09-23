'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

/*
 * Initialised when this module loads, not in an effect.
 *
 * It used to be a useEffect in the provider, with a manual $pageview capture
 * in a child component. React runs a child's effects before its parent's, so
 * that capture fired before init — and PostHog drops anything captured before
 * init. No pageview was ever recorded. Initialising at module scope means the
 * client is ready before anything renders.
 *
 * Safe at module scope because this file only ever loads in the browser: it is
 * reached through a dynamic import with ssr: false in DeferredAnalytics.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
// Same-origin by default, through the Pages Function in functions/ingest, so
// ad blockers that list *.posthog.com do not drop the events.
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest'

if (key && typeof window !== 'undefined' && !posthog.__loaded) {
  posthog.init(key, {
    api_host: host,
    ui_host: 'https://us.posthog.com', // Required when using a reverse proxy
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
    // Matches the snippet PostHog's project settings currently generate. This
    // also sets capture_pageview to 'history_change': the first view and any
    // client-side navigation are captured by the SDK itself, which is why
    // there is no longer a hand-written pageview component.
    defaults: '2026-05-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
    autocapture: {
      dom_event_allowlist: ['click', 'change', 'submit'], // Track clicks, input changes, and form submissions
    },
  })
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
