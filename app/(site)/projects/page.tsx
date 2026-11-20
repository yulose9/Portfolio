import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";

import { publishedWebsite } from "../../../cms/website";
import ProjectShowcase, {
  type ShowcaseProfile,
  type ShowcaseProject,
} from "../../components/projects/ProjectShowcase";
import { publishedProjects } from "../../lib/projects";
import { SITE_SOCIAL_CARDS, pageSocialMetadata } from "../../lib/site-social";

export const metadata: Metadata = {
  title: "Projects",
  description: SITE_SOCIAL_CARDS.projects.description,
  alternates: { canonical: "/projects" },
  ...pageSocialMetadata(SITE_SOCIAL_CARDS.projects, "/projects"),
};

const exists = (file: string) => fs.existsSync(path.join(process.cwd(), "public", file));

/*
 * A project's assets, by convention in public/images/projects:
 *   <slug>-phone-1.webp … <slug>-phone-6.webp  phone screens, 393×852 at 2×
 *   <slug>-icon.png                            its site's icon, 128×128
 * Without screens the cover stands in; without an icon the panel uses a
 * case-study glyph.
 */
function screensFor(slug: string) {
  const screens: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const file = `/images/projects/${slug}-phone-${i}.webp`;
    if (exists(file)) screens.push(file);
  }
  return screens;
}

/**
 * "Idea in 2024 · … · Launched Oct 21, 2026" → "2024-2026": a plain hyphen,
 * the way the Work list on the home page writes its ranges.
 */
function yearsOf(timeframe: string, fallback: string) {
  const years = [...new Set(timeframe.match(/\b(19|20)\d{2}\b/g) ?? [])].sort();
  if (!years.length) return fallback;
  return years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;
}

export default function Projects() {
  const site = publishedWebsite;
  const email =
    site.tabs
      .flatMap((tab) => tab.links ?? [])
      .find((link) => link.icon === "email")
      ?.href.replace(/^mailto:/, "") ?? "";

  const profile: ShowcaseProfile = {
    name: site.profile.name,
    role: site.profile.rolePrefix.replace(/\s+at$/i, ""),
    email,
    avatar: site.profile.photo || "/avatar-1024.webp",
    place: site.profile.location,
    timeZone: "Asia/Manila",
  };

  const projects: ShowcaseProject[] = publishedProjects()
    .filter((p) => !p.parentId)
    .map((project) => {
      const details = project.project;
      const screens = screensFor(project.slug);
      const icon = `/images/projects/${project.slug}-icon.png`;
      return {
        slug: project.slug,
        title: project.title,
        role: details?.role || "Project",
        timeframe: details?.timeframe ?? "",
        years: yearsOf(details?.timeframe ?? "", project.publishedAt.slice(0, 4)),
        dek: project.dek,
        tools: details?.tools ?? [],
        links: (details?.links ?? []).filter((link) => link.href.startsWith("http")),
        // Where the app itself lives: its website link, or this site for the portfolio.
        site:
          (details?.links ?? []).find(
            (link) => link.href.startsWith("http") && !/changelog|release|github.com/i.test(`${link.label} ${link.href}`)
          )?.href ?? (project.slug === "this-portfolio-redesigned" ? "/" : null),
        siteNoun: project.slug === "this-portfolio-redesigned" ? "site" : "app",
        href: `/projects/${project.slug}`,
        icon: exists(icon) ? icon : null,
        screens: (screens.length ? screens : project.cover ? [project.cover.src] : []).map((src) => ({
          src,
          alt: `${project.title} screen`,
        })),
      };
    });

  // The home page in miniature, for the portfolio's live screen: its real
  // Work and Certificates rows, and this page's projects.
  const rowsOf = (id: string) =>
    (site.tabs.find((tab) => tab.id === id)?.items ?? []).map((item) => ({
      title: item.title,
      sub: item.company ?? "",
      meta: item.year,
    }));
  const portfolioDemo = {
    name: profile.name,
    role: `${site.profile.rolePrefix} ${site.profile.employer}`,
    avatar: profile.avatar,
    tabs: [
      { label: "Work", rows: rowsOf("work") },
      { label: "Projects", rows: projects.map((p) => ({ title: p.title, sub: p.role, meta: p.years })) },
      { label: "Certificates", rows: rowsOf("certificates").slice(0, 4) },
    ].filter((tab) => tab.rows.length),
  };

  return (
    <main id="main" tabIndex={-1} className="project-showcase w-full" data-cursor-frame>
      <ProjectShowcase projects={projects} profile={profile} portfolioDemo={portfolioDemo} />
    </main>
  );
}
