import BoringAvatar from "boring-avatars";

import type { Author } from "../../../cms/format";

/*
 * An author's face: an uploaded photo, or a generated avatar — soft abstract
 * shapes in Claude's warm palette (terracotta, clay, cream, ink), stored as
 * "gen:<style>:<seed>" so it's the same picture on every page and nothing
 * has to be uploaded. With neither, the name's first letter.
 */

export const AVATAR_STYLES = ["marble", "beam", "sunset", "bauhaus", "ring", "pixel"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

const PALETTE = ["#D97757", "#F0E6DA", "#C15F3C", "#E8C9A9", "#3D3929"];

export function parseGenerated(avatar: string | undefined): { style: AvatarStyle; seed: string } | null {
  const m = /^gen:([a-z]+):([\w-]{1,64})$/.exec(avatar ?? "");
  if (!m || !(AVATAR_STYLES as readonly string[]).includes(m[1])) return null;
  return { style: m[1] as AvatarStyle, seed: m[2] };
}

export function randomAvatar(style?: AvatarStyle): string {
  const s = style ?? AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");
  return `gen:${s}:${seed}`;
}

export default function Avatar({ author, size = 28, className = "article-avatar" }: { author: Author; size?: number; className?: string }) {
  const gen = parseGenerated(author.avatar);
  if (gen) {
    return (
      <span className={`${className} avatar-gen`} style={{ width: size, height: size }} aria-hidden="true">
        <BoringAvatar name={gen.seed} variant={gen.style} colors={PALETTE} size={size} />
      </span>
    );
  }
  if (author.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={author.avatar} alt="" width={size} height={size} className={className} loading="lazy" />;
  }
  return (
    <span className={`${className} article-avatar-initial`} style={{ width: size, height: size }} aria-hidden="true">
      {(author.name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
