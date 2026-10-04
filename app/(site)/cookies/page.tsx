import type { Metadata } from "next";
import Link from "next/link";
import { OG_METADATA, SITE_INFO, TWITTER_METADATA } from "../../constants/seo";
import DocumentMenu from "../../components/menu/DocumentMenu";
import BrowserGuide from "../../components/compliance/BrowserGuide";
import Callout from "../../components/writing/Callout";
import Toc from "../../components/writing/Toc";
import AuthorCard from "../../components/writing/AuthorCard";
import type { OutlineItem } from "../../lib/writing";
import "../../article-blocks.css";
import "../../article-blocks-2.css";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Cookie policy for nazarene.dev: why we run cookieless analytics, full inventory of functional state, and consent determinations.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    ...OG_METADATA,
    title: `Cookie Policy · ${SITE_INFO.name}`,
    description:
      "Why we run cookieless analytics, full inventory of functional state, and consent determinations.",
    url: `${SITE_INFO.url}/cookies`,
  },
  twitter: {
    ...TWITTER_METADATA,
    title: `Cookie Policy · ${SITE_INFO.name}`,
    description:
      "Why we run cookieless analytics, full inventory of functional state, and consent determinations.",
  },
};

const TOC_ITEMS: OutlineItem[] = [
  { id: "why-no-cookie-banner", text: "Why No Annoying Cookie Banner", depth: 2, icon: "💡" },
  { id: "complete-inventory", text: "Complete Storage Inventory", depth: 2, icon: "📋" },
  { id: "third-party-analytics", text: "Cookieless Analytics Architecture", depth: 2, icon: "📊" },
  { id: "managing-preferences", text: "Managing & Clearing Preferences", depth: 2, icon: "⚙️" },
  { id: "browser-controls", text: "Browser Controls & Clearing Steps", depth: 3, icon: "🌐" },
  { id: "contact", text: "Contact Information", depth: 2, icon: "✉️" },
];

export default function CookiePolicy() {
  return (
    <DocumentMenu title="Cookie Policy" url="https://nazarene.dev/cookies">
      <div className="flex w-full justify-center bg-[color:var(--paper)]">
        <main
          id="main"
          tabIndex={-1}
          data-cursor-frame
          className="page-shell page-enter article-shell article-page w-full max-w-[672px] py-16 sm:py-24"
        >
          <nav className="article-nav" aria-label="Breadcrumb">
            <ol className="breadcrumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Cookie Policy</li>
            </ol>
          </nav>

          <header data-cursor="text" className="article-header mb-12">
            <h1 data-cursor="text" className="article-title text-3xl font-semibold tracking-tight text-[color:var(--fg)]">
              Cookie Policy
            </h1>
            <p data-cursor="text" className="article-dek text-base text-[color:var(--fg-2)] leading-relaxed">
              Full disclosure of cookies, local storage identifiers, and our consent-free privacy
              architecture.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-[color:var(--fg-3)]">
              <Link href="/" className="inline-flex items-center gap-1.5 text-[color:var(--fg)] hover:underline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/avatar-288.webp"
                  alt="John Nazarene Dela Pisa"
                  width={22}
                  height={22}
                  className="rounded-full border border-[color:var(--line)] object-cover"
                />
                <span className="font-medium">John Nazarene Dela Pisa</span>
              </Link>
              <span aria-hidden="true">•</span>
              <span>Effective: October 2026</span>
              <span aria-hidden="true">•</span>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Verified Compliant
              </span>
            </div>
          </header>

          <article className="article" data-has-toc="">
            <div className="article-main">
              <Toc items={TOC_ITEMS} />

              <div data-cursor="text" className="article-body">
                <Callout type="important" icon="🛡️">
                  <strong>Cookieless by Design:</strong> Under European data protection law (GDPR Art. 6
                  and ePrivacy Directive), websites that use only strictly necessary functional state and
                  anonymous telemetry are not required to bombard visitors with blocking cookie consent banners.
                </Callout>

                <h2 id="why-no-cookie-banner">1. Why You Don&rsquo;t See an Annoying Cookie Banner</h2>
                <p>
                  Under European data protection standards (Directive 2002/58/EC &ldquo;ePrivacy&rdquo;
                  and Regulation (EU) 2016/679 &ldquo;GDPR&rdquo;), websites must obtain prior affirmative
                  consent from visitors before placing or reading non-essential cookies, tracking pixels,
                  or cross-site advertising identifiers.
                </p>
                <p>
                  <strong>
                    nazarene.dev does not display a blocking cookie consent banner because we do not use
                    any non-essential or advertising cookies.
                  </strong>
                </p>
                <p>
                  Our analytics run in strict <strong>cookieless mode</strong>, and the only state saved
                  on your browser consists of strictly necessary functional preferences (such as your
                  chosen dark mode theme, sound effects preference, and poll voting integrity token).
                  Under EDPB and national regulator guidance, strictly necessary operational cookies and
                  anonymous cookieless analytics do not require prior consent modals.
                </p>

                <h2 id="complete-inventory">2. Complete Inventory of Cookies and Storage</h2>
                <p>
                  The table below lists every cookie and local storage key that may be read or written by
                  this Website:
                </p>

                <div className="table-wrap my-6">
                  <table>
                    <thead>
                      <tr>
                        <th>Key / Cookie Name</th>
                        <th>Type</th>
                        <th>Lifespan</th>
                        <th>Purpose &amp; Necessity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr data-cookie-key="poll_<id>">
                        <td className="font-mono text-xs text-[color:var(--fg)]">
                          poll_&lt;id&gt;
                        </td>
                        <td>HTTP Cookie (HttpOnly, Secure, SameSite=Lax)</td>
                        <td>1 year</td>
                        <td>
                          <strong>Strictly Necessary.</strong> Set only when you choose to cast a ballot
                          in an article choice poll. Prevents duplicate votes and verifies your vote hash
                          at the edge.
                        </td>
                      </tr>
                      <tr data-cookie-key="poll-voter">
                        <td className="font-mono text-xs text-[color:var(--fg)]">
                          poll-voter
                        </td>
                        <td>Local Storage</td>
                        <td>Persistent</td>
                        <td>
                          <strong>Functional.</strong> Stores a random 20-character pseudonym generated on
                          your client device, enabling you to inspect or retract your vote later.
                        </td>
                      </tr>
                      <tr data-cookie-key="portfolio:analytics-opt-out">
                        <td className="font-mono text-xs text-[color:var(--fg)]">
                          portfolio:analytics-opt-out
                        </td>
                        <td>Local Storage</td>
                        <td>Persistent</td>
                        <td>
                          <strong>Functional Preference.</strong> Remembers whether you clicked the
                          &ldquo;Opt out of analytics&rdquo; button, preventing any future metric
                          dispatch.
                        </td>
                      </tr>
                      <tr data-cookie-key="data-theme">
                        <td className="font-mono text-xs text-[color:var(--fg)]">
                          data-theme
                        </td>
                        <td>Local Storage</td>
                        <td>Persistent</td>
                        <td>
                          <strong>Functional Preference.</strong> Saves your chosen interface theme
                          (light or dark) to eliminate screen flash on subsequent visits.
                        </td>
                      </tr>
                      <tr data-cookie-key="portfolio:sound">
                        <td className="font-mono text-xs text-[color:var(--fg)]">
                          portfolio:sound
                        </td>
                        <td>Local Storage</td>
                        <td>Persistent</td>
                        <td>
                          <strong>Functional Preference.</strong> Remembers whether you toggled the sound
                          effects audio toggle on or off.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h2 id="third-party-analytics">3. Third-Party Analytics Architecture</h2>
                <p>
                  Many analytics platforms drop third-party tracking cookies to identify visitors across
                  multiple websites. We reject that approach:
                </p>
                <ul>
                  <li>
                    <strong>Cookieless PostHog:</strong> Ingested through our own origin reverse proxy (
                    <code>/ingest</code>), initialized with <code>cookieless_mode: &apos;always&apos;</code>.
                    No PostHog cookies are created or stored on your machine, and person profiling is permanently
                    disabled (<code>person_profiles: &apos;never&apos;</code>).
                  </li>
                  <li>
                    <strong>Cloudflare Web Analytics:</strong> Injected via a lightweight edge script (
                    <code>static.cloudflareinsights.com/beacon.min.js</code>). It does not use any
                    cookies or local storage, collecting only non-identifying aggregate metrics at the edge.
                  </li>
                  <li>
                    <strong>Disabled Third Parties:</strong> Commercial tracking suites (Google Analytics,
                    Microsoft Clarity, Mixpanel) are strictly disabled in production builds.
                  </li>
                </ul>

                <Callout type="tip" icon="📊">
                  <strong>Zero Cross-Site Tracking:</strong> Network requests dispatched to <code>/ingest</code> have
                  all cookies and authorization headers scrubbed at our Cloudflare edge worker before forwarding,
                  preventing any third party from identifying your browser across the internet.
                </Callout>

                <h2 id="managing-preferences">4. Managing and Clearing Your Preferences</h2>
                <p>
                  You retain absolute control over your local browser storage at all times:
                </p>
                <ul>
                  <li>
                    <strong>Instant Analytics Opt-Out:</strong> Click the &ldquo;Opt out of analytics&rdquo;
                    button in the footer of any page to disable all metric dispatch immediately without
                    leaving this page.
                  </li>
                </ul>

                <h3 id="browser-controls">Browser Controls &amp; Clearing Steps</h3>
                <p>
                  You can wipe cookies, cached data, and local storage directly through your browser&rsquo;s native
                  privacy settings at any time. Follow the specific step-by-step navigation below for your browser:
                </p>

                <BrowserGuide />

                <h2 id="contact">5. Contact</h2>
                <p>
                  For any technical questions regarding how cookies and local state operate on this site,
                  contact <a href="mailto:jannazarene09@gmail.com">jannazarene09@gmail.com</a> or read our{" "}
                  <Link href="/privacy">Privacy Policy</Link>.
                </p>

                <hr className="my-10 border-[color:var(--line)]" />

                <AuthorCard
                  authors={[
                    {
                      name: "John Nazarene Dela Pisa",
                      email: "jannazarene09@gmail.com",
                      avatar: "/avatar-1024.webp",
                    },
                  ]}
                />
              </div>
            </div>
          </article>
        </main>
      </div>
    </DocumentMenu>
  );
}
