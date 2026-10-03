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
  let optedOut = false;
  try { optedOut = localStorage.getItem('portfolio:analytics-opt-out') === '1'; } catch { /* privacy storage unavailable */ }
  posthog.init(key, {
    api_host: host,
    ui_host: 'https://us.posthog.com', // Required when using a reverse proxy
    person_profiles: 'never',
    cookieless_mode: 'always',
    disable_session_recording: true,
    respect_dnt: true,
    opt_out_capturing_by_default: process.env.NODE_ENV !== 'production' || optedOut,
    // Matches the snippet PostHog's project settings currently generate. This
    // also sets capture_pageview to 'history_change': the first view and any
    // client-side navigation are captured by the SDK itself, which is why
    // there is no longer a hand-written pageview component.
    defaults: '2026-05-30',
    capture_exceptions: false,
    debug: process.env.NODE_ENV === 'development',
    autocapture: false,
    before_send: event => {
      if (!event || window.location.pathname.startsWith('/admin') || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return null;
      if (event.properties) {
        const pathname = typeof event.properties.$pathname === 'string' ? event.properties.$pathname.split('?')[0].split('#')[0] : window.location.pathname;
        event.properties.$current_url = window.location.origin + pathname;
        event.properties.$pathname = pathname;
        delete event.properties.$initial_current_url;
        delete event.properties.$referrer;
        for (const key of Object.keys(event.properties)) if (/utm_|gclid|fbclid/i.test(key)) delete event.properties[key];
      }
      return event;
    },
  })
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
