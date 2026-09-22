# Mobile UI polish

## Visual scale and touch targets

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | app/(sections)/blog/MobileBlogCarousel.tsx:279 | Dot backgrounds expanded to the global 44px target size | Separate 6px visual markers inside transparent 44px buttons; active marker uses a pill and aria-current | Visual scale stays subtle while touch targets remain usable |
| MEDIUM | app/(sections)/work/CertificateGrid.tsx:27 | 112px badges and 256px minimum card height | 80px badges, 200px minimum height, compact date labels | Reduce visual weight and improve mobile density |
| MEDIUM | app/(sections)/about/MobileCertificates.tsx:49; app/(sections)/work/MobileWorkExperiences.tsx:83 | Edge-to-edge certificate cards and excessive preceding space | 20px side spacing, section heading, and shorter section gap | Group credentials clearly within the mobile page |
| MEDIUM | app/components/layout/MobileFooter.tsx:17 | Tiny resume text, crowded mixed-size controls, nonwrapping copyright | Full-width 44px resume link, evenly spaced 44px social links, readable wrapping copyright | Establish hierarchy and avoid narrow-screen overflow |

## Interaction restraint

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | app/(sections)/blog/MobileBlogCarousel.tsx:303; app/components/layout/MobileFooter.tsx:29 | Broad transitions and oversized arrow icons | Shared 150ms press feedback at scale 0.96, 20px arrows, explicit transition properties | Match the existing motion language with restrained feedback |
| LOW | app/(sections)/work/CertificateGrid.tsx:42 | Mobile links retained a hover background after tapping | Mobile active background; desktop hover retained | Prevent sticky touch-hover styling |

Production build and browser regressions pass. Browser review checks pagination clicks, keyboard focus and activation, 44px hit areas, 80px certificate images, and footer geometry at 320px, 390px, and 430px widths. Screenshots were inspected for mobile pagination, certificates, and the narrow footer. Source review confirms explicit transition properties and existing global reduced-motion handling.

Not verified: physical iPhone interaction, motion replay at 10% speed in the Animations panel, and external resume/social destination availability. Loading and empty states were not changed or separately exercised.

Approve for inspected coverage.
