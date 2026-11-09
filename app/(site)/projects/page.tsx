import Link from "next/link";
import type { Metadata } from "next";
import { publishedProjects } from "../../lib/projects";
import { imageInfo } from "../../../cms/media";
import FluentText from "../../components/writing/FluentText";
import { pageIconSrc } from "../../../cms/page-icon";
import { SITE_SOCIAL_CARDS, pageSocialMetadata } from "../../lib/site-social";
export const metadata: Metadata = { title: "Projects", description: SITE_SOCIAL_CARDS.projects.description, alternates: { canonical: "/projects" }, ...pageSocialMetadata(SITE_SOCIAL_CARDS.projects, "/projects") };
export default function Projects() {
  const projects = publishedProjects().filter(p => !p.parentId);
  return <main id="main" tabIndex={-1} className="project-index page-shell article-shell article-page writing-index w-full max-w-[672px] py-16 sm:py-24" data-cursor-frame>
    <nav className="article-nav" aria-label="Breadcrumb"><ol className="breadcrumbs"><li><Link href="/">Home</Link></li><li aria-current="page">Projects</li></ol></nav>
    <header className="article-header">
      <h1 className="article-title">Projects</h1>
      <p className="article-dek">Things I’ve built, the decisions behind them, and what I learned along the way.</p>
      <div className="writing-index-meta"><span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span></div>
    </header>
    {projects.length ? <div className="project-cards">{projects.map((project, index) => <Link href={`/projects/${project.slug}`} key={project.id} className="project-card" data-sound="click">
      {project.cover && <img className="project-card-cover" src={project.cover.src} srcSet={imageInfo(project.cover.src)?.srcSet} sizes="(min-width: 768px) 576px, calc(100vw - 40px)" alt={project.cover.alt} width={project.cover.width} height={project.cover.height} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : undefined} decoding="async" />}
      <div><div className="project-card-heading"><h2><FluentText>{project.title}</FluentText></h2>{project.icon && <img className="project-card-icon" src={pageIconSrc(project.icon)} width={48} height={48} alt="" loading="lazy" decoding="async" />}</div><p><FluentText>{project.dek}</FluentText></p><small>{[project.project?.role, project.project?.timeframe].filter(Boolean).join(" · ")}</small></div>
    </Link>)}</div> : <p>Case studies are on the way.</p>}
  </main>;
}
