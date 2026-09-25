import Link from "next/link";

import type { Author } from "../../../cms/format";
import { SITE_INFO, SOCIAL_LINKS } from "../../constants/seo";
import { PROFILE } from "../../site-content";

/**
 * Who wrote this, at the end of the piece: a face, a name, one line of what
 * they do, and where else to find them. It's for readers who want to know
 * whose judgement they just read, and it's the "who" signal search and answer
 * engines look for (rel="author", the same identity sentence as everywhere).
 */
export default function AuthorCard({ authors }: { authors: Author[] }) {
  return (
    <section className="author-card" aria-label={authors.length > 1 ? "About the authors" : "About the author"}>
      {authors.map((a) => {
        const me = a.name === SITE_INFO.name;
        return (
          <div key={a.name} className="author-card-row">
            {a.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="author-card-photo" src={me ? "/avatar-144.webp" : a.avatar} alt="" width={56} height={56} loading="lazy" />
            ) : (
              <span className="author-card-photo author-card-initial" aria-hidden="true">
                {a.name.charAt(0)}
              </span>
            )}
            <div className="author-card-text">
              <p className="author-card-name">
                {me ? (
                  <Link href="/" rel="author">
                    {a.name}
                  </Link>
                ) : (
                  a.name
                )}
              </p>
              <p className="author-card-bio">
                {me
                  ? `${PROFILE.rolePrefix} ${PROFILE.employer}, building agentic systems and the infrastructure they run on.`
                  : a.email
                    ? <a href={`mailto:${a.email}`}>{a.email}</a>
                    : null}
              </p>
              {me ? (
                <p className="author-card-links">
                  <a href={SOCIAL_LINKS.linkedin} rel="me noreferrer" target="_blank">
                    LinkedIn
                  </a>
                  <a href={SOCIAL_LINKS.github} rel="me noreferrer" target="_blank">
                    GitHub
                  </a>
                  <a href={SOCIAL_LINKS.x} rel="me noreferrer" target="_blank">
                    X
                  </a>
                  <a href={`mailto:${SOCIAL_LINKS.email}`}>Email</a>
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
