/* eslint-disable @next/next/no-img-element -- the card renderer takes <img>, not next/image */
import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { fluentUrl } from "../../../../cms/emoji";
import { formatLongDate, pagedPosts, postBySlug } from "../../../lib/writing";

/*
 * The share card for a post, drawn at build time (1200×630): what shows when
 * the link is pasted into X, Threads, LinkedIn, WhatsApp, iMessage, Slack.
 * The site's type and greys; the page icon, the headline large, the
 * standfirst, the tags; my face and name at the foot.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Article preview";
export const dynamic = "force-static";

export function generateStaticParams() {
  const posts = pagedPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

/** Inter from Google Fonts as TTF (what the renderer reads); the built-in face if offline. */
async function inter(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`)).text();
    const url = /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const dataUrl = (buf: Buffer | Uint8Array, type = "image/png") => `data:${type};base64,${Buffer.from(buf).toString("base64")}`;

/** The page icon as a PNG (the card renderer can't read WebP); none if that fails. */
async function iconPng(emoji: string | null): Promise<string | null> {
  if (!emoji) return null;
  try {
    const webp = Buffer.from(await (await fetch(fluentUrl(emoji))).arrayBuffer());
    const sharp = (await import("sharp")).default;
    return dataUrl(await sharp(webp).resize(112, 112).png().toBuffer());
  } catch {
    return null;
  }
}

function face(): string | null {
  try {
    return dataUrl(fs.readFileSync(path.join(process.cwd(), "public", "og", "avatar.png")));
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  const [regular, semibold, icon] = await Promise.all([inter(400), inter(600), iconPng(post?.icon ?? null)]);
  const fonts = [
    ...(regular ? [{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(semibold ? [{ name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
  ];
  const title = post?.title ?? "Writing";
  const long = title.length > 56;
  const me = face();
  const authors = (post?.authors ?? []).filter((a) => a.name.trim());

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 80px", background: "#ffffff", fontFamily: "Inter", color: "#0a0a0a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#a1a1aa" }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#0a0a0a" }} />
            nazarene.dev/writing
          </div>
          {icon ? <img src={icon} width={96} height={96} alt="" /> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: long ? 62 : 78, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 1040 }}>{title}</div>
          {post?.dek ? <div style={{ fontSize: 30, lineHeight: 1.35, color: "#52525b", maxWidth: 980 }}>{post.dek.length > 140 ? `${post.dek.slice(0, 137)}…` : post.dek}</div> : null}
          {post?.tags.length ? (
            <div style={{ display: "flex", gap: 10 }}>
              {post.tags.slice(0, 4).map((t) => (
                <div key={t} style={{ display: "flex", padding: "6px 16px", borderRadius: 999, background: "#f4f4f5", color: "#52525b", fontSize: 22 }}>
                  {t}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#52525b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {me ? <img src={me} width={56} height={56} style={{ borderRadius: 999 }} alt="" /> : null}
            <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{authors.map((a) => a.name).join(", ") || "John Nazarene Dela Pisa"}</span>
          </div>
          <span>{post ? `${formatLongDate(post.publishedAt)} · ${post.minutes} min read` : ""}</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
