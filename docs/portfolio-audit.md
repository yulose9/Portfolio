# Portfolio audit

Completed September 22, 2026. Applied the Emil design engineering, Better UI, and official web-haptics skills.

## Changes

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| High | SmoothScrolling, scroll-lock, MobileCertificates | Competing scroll behavior, delayed unlocks, and touch gesture interception | Native touch scrolling, explicit lock ownership, multitouch guards, and long-press drag cancellation | Preserve normal phone scrolling and restore scroll position after overlays |
| High | layout, page, analytics providers | Page content waited for client rendering and a preload animation | Server-rendered hero and content; separately deferred analytics | Make useful content visible sooner |
| High | Image loader and optimization script | Large original images served without responsive optimization | Build-time hashed WebP variants and accurate image sizes | Reduce transfer and decoding work while retaining original assets |
| Medium | Hero, About, certificates, section headings | Fixed sizing and inconsistent spacing across widths | Responsive typography, proportional collage positioning, and adjusted card sizing | Fit narrow phones through desktop layouts |
| Medium | MobileNav, BentoImageZoom, ImageZoom | Custom overlay behavior and incomplete dialog semantics | Accessible dialogs with titles, keyboard dismissal, and focus restoration | Keep navigation and image viewing usable with keyboards and assistive technology |
| Medium | Contact and shared controls | Inert controls and obscured contact details | Actionable mail and telephone links; removed placeholder actions | Give visible controls clear outcomes |
| Medium | Motion and interaction components | Perpetual motion, broad transitions, and inconsistent touch feedback | Scoped entrance motion, explicit transitions, pressed states, and reduced-motion support | Keep feedback quick and limit distraction |
| Medium | use-haptics and deliberate interaction handlers | Inconsistent vibration handling | Shared web-haptics integration for menu, image zoom, selections, contact actions, and drag/drop | Add meaningful feedback without vibrating during passive scrolling |

## Performance evidence

Lighthouse measured local production static exports using the same uncompressed local-server conditions. Baseline mobile run: September 21 at 05:48 UTC. Final mobile run: 12:39 UTC; final desktop run: 12:40 UTC. These are individual lab measurements, not field Core Web Vitals or guarantees for every device.

| Metric | Baseline mobile | Final mobile | Final desktop |
| --- | ---: | ---: | ---: |
| Performance | 28 | 62 | 92 |
| Accessibility | 90 | 100 | 90 |
| Best practices | 75 | 75 | 74 |
| SEO | 100 | 100 | 100 |
| Largest Contentful Paint | 37.3 s | 9.7 s | 1.8 s |
| Total Blocking Time | 2,040 ms | 370 ms | 0 ms |
| Transferred data | 11,201 KiB | 1,799 KiB | 1,794 KiB |

Mobile transfer decreased approximately 84%. The 54 source raster images total 41.11 MB; their largest generated WebP variants total 4.94 MB. Responsive requests can use smaller variants. Originals remain available for future edits.

Mobile performance still has room to improve. Existing third-party analytics remain a source of network and main-thread work. Best-practices scores did not materially improve. Desktop accessibility still needs follow-up; a mobile score of 100 does not establish full accessibility compliance.

## Verification and limits

Production build, TypeScript checks, and six Chrome browser regression tests pass. The suite checks server-rendered content, optimized images, menu dismissal and focus, image-dialog restoration, real emulated touch swipes, five viewport widths, reduced-motion navigation, and contact links. Lint has no errors; existing hook and unused-disable warnings remain.

Desktop and mobile browser screenshots were inspected. Approve for the inspected coverage. Physical iPhone Safari scrolling, browser toolbar resizing, haptic feel, long-press dragging, and motion playback at 10% speed remain unverified. Chrome phone emulation does not substitute for those checks.

See [maintenance instructions](portfolio-maintenance.md) for builds, image generation, and interaction checks. Generated images, raw local Lighthouse reports, and browser artifacts are excluded from Git; image generation runs automatically during builds.
