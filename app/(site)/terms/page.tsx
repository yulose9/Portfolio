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
  title: "Terms and Conditions",
  description:
    "Terms of service and use for nazarene.dev: intellectual property, permissible use, code licensing, and disclaimers.",
  alternates: { canonical: "/terms" },
  openGraph: {
    ...OG_METADATA,
    title: `Terms and Conditions · ${SITE_INFO.name}`,
    description:
      "Terms of service and use for nazarene.dev: intellectual property, permissible use, code licensing, and disclaimers.",
    url: `${SITE_INFO.url}/terms`,
  },
  twitter: {
    ...TWITTER_METADATA,
    title: `Terms and Conditions · ${SITE_INFO.name}`,
    description:
      "Terms of service and use for nazarene.dev: intellectual property, permissible use, code licensing, and disclaimers.",
  },
};

const TOC_ITEMS: OutlineItem[] = [
  { id: "introduction-acceptance", text: "Introduction & Acceptance", depth: 2, icon: "📜" },
  { id: "intellectual-property", text: "Intellectual Property & Use", depth: 2, icon: "💡" },
  { id: "written-content", text: "Written Content & Articles", depth: 3, icon: "✍️" },
  { id: "code-snippets", text: "Code Snippets & Open Source", depth: 3, icon: "💻" },
  { id: "automated-agents", text: "Automated Agents & AI Retrieval", depth: 3, icon: "🤖" },
  { id: "prohibited-conduct", text: "Prohibited Conduct", depth: 2, icon: "🚫" },
  { id: "third-party-links", text: "Third-Party Links & Services", depth: 2, icon: "🔗" },
  { id: "disclaimers-liability", text: "Disclaimers & Liability", depth: 2, icon: "⚠️" },
  { id: "modifications-to-terms", text: "Modifications to Terms", depth: 2, icon: "🔄" },
  { id: "contact", text: "Contact Information", depth: 2, icon: "✉️" },
];

export default function TermsPage() {
  return (
    <DocumentMenu title="Terms and Conditions" url="https://nazarene.dev/terms">
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
              <li aria-current="page">Terms and Conditions</li>
            </ol>
          </nav>

          <header data-cursor="text" className="article-header mb-12">
            <h1 data-cursor="text" className="article-title text-3xl font-semibold tracking-tight text-[color:var(--fg)]">
              Terms and Conditions
            </h1>
            <p data-cursor="text" className="article-dek text-base text-[color:var(--fg-2)] leading-relaxed">
              The rules and principles governing your use of nazarene.dev and its published works.
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
              <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                Open Source &amp; AI Friendly
              </span>
            </div>
          </header>

          <article className="article" data-has-toc="">
            <div className="article-main">
              <Toc items={TOC_ITEMS} />

              <div data-cursor="text" className="article-body">
                <Callout type="note" icon="📜">
                  <strong>Open Engineering Journal:</strong> This website is an open technical publication.
                  Visitors are encouraged to learn from, reference, and experiment with the concepts and architecture
                  shared here under mutual professional respect.
                </Callout>

                <h2 id="introduction-acceptance">1. Introduction &amp; Acceptance</h2>
                <p>
                  Welcome to <strong>nazarene.dev</strong> (the &ldquo;Website&rdquo;), operated by John Nazarene
                  Dela Pisa (&ldquo;I&rdquo;, &ldquo;me&rdquo;, or &ldquo;author&rdquo;). By accessing, browsing,
                  or reading this Website, you acknowledge that you have read, understood, and agreed to be
                  bound by these Terms and Conditions and our accompanying{" "}
                  <Link href="/privacy">Privacy Policy</Link> and{" "}
                  <Link href="/cookies">Cookie Policy</Link>.
                </p>
                <p>
                  If you do not agree to these terms, your sole recourse is to discontinue using the Website.
                </p>

                <h2 id="intellectual-property">2. Intellectual Property &amp; Permissible Use</h2>

                <h3 id="written-content">Written Content &amp; Articles</h3>
                <p>
                  All original prose, essays, case studies, architecture diagrams, and custom graphics
                  published on this Website are the intellectual property of John Nazarene Dela Pisa unless
                  explicitly attributed to third parties. You may quote brief excerpts in reviews,
                  commentaries, or research papers provided that clear attribution and a direct link back
                  to the original URL on nazarene.dev are provided.
                </p>

                <h3 id="code-snippets">Code Snippets &amp; Open Source</h3>
                <p>
                  Code samples, script snippets, and technical configurations shared in articles and
                  tutorials are provided for educational and practical use under the terms of the open-source
                  license specified in the repository (or under the ISC/MIT license where unspecified). You
                  are free to adapt and incorporate these snippets into your personal or commercial software
                  projects at your own discretion and risk.
                </p>

                <Callout type="tip" icon="💻">
                  <strong>Permissive Snippets:</strong> Code snippets and design tokens presented in technical
                  case studies are engineered for real-world production use and may be reused in your own projects
                  without onerous licensing constraints.
                </Callout>

                <h3 id="automated-agents">Automated Agents &amp; AI Retrieval</h3>
                <p>
                  Automated crawlers, search indexing engines, and artificial intelligence agents are
                  expressly welcome to read, parse, and cite content from this Website. To facilitate
                  structured retrieval, we publish machine-readable indexes at{" "}
                  <code>/llms.txt</code>, <code>/llms-full.txt</code>, and RFC 9727 linkset discovery
                  endpoints at <code>/.well-known/api-catalog</code>.
                </p>

                <h2 id="prohibited-conduct">3. Prohibited Conduct</h2>
                <p>When accessing or interacting with this Website, you agree not to:</p>
                <ul>
                  <li>
                    Attempt to probe, scan, or breach administrative endpoints or bypass Cloudflare Access
                    authentication boundaries.
                  </li>
                  <li>
                    Send automated bursts or scripted votes designed to overwhelm reader poll endpoints
                    or skew public tallies.
                  </li>
                  <li>
                    Use any automated tool to flood, disrupt, or launch denial-of-service (DoS/DDoS)
                    attacks against the hosting infrastructure.
                  </li>
                  <li>
                    Misrepresent your affiliation with the author or falsely claim endorsement.
                  </li>
                </ul>

                <h2 id="third-party-links">4. Third-Party Links &amp; Embedded Services</h2>
                <p>
                  This Website may contain links to external third-party websites, code repositories, or
                  services (e.g., GitHub, AWS documentation, LinkedIn, X). These links are provided solely
                  as informational references. I do not endorse, guarantee, or assume responsibility for the
                  content, privacy practices, or availability of any third-party resources.
                </p>

                <h2 id="disclaimers-liability">5. Disclaimers &amp; Limitation of Liability</h2>
                <p>
                  All content, opinions, guides, and architectural designs provided on this Website are
                  offered strictly on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis, without
                  warranties of any kind, either express or implied.
                </p>
                <p>
                  In no event shall the author be liable for any direct, indirect, incidental, consequential,
                  special, or exemplary damages—including but not limited to loss of data, production outages,
                  cloud infrastructure billing unexpected surges, or hardware failures—arising out of the use
                  or inability to use the information or code published here.
                </p>

                <h2 id="modifications-to-terms">6. Modifications to Terms</h2>
                <p>
                  I reserve the right to revise these Terms and Conditions at any time. Any changes will be
                  committed directly to the public version control repository and will be effective
                  immediately upon deployment.
                </p>

                <h2 id="contact">7. Contact</h2>
                <p>
                  If you have any questions or concerns regarding these Terms and Conditions, you may reach
                  out by email to{" "}
                  <a href="mailto:jannazarene09@gmail.com">jannazarene09@gmail.com</a>.
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
