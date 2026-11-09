"use client";

import { Input } from "@cloudflare/kumo/components/input";
import { Button } from "@cloudflare/kumo/components/button";
import { Plus, X } from "@phosphor-icons/react";
import { cleanProject, type ProjectDetails } from "../../../cms/projects";

/** The same properties are saved, previewed and rendered on the public project. */
export default function ProjectFields({ value, onChange }: { value?: ProjectDetails; onChange: (value: ProjectDetails) => void }) {
  const project = value ?? cleanProject(null);
  const patch = (next: Partial<ProjectDetails>) => onChange({ ...project, ...next });
  return <fieldset className="editor-project-properties">
    <legend>Project details</legend>
    <p className="field-help">Optional. These appear below the title; empty fields stay hidden.</p>
    <div className="project-fields-grid">
      <label><span>Role</span><Input value={project.role} placeholder="e.g. Design & engineering" maxLength={300} onChange={e => patch({ role: e.target.value })} /></label>
      <label><span>Timeline</span><Input value={project.timeframe} placeholder="e.g. Jan – Mar 2026" maxLength={100} onChange={e => patch({ timeframe: e.target.value })} /></label>
      <label className="project-fields-wide"><span>Built with</span><Input value={project.tools.join(",")} placeholder="Next.js, TypeScript, Cloudflare" onChange={e => patch({ tools: e.target.value.split(",").slice(0, 40) })} onBlur={() => patch({ tools: [...new Set(project.tools.map(t => t.trim()).filter(Boolean))] })} /><small className="field-help">Separate tools with a comma.</small></label>
    </div>
    {project.links.map((link, i) => <div className="project-link-fields" key={i}>
      <Input aria-label={`Link ${i + 1} label`} placeholder="Website" value={link.label} maxLength={100} onChange={e => patch({ links: project.links.map((l, n) => n === i ? { ...l, label: e.target.value } : l) })} />
      <Input aria-label={`Link ${i + 1} URL`} placeholder="https://" value={link.href} onChange={e => patch({ links: project.links.map((l, n) => n === i ? { ...l, href: e.target.value } : l) })} />
      <Button variant="ghost" aria-label={`Remove link ${i + 1}`} onClick={() => patch({ links: project.links.filter((_, n) => n !== i) })}><X size={16} /></Button>
    </div>)}
    <Button variant="ghost" disabled={project.links.length >= 20} onClick={() => patch({ links: [...project.links, { label: "", href: "" }] })}><Plus size={16} /> Add link</Button>
    <details className="project-order-field"><summary>Listing order</summary><label><span className="field-help">Lower numbers appear first on Home and Projects.</span><Input aria-label="Project display order" type="number" min={0} max={100000} value={project.order} onChange={e => patch({ order: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })} /></label></details>
  </fieldset>;
}
