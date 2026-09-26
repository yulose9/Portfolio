import UpdatedAt from "../UpdatedAt";
import type { Author } from "../../../cms/format";
import Avatar from "./Avatar";

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
      {authors.map((a, i) => (
        <Avatar key={i} author={a} />
      ))}
    </span>
  );
}

/** Only the authors who gave a name are named; an avatar alone still shows. */
export const named = (authors: Author[]) => authors.filter((a) => a.name.trim());

export default function Byline({
  authors,
  minutes,
  updated,
}: {
  authors: Author[];
  minutes: number;
  updated: string | null;
}) {
  return (
    <div className="article-byline">
      <Avatars authors={authors} />
      <span className="article-author">
        {joinNames(
          named(authors).map((a, i) =>
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
      {updated ? (
        <>
          <span aria-hidden="true">·</span>
          <UpdatedAt at={updated} />
        </>
      ) : null}
    </div>
  );
}
