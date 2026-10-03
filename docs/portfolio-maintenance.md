# Portfolio maintenance

Use Node.js 22 or newer. Install dependencies with `npm ci`.

## Build and preview

`npm run build` optimizes images, builds Next.js, and exports the site to `out/`.
`npm run preview` serves that export at http://127.0.0.1:3000.
Deploy the entire `out/` directory. This project uses static export; `next start` is not its production server.

## Images

Keep source images in `public/`. `scripts/optimize-images.mjs` (run by next.config.js on every
`next build`/`next dev`, or by hand with `node scripts/optimize-images.mjs`) finds the PNG/JPEG/WebP
files under `/images/` and `/tools/` that the content references, writes AVIF and WebP copies at
responsive widths to `public/optimized/` (gitignored), and records them in `app/image-manifest.json`.
`responsiveImage()` in `app/lib/images.ts` turns a src into `<picture>` srcsets from that manifest.
Without sharp the manifest is empty and the originals are served. Generated names carry a content
hash; if widths or encoder settings change, bump `PIPELINE` in the script. Original files stay intact.
Uploaded media (`/media/...`) is converted in the browser at upload time (`app/admin/ui/media.ts`).
Cloudflare's `public/_headers` gives hashed images and Next static chunks immutable caching.

## Interaction checks

Run `npm run lint`, `npm run typecheck`, and `npm run test:e2e` after a production build.
The browser suite uses installed Chrome with phone emulation. It checks native touch scrolling,
menu/dialog focus restoration, responsive widths, navigation, and contact links.
Physical iPhone Safari testing is still needed for haptic feel and browser toolbar changes.
Certificates are static cards with credential links. They have no drag, reorder, or long-press handlers.

Use `useHaptics` for deliberate taps and discrete selections. Avoid feedback during passive scrolling.
Reduced-motion preference disables haptics and limits animation. Touch devices use native scrolling;
Lenis loads only for a fine pointer without touch capability and with motion enabled.

## Analytics

Existing analytics services load after the page load event. PostHog is conditional on
`NEXT_PUBLIC_POSTHOG_KEY` and loads separately from the page content. Mixpanel debug logging and
automatic session recording are disabled. Third-party analytics still contribute network and main-thread work.
Consider consolidating them if they provide overlapping reports.
