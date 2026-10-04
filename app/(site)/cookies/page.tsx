import type { Metadata } from "next";
import Link from "next/link";
import { OG_METADATA, SITE_INFO, TWITTER_METADATA } from "../../constants/seo";

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

export default function CookiePolicy() {
  return (
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

        <header className="article-header mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--fg)]">
            Cookie Policy
          </h1>
          <p className="article-dek text-base text-[color:var(--fg-2)] leading-relaxed">
            Full disclosure of cookies, local storage identifiers, and our consent-free privacy
            architecture.
          </p>
          <div className="text-xs text-[color:var(--fg-3)]">
            Effective: October 2026 · Operator: John Nazarene Dela Pisa
          </div>
        </header>

        <div className="article-body">
          <h2>1. Why You Don&rsquo;t See an Annoying Cookie Banner</h2>
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

          <h2>2. Complete Inventory of Cookies and Storage</h2>
          <p>
            The table below lists every cookie and local storage key that may be read or written by
            this Website:
          </p>

          <div className="table-scroll my-6 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--line-strong)] text-[color:var(--fg)]">
                  <th className="py-2.5 pr-4 font-semibold">Key / Cookie Name</th>
                  <th className="py-2.5 pr-4 font-semibold">Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Lifespan</th>
                  <th className="py-2.5 font-semibold">Purpose & Necessity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)] text-[color:var(--fg-2)]">
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-[color:var(--fg)]">
                    poll_&lt;id&gt;
                  </td>
                  <td className="py-3 pr-4">HTTP Cookie (HttpOnly, Secure, SameSite=Lax)</td>
                  <td className="py-3 pr-4">1 year</td>
                  <td className="py-3">
                    <strong>Strictly Necessary.</strong> Set only when you choose to cast a ballot
                    in an article choice poll. Prevents duplicate votes and verifies your vote hash
                    at the edge.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-[color:var(--fg)]">
                    poll-voter
                  </td>
                  <td className="py-3 pr-4">Local Storage</td>
                  <td className="py-3 pr-4">Persistent</td>
                  <td className="py-3">
                    <strong>Functional.</strong> Stores a random 20-character pseudonym generated on
                    your client device, enabling you to inspect or retract your vote later.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-[color:var(--fg)]">
                    portfolio:analytics-opt-out
                  </td>
                  <td className="py-3 pr-4">Local Storage</td>
                  <td className="py-3 pr-4">Persistent</td>
                  <td className="py-3">
                    <strong>Functional Preference.</strong> Remembers whether you clicked the
                    &ldquo;Opt out of analytics&rdquo; button, preventing any future metric
                    dispatch.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-[color:var(--fg)]">
                    data-theme
                  </td>
                  <td className="py-3 pr-4">Local Storage</td>
                  <td className="py-3 pr-4">Persistent</td>
                  <td className="py-3">
                    <strong>Functional Preference.</strong> Saves your chosen interface theme
                    (light or dark) to eliminate screen flash on subsequent visits.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-[color:var(--fg)]">
                    portfolio:sound
                  </td>
                  <td className="py-3 pr-4">Local Storage</td>
                  <td className="py-3 pr-4">Persistent</td>
                  <td className="py-3">
                    <strong>Functional Preference.</strong> Remembers whether you toggled the sound
                    effects audio toggle on or off.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>3. Third-Party Analytics Architecture</h2>
          <p>
            Many analytics platforms drop third-party tracking cookies to identify visitors across
            multiple websites. We reject that approach:
          </p>
          <ul>
            <li>
              <strong>Cookieless PostHog:</strong> Initialized with{" "}
              <code>cookieless_mode: &apos;always&apos;</code>. No PostHog cookies are created or
              stored on your machine. Person profiling is permanently turned off (
              <code>person_profiles: &apos;never&apos;</code>).
            </li>
            <li>
              <strong>Cloudflare Web Analytics:</strong> Injected via a lightweight script (
              <code>static.cloudflareinsights.com/beacon.min.js</code>). It does not use any
              cookies or local storage, collecting only non-identifying aggregate metrics at the edge.
            </li>
            <li>
              <strong>Disabled Third Parties:</strong> Commercial tracking suites (Google Analytics,
              Microsoft Clarity, Mixpanel) are strictly disabled in production builds.
            </li>
          </ul>

          <h2>4. Managing and Clearing Your Preferences</h2>
          <p>
            You retain absolute control over your local browser storage:
          </p>
          <ul>
            <li>
              <strong>Analytics Opt-Out:</strong> Click the &ldquo;Opt out of analytics&rdquo;
              button in the footer of any page to disable all metric dispatch immediately.
            </li>
            <li>
              <strong>Browser Controls:</strong> You can wipe cookies and local storage at any time
              through your browser&rsquo;s settings:
              <ul>
                <li><strong>Chrome / Brave / Edge:</strong> Settings → Privacy and Security → Clear browsing data → Cookies and other site data.</li>
                <li><strong>Safari:</strong> Settings → Safari → Advanced → Website Data → Remove All Website Data.</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Clear Data.</li>
              </ul>
            </li>
          </ul>

          <h2>5. Contact</h2>
          <p>
            For any technical questions regarding how cookies and local state operate on this site,
            contact <a href="mailto:jannazarene09@gmail.com">jannazarene09@gmail.com</a> or read our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
