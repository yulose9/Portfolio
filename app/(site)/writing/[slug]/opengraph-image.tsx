import { ImageResponse } from "next/og";

import { formatLongDate, pagedPosts, postBySlug } from "../../../lib/writing";

/*
 * The share card for a post, drawn at build time (1200×630): what shows when
 * the link is pasted into X, LinkedIn, Slack, iMessage. The site's type and
 * greys, the headline large, the standfirst under it, the byline at the foot.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Article preview";
export const dynamic = "force-static";

export function generateStaticParams() {
  const posts = pagedPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

/** Inter from Google Fonts as TTF (what the renderer can read); the built-in face if offline. */
async function inter(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`)).text();
    const url = /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  const [regular, semibold] = await Promise.all([inter(400), inter(600)]);
  const fonts = [
    ...(regular ? [{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(semibold ? [{ name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const }] : []),
  ];
  const title = post?.title ?? "Writing";
  const long = title.length > 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#ffffff",
          fontFamily: "Inter",
          color: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#a1a1aa" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#0a0a0a" }} />
          nazarene.dev/writing
          {post?.tags[0] ? <span style={{ color: "#52525b" }}>{`· ${post.tags[0]}`}</span> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: long ? 64 : 80, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 1000 }}>{title}</div>
          {post?.dek ? (
            <div style={{ fontSize: 32, lineHeight: 1.35, color: "#52525b", maxWidth: 960 }}>{post.dek.length > 140 ? `${post.dek.slice(0, 137)}…` : post.dek}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#52525b" }}>
          <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{post?.authors.map((a) => a.name).join(", ") ?? "John Nazarene Dela Pisa"}</span>
          <span>{post ? `${formatLongDate(post.publishedAt)} · ${post.minutes} min read` : ""}</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
