# Portfolio maintenance

Use Node.js 22 or newer. Install dependencies with `npm ci`.

## Build and preview

`npm run build` optimizes images, builds Next.js, and exports the site to `out/`.
`npm run preview` serves that export at http://127.0.0.1:3000.
Deploy the entire `out/` directory. This project uses static export; `next start` is not its production server.

## Images

Keep source photos in `public/`. `npm run images:optimize` generates responsive WebP variants in
`public/optimized/` and updates `app/image-manifest.json`. It also runs automatically before dev/build.
Use `next/image` with accurate `sizes`; the custom loader selects a generated variant without a runtime image server.
Generated images have content hashes and are rebuilt in CI. Original photos stay intact.
If resizing or encoding settings change, increment the pipeline version string used in the hash.
Cloudflare's `public/_headers` gives hashed images and Next static chunks immutable caching.

## Interaction checks

Run `npm run lint`, `npm run typecheck`, and `npm run test:e2e` after a production build.
The browser suite uses installed Chrome with phone emulation. It checks native touch scrolling,
menu/dialog focus restoration, responsive widths, navigation, and contact links.
Physical iPhone Safari testing is still needed for haptic feel, browser toolbar changes, and long-press dragging.

Use `useHaptics` for deliberate taps and discrete selections. Avoid feedback during passive scrolling.
Reduced-motion preference disables haptics and limits animation. Touch devices use native scrolling;
Lenis loads only for a fine pointer without touch capability and with motion enabled.

## Analytics

Existing analytics services load after the page load event. PostHog is conditional on
`NEXT_PUBLIC_POSTHOG_KEY` and loads separately from the page content. Mixpanel debug logging and
automatic session recording are disabled. Third-party analytics still contribute network and main-thread work.
Consider consolidating them if they provide overlapping reports.
