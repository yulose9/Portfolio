import type { Author } from "../../../cms/format";

/**
 * Who wrote it: stacked avatars, then the names ("A", "A and B", "A, B and
 * C"), each a mailto link when the author gave an email. Shared by the
 * article page and the editor, so the byline you edit is the one you publish.
 */

export function joinNames(names: React.ReactNode[]): React.ReactNode[] {
  return names.flatMap((name, i) => {
    if (i === 0) return [name];
    return [i === names.length - 1 ? " and " : ", ", name];
  });
}

export function Avatars({ authors }: { authors: Author[] }) {
  return (
    <span className="article-avatars" aria-hidden="true">
      {authors.map((a, i) =>
        a.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={a.avatar} alt="" width={28} height={28} className="article-avatar" />
        ) : (
          <span key={i} className="article-avatar article-avatar-initial">
            {a.name.trim().charAt(0).toUpperCase()}
          </span>
        )
      )}
    </span>
  );
}

export default function Byline({
  authors,
  minutes,
  updated,
  updatedLabel,
}: {
  authors: Author[];
  minutes: number;
  updated: string | null;
  updatedLabel: string | null;
}) {
  return (
    <div className="article-byline">
      <Avatars authors={authors} />
      <span className="article-author">
        {joinNames(
          authors.map((a, i) =>
            a.email ? (
              <a key={i} href={`mailto:${a.email}`} className="article-author-link">
                {a.name}
              </a>
            ) : (
              <span key={i}>{a.name}</span>
            )
          )
        )}
      </span>
      <span aria-hidden="true">·</span>
      <span>{minutes} min read</span>
      {updated && updatedLabel ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Updated <time dateTime={updated}>{updatedLabel}</time>
          </span>
        </>
      ) : null}
    </div>
  );
}
