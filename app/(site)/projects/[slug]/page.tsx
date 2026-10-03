import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publishedProjects, projectTree } from "../../../lib/projects";
import ArticleBody from "../../../components/writing/ArticleBody";
import ArticleEnhance from "../../../components/writing/ArticleEnhance";
import Toc from "../../../components/writing/Toc";
import { outline } from "../../../../cms/render";
import { SITE_INFO } from "../../../constants/seo";
import { fontLinks, inlineFontLinks, fontVars } from "../../../../cms/fonts";
export const dynamicParams = false;
export function generateStaticParams() { const pages = publishedProjects(); return pages.length ? pages.map(p => ({ slug: p.slug })) : [{ slug: "_" }]; }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = publishedProjects().find(p => p.slug === slug);
  return post ? { title: post.title, description: post.dek, alternates: { canonical: `/projects/${post.slug}` }, openGraph: { title: post.title, description: post.dek, url: `${SITE_INFO.url}/projects/${post.slug}`, ...(post.cover ? { images: [{ url: post.cover.src, alt: post.cover.alt }] } : {}) } } : { robots: { index: false } };
}
export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const pages = publishedProjects(); const page = pages.find(p => p.slug === slug);
  if (!page) notFound();
  const tree = await projectTree(page); const headings = outline(tree);
  const ancestors = []; let parent = page.parentId;
  while (parent) { const found = pages.find(p => p.id === parent); if (!found) break; ancestors.unshift(found); parent = found.parentId; }
  const children = pages.filter(p => p.parentId === page.id);
  return <>{[...new Set([...fontLinks(page.fonts), ...inlineFontLinks(page.body)])].map(href => <link key={href} rel="stylesheet" href={href} precedence="default"/>)}<main style={fontVars(page.fonts) as React.CSSProperties} className="project-article page-shell" data-content-id={page.id} data-content-kind="project"><nav aria-label="Breadcrumbs"><Link href="/projects">Projects</Link>{ancestors.map(p => <span key={p.id}> / <Link href={`/projects/${p.slug}`}>{p.title}</Link></span>)}</nav><header><h1>{page.title}</h1>{page.dek && <p className="project-dek">{page.dek}</p>}<div className="project-facts">{page.project?.role && <span>{page.project.role}</span>}{page.project?.timeframe && <span>{page.project.timeframe}</span>}{page.project?.tools.map(tool => <span key={tool}>{tool}</span>)}</div>{page.project?.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="project-external">{link.label} ↗</a>)}</header>{page.cover && <img className="project-cover" src={page.cover.src} alt={page.cover.alt} width={page.cover.width} height={page.cover.height}/>}<div className="project-reading"><article className="article-body" data-reading-body><ArticleBody tree={tree}/></article>{headings.length > 1 && <aside><Toc items={headings}/></aside>}</div>{!!page.project?.outcomes.length && <section><h2>Outcomes</h2><ul>{page.project.outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul></section>}{children.length > 0 && <section><h2>Explore this project</h2>{children.map(child => <p key={child.id}><Link href={`/projects/${child.slug}`}>{child.title} →</Link></p>)}</section>}<ArticleEnhance/></main></>;
}
