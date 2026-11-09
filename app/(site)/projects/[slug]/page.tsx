import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { publishedProjects, projectTree } from "../../../lib/projects";
import ArticleBody from "../../../components/writing/ArticleBody";
import ArticleEnhance from "../../../components/writing/ArticleEnhance";
import FluentText from "../../../components/writing/FluentText";
import ArticleMenu from "../../../components/writing/ArticleMenu";
import ShareRow from "../../../components/writing/ShareRow";
import Byline from "../../../components/writing/Byline";
import { SoundToggle } from "../../../components/ui/sound";
import { readingMinutes } from "../../../../cms/format";
import Toc from "../../../components/writing/Toc";
import ProjectProperties from "../../../components/projects/ProjectProperties";
import { ThemeToggle } from "../../../components/ui/theme";
import { outline, prioritizeLeadImage } from "../../../../cms/render";
import { imageInfo } from "../../../../cms/media";
import { jsonLd } from "../../../constants/seo";
import { projectSeo } from "../../../lib/project-seo";
import { pageIconSrc } from "../../../../cms/page-icon";
import { projectImageSizes, sizeProjectImages } from "../../../../cms/project-images";
import { fontLinks, inlineFontLinks, fontVars } from "../../../../cms/fonts";
import { showsSubtitle } from "../../../../cms/subtitle";
import { coverImageStyle } from "../../../../cms/cover";

export const dynamicParams = false;
export function generateStaticParams() {
  const pages = publishedProjects();
  return pages.length ? pages.map(page => ({ slug: page.slug })) : [{ slug: "_" }];
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = publishedProjects().find(page => page.slug === slug);
  return post ? projectSeo(post).metadata : { title: "Not found", robots: { index: false, follow: false } };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const pages = publishedProjects();
  const page = pages.find(project => project.slug === slug);
  if (!page) notFound();
  const tree = await projectTree(page);
  sizeProjectImages(tree);
  const headings = outline(tree);
  if (!page.cover) prioritizeLeadImage(tree);
  const { ancestors, graph, url } = projectSeo(page, pages);
  const icon = page.icon ? pageIconSrc(page.icon) : "";
  const children = pages.filter(project => project.parentId === page.id);
  const coverInfo = page.cover ? imageInfo(page.cover.src) : undefined;

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(graph)} />
    <div className="reading-progress" aria-hidden="true" />
    {[...new Set([...fontLinks(page.fonts), ...inlineFontLinks(page.body)])].map(href => <link key={href} rel="stylesheet" href={href} precedence="default" />)}
    <main id="main" tabIndex={-1} style={fontVars(page.fonts) as React.CSSProperties}
      className="project-article article-shell article-page page-shell" data-content-id={page.id} data-content-kind="project" data-cursor-frame>
      <nav className="project-breadcrumbs" aria-label="Breadcrumbs">
        <ol>
          <li><Link href="/projects"><ArrowLeft size={16} aria-hidden="true" />Projects</Link></li>
          {ancestors.map(project => <li key={project.id}><Link href={`/projects/${project.slug}`}><FluentText>{project.title}</FluentText></Link></li>)}
          <li aria-current="page"><FluentText>{page.title}</FluentText></li>
        </ol>
      </nav>
      <ArticleMenu title={page.title} url={url} markdownUrl={`/projects/${page.slug}/index.md`}>
      <article className="article" data-has-toc={headings.length > 1 || undefined}>
        <header className="article-header project-header">
          <div className="flex items-start justify-between gap-5">
            <h1 className="article-title min-w-0"><FluentText>{page.title}</FluentText></h1>
            {icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="article-icon" src={icon} alt="" width={56} height={56}
                style={{ width: 56, height: 56, flexShrink: 0, margin: 0, objectFit: "contain" }} decoding="async" />
            )}
          </div>
          {page.dek && showsSubtitle(page.fonts) && <p className="article-dek"><FluentText>{page.dek}</FluentText></p>}
          <Byline authors={page.authors} minutes={readingMinutes(page.body)} updated={page.updatedAt} />
        </header>
        <ProjectProperties project={page.project} />
        {page.cover && <figure className="article-cover project-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.cover.src} srcSet={coverInfo?.srcSet} sizes={projectImageSizes()}
            alt={page.cover.alt} width={page.cover.width} height={page.cover.height}
            style={coverImageStyle(page.cover)} fetchPriority="high" decoding="async" data-zoom="" />
          {page.cover.caption && <figcaption>{page.cover.caption}</figcaption>}
        </figure>}
        <div className="article-main project-reading">
          {headings.length > 1 && <Toc items={headings} />}
          <div className="article-body" data-reading-body data-cursor="text"><ArticleBody tree={tree} /></div>
        </div>

        {children.length > 0 && <section className="project-related" aria-labelledby="project-related-title">
          <h2 id="project-related-title">Explore this project</h2>
          <ul>{children.map(child => <li key={child.id}><Link href={`/projects/${child.slug}`}><FluentText>{child.title}</FluentText><ArrowRight size={18} aria-hidden="true" /></Link></li>)}</ul>
        </section>}
        <div className="article-footer"><ShareRow title={page.title} url={url} /></div>
        <footer className="project-footer">
          <Link href="/projects"><ArrowLeft size={16} aria-hidden="true" />All projects</Link>
          <div className="project-controls"><SoundToggle className="project-theme-toggle" /><ThemeToggle className="project-theme-toggle" /></div>
        </footer>
      </article>
      </ArticleMenu>
      <ArticleEnhance />
    </main>
  </>;
}
