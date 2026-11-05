import { ArrowUpRight, CalendarBlank, Stack, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Post } from "../../../cms/format";
import { safeInlineUrl } from "../../../cms/inline";

/** Document properties, kept separate from the long-form story. */
export default function ProjectProperties({ project }: { project: Post["project"] }) {
  if (!project) return null;
  const links = project.links.filter(link => safeInlineUrl(link.href));
  return (
    <div className="project-properties">
      {(project.role || project.timeframe || project.tools.length > 0) && (
        <dl className="project-property-list">
          {project.role && <div><dt><UserCircle aria-hidden="true" size={18} />Role</dt><dd>{project.role}</dd></div>}
          {project.timeframe && <div><dt><CalendarBlank aria-hidden="true" size={18} />Timeline</dt><dd>{project.timeframe}</dd></div>}
          {project.tools.length > 0 && <div><dt><Stack aria-hidden="true" size={18} />Built with</dt><dd className="project-tools">{project.tools.map(tool => <span key={tool}>{tool}</span>)}</dd></div>}
        </dl>
      )}
      {links.length > 0 && <div className="project-links">{links.map(link => (
        <a key={link.href} href={safeInlineUrl(link.href)} target="_blank" rel="noopener noreferrer" className="project-external" data-sound="click">
          {link.label}<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}</div>}
    </div>
  );
}
