/*
 * A tag, Notion-style: a soft pill whose colour comes from the tag's name, so
 * "Agents" is the same colour on every page and in the admin without anyone
 * choosing it. Nine quiet tints, all with dark text at WCAG AA contrast.
 */

const TINTS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;

export function tagTint(tag: string): (typeof TINTS)[number] {
  let h = 0;
  for (const ch of tag.toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return TINTS[h % TINTS.length];
}

export default function Tag({ name, href, count }: { name: string; href?: string; count?: number }) {
  const body = (
    <>
      {name}
      {count !== undefined ? <span className="tag-count">{count}</span> : null}
    </>
  );
  return href ? (
    <a className="tag" data-tint={tagTint(name)} href={href}>
      {body}
    </a>
  ) : (
    <span className="tag" data-tint={tagTint(name)}>
      {body}
    </span>
  );
}
