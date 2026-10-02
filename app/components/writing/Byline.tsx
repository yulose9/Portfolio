import UpdatedAt from "../UpdatedAt";
import type { Author } from "../../../cms/format";
import Avatar from "./Avatar";
import { AvatarGroup } from "../kit/inputs/avatar-group";

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

/**
 * The faces. Several authors are a group: overlapping faces, each with its
 * name on hover or focus, and a +N for the rest. Inside a control (the
 * editor's byline is one button) the faces must stay decoration, so `still`
 * draws them without their own tab stops.
 */
export function Avatars({ authors, still = false }: { authors: Author[]; still?: boolean }) {
  if (!still && authors.length > 1)
    return (
      <AvatarGroup
        className="article-avatar-group"
        label="Authors"
        max={4}
        size={28}
        people={authors.map((a, i) => ({ id: String(i), name: a.name.trim() || "Co-author", avatar: <Avatar author={a} /> }))}
      />
    );
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
