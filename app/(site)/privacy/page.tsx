import type { Metadata } from "next";
import Link from "next/link";
import { OG_METADATA, SITE_INFO, TWITTER_METADATA } from "../../constants/seo";
import DocumentMenu from "../../components/menu/DocumentMenu";
import Callout from "../../components/writing/Callout";
import Toc from "../../components/writing/Toc";
import AuthorCard from "../../components/writing/AuthorCard";
import type { OutlineItem } from "../../lib/writing";
import "../../article-blocks.css";
import "../../article-blocks-2.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for nazarene.dev: data minimization, cookieless analytics, reader privacy, and zero data selling.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    ...OG_METADATA,
    title: `Privacy Policy · ${SITE_INFO.name}`,
    description:
      "Data minimization, cookieless analytics, reader privacy, and zero data selling.",
    url: `${SITE_INFO.url}/privacy`,
  },
  twitter: {
    ...TWITTER_METADATA,
    title: `Privacy Policy · ${SITE_INFO.name}`,
    description:
      "Data minimization, cookieless analytics, reader privacy, and zero data selling.",
  },
};

const TOC_ITEMS: OutlineItem[] = [
  { id: "fundamental-commitment", text: "Fundamental Commitment", depth: 2, icon: "🛡️" },
  { id: "what-information-we-process", text: "What Information We Process", depth: 2, icon: "📄" },
  { id: "direct-communications", text: "Direct Communications", depth: 3, icon: "✉️" },
  { id: "interactive-reader-polls", text: "Interactive Reader Polls", depth: 3, icon: "🗳️" },
  { id: "privacy-preserving-telemetry", text: "Privacy-Preserving Telemetry", depth: 3, icon: "📊" },
  { id: "third-party-embeds", text: "Third-Party Embeds", depth: 3, icon: "🔗" },
  { id: "cookies-and-local-storage", text: "Cookies and Local Storage", depth: 2, icon: "🍪" },
  { id: "legal-bases-for-processing", text: "Legal Bases for Processing", depth: 2, icon: "⚖️" },
  { id: "data-retention-security", text: "Data Retention & Security", depth: 2, icon: "🔒" },
  { id: "your-rights", text: "Your Rights (GDPR & CCPA)", depth: 2, icon: "👤" },
  { id: "updates-to-this-policy", text: "Updates to This Policy", depth: 2, icon: "📝" },
];

export default function PrivacyPolicy() {
  return (
    <DocumentMenu title="Privacy Policy" url="https://nazarene.dev/privacy">
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
              <li aria-current="page">Privacy Policy</li>
            </ol>
          </nav>

          <header data-cursor="text" className="article-header mb-12">
            <h1 data-cursor="text" className="article-title text-3xl font-semibold tracking-tight text-[color:var(--fg)]">
              Privacy Policy
            </h1>
            <p data-cursor="text" className="article-dek text-base text-[color:var(--fg-2)] leading-relaxed">
              How reader privacy, data minimization, and site telemetry are handled on nazarene.dev.
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
                Data Minimization Guaranteed
              </span>
            </div>
          </header>

          <article className="article" data-has-toc="">
            <div className="article-main">
              <Toc items={TOC_ITEMS} />

              <div data-cursor="text" className="article-body">
                <Callout type="important" icon="🛡️">
                  <strong>Zero Commercial Monetization:</strong> We do not sell, rent, monetize, or trade any personal data.
                  There are no third-party tracking pixels, advertising retargeting tags, or data broker integrations.
                </Callout>

                <h2 id="fundamental-commitment">1. Fundamental Commitment</h2>
                <p>
                  Privacy on this site is treated as an engineering constraint rather than a legal
                  formality. This is a personal website, portfolio, and engineering publication.
                  <strong> We do not sell, rent, monetize, or trade any personal data.</strong> We do
                  not run cross-site advertising trackers, behavioral profiling engines, or marketing
                  data brokers.
                </p>
                <p>
                  We adhere strictly to the principle of <em>data minimization</em>: we only collect or
                  process the absolute minimum amount of technical data needed to deliver fast, secure,
                  and reliable pages to your device.
                </p>

                <h2 id="what-information-we-process">2. What Information We Process</h2>

                <h3 id="direct-communications">Direct Communications</h3>
                <p>
                  There are no public visitor registration portals or submission forms storing your
                  identity. If you contact me directly via email at{" "}
                  <a href="mailto:jannazarene09@gmail.com">jannazarene09@gmail.com</a>, your email
                  address, name, and message content will be used solely to converse with you and address
                  your inquiry. Your correspondence is never shared with third parties for commercial
                  purposes.
                </p>

                <h3 id="interactive-reader-polls">Interactive Reader Polls</h3>
                <p>
                  Articles may include interactive choice polls. When you vote in a poll:
                </p>
                <ul>
                  <li>
                    <strong>No Account Required:</strong> You do not log in or provide personal details.
                  </li>
                  <li>
                    <strong>Pseudonymous Token:</strong> Your browser creates a random 20-character
                    token stored in local storage (<code>poll-voter</code>) to let you view, change, or
                    retract your vote.
                  </li>
                  <li>
                    <strong>One-Way Hashing:</strong> On the server, your token is combined with the poll
                    ID and converted into a SHA-256 cryptographic hash. The raw token is never stored in
                    our database.
                  </li>
                  <li>
                    <strong>No IP Logging:</strong> Votes are stored without IP addresses. To prevent
                    burst voting attacks, an ephemeral hash of your IP is kept in memory/KV for at most
                    120 seconds to enforce a rate limit of 10 votes per minute, after which it is purged.
                  </li>
                  <li>
                    <strong>Functional Cookie:</strong> A strictly functional HttpOnly, Secure,
                    SameSite=Lax cookie (<code>poll_&lt;id&gt;</code>) is issued to prevent duplicate
                    ballots.
                  </li>
                </ul>

                <Callout type="tip" icon="🔐">
                  <strong>Cryptographic Privacy:</strong> Your voter pseudonym never leaves your browser in cleartext.
                  Our Cloudflare worker verifies HMAC SHA-256 signatures at the edge so even database operators cannot
                  link individual votes back to visitor devices.
                </Callout>

                <h3 id="privacy-preserving-telemetry">Privacy-Preserving Telemetry &amp; Analytics</h3>
                <p>
                  To understand how readers discover articles and verify that pages load properly, we
                  use privacy-first analytics:
                </p>
                <ul>
                  <li>
                    <strong>First-Party Cookieless PostHog:</strong> Ingested through our own origin
                    reverse proxy (<code>/ingest</code>), which strips all cookies and authorization
                    headers before forwarding.
                  </li>
                  <li>
                    <strong>No Cookies &amp; No Profiles:</strong> Initialized with{" "}
                    <code>cookieless_mode: &apos;always&apos;</code> and{" "}
                    <code>person_profiles: &apos;never&apos;</code>.
                  </li>
                  <li>
                    <strong>No Session Replay:</strong> Session recording is disabled (
                    <code>disable_session_recording: true</code>).
                  </li>
                  <li>
                    <strong>Parameter Scrubbing:</strong> Query strings, URL fragments, search keywords,
                    and tracking parameters (such as <code>utm_*</code>, <code>gclid</code>, and{" "}
                    <code>fbclid</code>) are stripped client-side prior to dispatch.
                  </li>
                  <li>
                    <strong>Respect for Signals:</strong> We honor Do Not Track (DNT) headers and the
                    Global Privacy Control (GPC) standard.
                  </li>
                  <li>
                    <strong>Instant Opt-Out:</strong> You can opt out at any time using the toggle at the
                    bottom of every page, which instantly stores your refusal and halts event dispatch.
                  </li>
                  <li>
                    <strong>Cloudflare Web Analytics:</strong> Cookieless, privacy-preserving aggregate
                    metrics provided by Cloudflare without storing client-side state.
                  </li>
                </ul>

                <h3 id="third-party-embeds">Third-Party Embeds</h3>
                <p>
                  Occasionally, technical posts reference third-party demonstrations or social posts
                  (e.g., YouTube videos, Threads, or Facebook updates).
                </p>
                <ul>
                  <li>
                    YouTube videos are embedded exclusively through the privacy-enhanced domain{" "}
                    <code>https://www.youtube-nocookie.com</code>.
                  </li>
                  <li>
                    Social embeds run inside sandboxed iframes governed by Content Security Policy
                    restrictions.
                  </li>
                </ul>

                <h2 id="cookies-and-local-storage">3. Cookies and Local Storage</h2>
                <p>
                  We do not set any advertising, tracking, or marketing cookies. We only use strictly
                  necessary functional state (such as recording your dark/light theme preference, sound
                  toggle preference, your poll vote, or your analytics opt-out). For full technical
                  details, see our <Link href="/cookies">Cookie Policy</Link>.
                </p>

                <h2 id="legal-bases-for-processing">4. Legal Bases for Processing (GDPR &amp; CCPA)</h2>
                <p>
                  For readers in the European Economic Area (EEA), United Kingdom, and jurisdictions with
                  comparable data protection regimes:
                </p>
                <ul>
                  <li>
                    <strong>Legitimate Interests:</strong> We operate strictly necessary infrastructure,
                    prevent automated abuse and DDoS attacks, and measure aggregate page reach using
                    cookieless, de-identified telemetry under Art. 6(1)(f) GDPR.
                  </li>
                  <li>
                    <strong>Consent:</strong> Where voluntary communication occurs (such as an email
                    inquiry or casting a poll vote), processing occurs on the basis of your affirmative
                    action.
                  </li>
                </ul>

                <h2 id="data-retention-security">5. Data Retention &amp; Security</h2>
                <p>
                  All network communication is encrypted in transit using modern TLS (with HSTS preload
                  enforced). Secrets and administrative credentials reside solely on secured edge servers
                  and are never exposed to browser bundles. Ephemeral rate-limiting tokens expire within
                  two minutes. Reader poll votes persist in Cloudflare KV without personal identifiers.
                </p>

                <h2 id="your-rights">6. Your Rights</h2>
                <p>
                  Under GDPR, CCPA/CPRA, and applicable data privacy laws, you have the right to request
                  access to, rectification of, or erasure of any personal data we hold about you. Because
                  we do not maintain visitor accounts or identifiable visitor profiles, we cannot link
                  browsing logs or poll tallies to individual identities.
                </p>
                <p>
                  To exercise any data rights regarding direct email correspondence, please contact{" "}
                  <a href="mailto:jannazarene09@gmail.com">jannazarene09@gmail.com</a>.
                </p>

                <h2 id="updates-to-this-policy">7. Updates to This Policy</h2>
                <p>
                  Any modifications to this privacy policy will be published directly at this URL with an
                  updated effective date and reflected in our version control history.
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
