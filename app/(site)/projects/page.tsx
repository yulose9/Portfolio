import Link from "next/link";
import type { Metadata } from "next";
import { publishedProjects } from "../../lib/projects";
import { imageInfo } from "../../../cms/media";
export const metadata: Metadata = { title: "Projects", description: "Selected projects and the stories behind them.", alternates: { canonical: "/projects" } };
export default function Projects() {
  const projects = publishedProjects().filter(p => !p.parentId);
  return <main className="project-index page-shell"><Link href="/">← Home</Link><header><p>Selected work</p><h1>Projects</h1><p>Ideas, decisions, and the work behind them.</p></header>{projects.length ? <div className="project-cards">{projects.map((project, index) => <Link href={`/projects/${project.slug}`} key={project.id} className="project-card">{project.cover && <img src={project.cover.src} srcSet={imageInfo(project.cover.src)?.srcSet} sizes="(min-width: 761px) 474px, calc(100vw - 44px)" alt={project.cover.alt} width={project.cover.width} height={project.cover.height} loading={index < 2 ? undefined : "lazy"} decoding="async"/>}<div><h2>{project.title}</h2><p>{project.dek}</p><small>{project.project?.role}{project.project?.timeframe ? ` · ${project.project.timeframe}` : ""}</small></div></Link>)}</div> : <p>Case studies are on the way.</p>}</main>;
}
