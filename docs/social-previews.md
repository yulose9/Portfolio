# Public social previews

Every published project, article, Writing topic, public index, and policy page has its own Open Graph and Twitter Card metadata in the exported HTML. Preview generation uses published files only; no draft API, authentication cookie, or client-side JavaScript is required.

## Image contract

- PNG, 1200 × 630 pixels, absolute HTTPS URL, declared dimensions, MIME type and alt text.
- Current outputs must stay below the 1 MB build-check budget. Artwork is fitted without cutting off the original image. The default card uses the page's own title, description, Fluent/uploaded icon, available cover and public author names.
- Explicit cover/custom choices remain supported. Missing, invalid, external, or SVG artwork falls back to a title card. No arbitrary external URL is fetched. A bounded request can read public first-party R2 media or the pinned Fluent icon package.
- Inter is bundled under `assets/og` with its OFL license; card generation no longer relies on Google Fonts being reachable during each build.
- `/og/<kind>/<slug>.<content-version>.png` changes with the published preview facts. Existing stable aliases remain available. A publication triggers the existing build/deploy path; it is not a live draft preview endpoint.
- The legacy bundled homepage card had an outdated job title. Its default now comes from the current profile and SEO fields. Other explicit homepage artwork choices are preserved.

## Skills applied

| Before | After | Why |
| --- | --- | --- |
| Some pages inherited the homepage image and title | Complete metadata and an image for each public route | A shared link represents its destination |
| Projects without artwork had no rich image | Generated, versioned title cards | New publications need no manual image setup |
| Arbitrary image dimensions were advertised as 1200 × 630 | The exported PNG is physically 1200 × 630 | Crawlers receive accurate dimensions |
| Homepage image contained an old job title | Current profile and SEO fields generate the default | Published facts and previews stay aligned |
| Font and image URLs could drift between renderers | Bundled Inter and one card contract | Repeatable output and one validation path |
| Share mockups implied exact platform output | Clearly labelled illustrative previews | Client cropping and cache behavior are outside the site’s control |

| Skill | Use in this work |
| --- | --- |
| frontend-design, design-taste-frontend | Preserved the site's minimal editorial identity; real project artwork and Inter carry the design. |
| emil-design-eng, better-ui | Stable image proportions, restrained hierarchy, consistent preview controls. Static share images do not animate. |
| no-ai-slop | Titles and descriptions come from authored content; no fabricated results or promotional copy. |
| web-design-guidelines, accessibility-inspect | Explicit alt metadata and readable contrast; accessible full titles remain outside the image. Browser interaction checks are not verified while the host is unavailable. |
| vercel-composition-patterns | A shared public card contract, renderer, and registry replace divergent page rules. |
| ui-ux-pro-max, bencium-controlled-ux-designer | Typography, spacing, contrast and image-first layouts; existing approved design choices were retained. |
| impeccable | Read/Experience refinement of the incumbent system; local context and craft-floor review. |
| react-native-best-practices, vercel-react-native-skills | Reviewed; native component, Hermes and Expo guidance is not applicable to this Next.js static export. No native dependency was added. |

## Guidance and platform limits

- [Open Graph protocol](https://ogp.me/): complete object metadata and structured image properties.
- [Apple rich-link guidance](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages): metadata must be present without JavaScript; consistent responses, useful images and touch icons. The full title/description stays in metadata for accessibility. Artwork-only mode is available when imagery is more useful than text in a small preview.
- [Slack classic unfurling](https://docs.slack.dev/messaging/unfurling-links-in-messages/): clients read Open Graph and Twitter metadata, then choose their own rendering.
- [Telegram WebPage model](https://core.telegram.org/type/WebPage): clients render the fetched page title, description and media. Sender/client settings can choose large or small media.
- [Next.js metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) and [ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response): server/static metadata and build-generated PNGs, checked through Context7 for 15.5.28.
- Meta's sharing documentation returned HTTP 429 during this audit; no claim of testing Messenger's private scraper is made. The chosen 1200 × 630 PNG is a compatibility target, not a promise that every app preserves this crop.

Apps cache previews independently. Versioned image URLs help on the next scrape; old messages may retain old artwork. Fragment-only links such as `/#projects` share the homepage document; use `/projects` for the Projects preview. Admin and private Seneca pages remain protected and excluded from public cards. Do not relax Access or expose private metadata to make those unfurl.

## Verification

`npm run check:social` checks exported public HTML for one complete preview, canonical/OG agreement, matching Twitter metadata, a real PNG at the declared path, dimensions and file size. CI runs it after the production build. Unit tests cover version changes, published-only coverage, private-field exclusion, and rejected artwork paths. Rendered PNGs were inspected locally. Real sends in Messenger, Telegram, iMessage and other apps are not exercised; no messages were sent.

The Impeccable detector found one existing accent border in the Telegram mock. It is retained because it represents Telegram’s preview treatment. This is an illustrative platform mock, not a new site-wide decoration. No other findings were returned for the social renderer and preview targets. Interactive accessibility inspection remains not exercised; generated images and source metadata were reviewed, not claimed as a full WCAG audit.

Final local validation on 2026-11-09: production build successful; 320 tests passing; API types passing; all 17 public pages have distinct valid PNG previews under 1 MB. A legacy `temp_gallery.html` asset contact sheet is marked `noindex, nofollow` and excluded from public-page checks. This directive does not make its URL private.

## Live follow-up, 2026-11-09

Commit `f461961` passed GitHub CI and deployed successfully to Cloudflare. A later CMS publication (`c1494b1`) updated PinaSweldo and correctly changed its image version. Compare deployed metadata against the current published content, not a local export from before that publication.

All 17 public URLs returned their current expected image, and those images returned valid 1200 × 630 PNGs. Four additional page requests with Facebook, Telegram, Applebot and Slack user-agent strings also returned the expected metadata (21 checks passed). These simulate request headers; they do not prove access from the services' actual crawler IPs or refresh their caches. Downloaded live cards for both projects were visually inspected. One Python urllib request returned 403; Node requests passed. No security rules were weakened and no real messaging-app send was performed.

The Details panel still had a separate cover-only mockup and incorrectly claimed pages without covers shared as small cards. It now shares the same draft artwork component as the platform previews, honors the selected image mode, and explains publication/deployment and app caching. Published pages have a link to their live URL and Meta's Sharing Debugger. No draft text is sent to that service.

An expanded check fetched both project pages and their PNGs under eight crawler user-agent strings (Facebook, Meta external agent/fetcher, Telegram, WhatsApp, Twitter, Applebot and Slack): all 16 page/image pairs passed with no `cf-mitigated` challenge header. This remains a request-header simulation, not verification of those services' networks or cached message attachments.

| Before | After | Why |
| --- | --- | --- |
| Details showed only the cover, ignoring generated/custom artwork | One shared draft artwork component | The two editor surfaces represent the same share-image choice |
| No cover was labelled as a small card | Generated title artwork is shown | Published pages always have a large PNG preview |
| No distinction between draft preview and deployed artwork | Clear draft label, live-page link and debugger link | A draft illustration cannot confirm what an app has cached |

For a stale Facebook/Messenger result, inspect the exact published URL in [Meta's Sharing Debugger](https://developers.facebook.com/tools/debug/) and request a new scrape there if offered. Existing message attachments may remain unchanged. The debugger was not accessible from the automated research environment (HTTP 429), so no refresh is claimed. Telegram/iMessage cache behavior was not tested in a real client.
