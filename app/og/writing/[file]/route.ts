import { drawPostCard } from "../../../lib/og-card";
import { pagedPosts, postBySlug } from "../../../lib/writing";

/*
 * /og/writing/<slug>.png — each post's share card, written to out/ at build.
 * New posts get one automatically: the params come from content/writing.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const posts = pagedPosts();
  return posts.length ? posts.map((p) => ({ file: `${p.slug}.png` })) : [{ file: "_.png" }];
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const slug = (await params).file.replace(/\.png$/, "");
  const res = await drawPostCard(postBySlug(slug));
  return new Response(await res.arrayBuffer(), { headers: { "Content-Type": "image/png" } });
}
