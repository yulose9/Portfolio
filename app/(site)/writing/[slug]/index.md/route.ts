import { serializePost } from "../../../../../cms/format";
import { pagedPosts, postBySlug } from "../../../../lib/writing";

/*
 * /writing/<slug>/index.md — the post as the Markdown it was written in,
 * front matter included. For "Copy as Markdown" on the page, and for
 * assistants that prefer the source to the rendered HTML (linked from the
 * page as rel="alternate" type="text/markdown").
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const posts = pagedPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) return new Response("Not found", { status: 404 });
  return new Response(serializePost(post), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
