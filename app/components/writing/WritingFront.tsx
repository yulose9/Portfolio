import { NotePencil } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { Listed } from "../../lib/writing";
import FluentText from "./FluentText";
import HighlightList from "./HighlightList";
import WritingArchive, { type ArchiveRow } from "./WritingArchive";

/*
 * The Writing index's front page, given its posts (newest first).
 *
 * Latest first, the way a newsroom front page reads: the newest post large on
 * the left, the next few as compact rows on the right, and everything older
 * in a quiet archive below (filterable by year once there are several). A
 * listed-only note is never featured; in the archive it is its title and
 * date, not a link.
 *
 * Media: a post's cover, else its emoji on a soft tile, else nothing (the
 * row is text). The generated share cards are not used: they repeat the
 * title the row already shows.
 */

/** How many posts sit beside the featured one before the archive starts. */
const SIDE = 3;

const shortDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
const yearOf = (iso: string) => new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date(iso));

export default function WritingFront({ posts }: { posts: Listed[] }) {
  // Only posts with a page can lead; notes go straight to the archive.
  const leads = posts.filter((p) => p.page);
  const featured = leads[0] ?? null;
  const side = leads.slice(1, 1 + SIDE);
  const above = new Set([featured, ...side].filter((p): p is Listed => Boolean(p)).map((p) => p.id));
  const archive: ArchiveRow[] = posts
    .filter((p) => !above.has(p.id))
    .map((p) => ({
      id: p.id,
      href: p.page ? `/writing/${p.slug}` : null,
      title: <FluentText>{p.title}</FluentText>,
      dek: p.dek,
      date: shortDate.format(new Date(p.publishedAt)),
      dateTime: p.publishedAt,
      year: yearOf(p.publishedAt),
      tag: p.tags[0] ?? null,
      minutes: p.minutes,
      media: <Thumbnail post={p} />,
    }));

  return (
    <>
        <header className="wi-header panel-chunk" data-cursor="text" style={{ "--i": 0 } as React.CSSProperties}>
          <h1 className="wi-title">Writing</h1>
          <p className="wi-dek">Some technical, some personal: notes on building AI systems and the infrastructure under them, and on whatever else I’m working out.</p>
          {posts.length > 0 ? (
            <p className="wi-meta">
              <a href="/feed.xml">RSS</a>
              <span>
                {posts.length} {posts.length === 1 ? "entry" : "entries"}
              </span>
            </p>
          ) : null}
        </header>

        {featured ? (
          <section className="wi-latest" aria-label="Latest">
            <Link href={`/writing/${featured.slug}`} className="wi-feature panel-chunk" style={{ "--i": 1 } as React.CSSProperties}>
              <Meta post={featured} />
              <h2 className="wi-feature-title">
                <FluentText>{featured.title}</FluentText>
              </h2>
              {featured.dek ? <p className="wi-feature-dek">{featured.dek}</p> : null}
              <LeadPicture post={featured} />
            </Link>

            {side.length ? (
              <HighlightList className="wi-side" start={2}>
                {side.map((p) => (
                  <Link key={p.id} href={`/writing/${p.slug}`} className="wi-side-row">
                      <span className="wi-side-text">
                        <h2 className="wi-side-title">
                          <FluentText>{p.title}</FluentText>
                        </h2>
                        {p.dek ? <span className="wi-side-dek">{p.dek}</span> : null}
                        <Meta post={p} />
                      </span>
                      <Thumbnail post={p} />
                    </Link>
                ))}
              </HighlightList>
            ) : null}
          </section>
        ) : null}

        {archive.length ? <WritingArchive rows={archive} start={2 + side.length} /> : null}

        {posts.length === 0 ? (
          <section className="writing-empty" aria-labelledby="writing-empty-title">
            <NotePencil className="writing-empty-icon" size={32} weight="light" aria-hidden="true" />
            <div data-cursor="text">
              <h2 id="writing-empty-title">Nothing published yet.</h2>
              <p>New posts will appear here. In the meantime, take a look at what I’ve been building.</p>
            </div>
            <Link href="/#projects" className="writing-button">View projects</Link>
          </section>
        ) : null}
    </>
  );
}

/** Date, tag (the first one) and reading time: the line under a title. */
function Meta({ post }: { post: Listed }) {
  return (
    <span className="wi-meta-line">
      <time dateTime={post.publishedAt}>{shortDate.format(new Date(post.publishedAt))}</time>
      {post.tags[0] ? <span>{post.tags[0]}</span> : null}
      <span>{post.minutes} min read</span>
    </span>
  );
}

/*
 * A post's picture: its cover, else its emoji on the glass tile, else
 * nothing. Two explicit variants rather than a size flag: the lead's large
 * picture (loaded first) and a row's small thumbnail.
 */
function PostPicture({ post, className, lead }: { post: Listed; className: string; lead: boolean }) {
  if (post.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={className}
        src={post.cover.src}
        alt=""
        width={post.cover.width}
        height={post.cover.height}
        loading={lead ? "eager" : "lazy"}
        fetchPriority={lead ? "high" : undefined}
        decoding="async"
      />
    );
  }
  if (post.icon) {
    return (
      <span className={`${className} wi-media-icon`} aria-hidden="true">
        <FluentText>{post.icon}</FluentText>
      </span>
    );
  }
  return null;
}

/** The lead post's large picture. */
function LeadPicture({ post }: { post: Listed }) {
  return <PostPicture post={post} className="wi-media wi-media-large" lead />;
}

/** A row's small square thumbnail. */
function Thumbnail({ post }: { post: Listed }) {
  return <PostPicture post={post} className="wi-media" lead={false} />;
}
