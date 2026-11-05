import { serializePost } from "../../../../../cms/format";
import { publishedProjects } from "../../../../lib/projects";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  const projects = publishedProjects();
  return projects.length ? projects.map(p => ({ slug: p.slug })) : [{ slug: "_" }];
}
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = publishedProjects().find(p => p.slug === slug);
  if (!project) return new Response("Not found", { status: 404 });
  return new Response(serializePost(project), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
