"use client";
import { type ReactNode } from "react";
import { LinkButton } from "@cloudflare/kumo/components/button";
import { ArrowUpRight } from "@phosphor-icons/react";

/*
 * One header for every control-center page (Overview, Analytics, Writing,
 * Projects, Website), in the manner of Cloudflare's dashboard: the title with
 * an optional outline chip beside it, a one-line subtitle under it, the
 * page's actions on the right, and a full-width rule underneath. Where you
 * are (breadcrumbs) belongs to the shell's top bar, not here.
 *
 * Layout lives in control-center.css (.cc-page, .cc-page-header).
 */
export default function PageHeader({
  title,
  subtitle,
  chip,
  icon,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  /** A small outline link beside the title, usually <PageChip>. */
  chip?: ReactNode;
  icon?: ReactNode;
  /** Right-aligned; one primary button per page, the rest secondary. */
  actions?: ReactNode;
}) {
  return (
    <header className="cc-page-header">
      <div className="cc-page-heading">
        <div className="cc-page-title-row">
          {icon ? (
            <span className="cc-page-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h1>{title}</h1>
          {chip}
        </div>
        {subtitle ? <p className="cc-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="cc-page-actions">{actions}</div> : null}
    </header>
  );
}

/** The outline chip beside a page title: where this content lives on the site. */
export function PageChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <LinkButton
      className="cc-page-chip"
      href={href}
      external
      size="sm"
      variant="outline"
    >
      {children}
      <ArrowUpRight size={12} aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </LinkButton>
  );
}

/** The same empty state on every page: what is missing and what to do about it. */
export function EmptyState({
  icon,
  title,
  children,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  /** Filtered to nothing, rather than nothing at all: less room. */
  compact?: boolean;
}) {
  return (
    <section className="control-empty" data-compact={compact || undefined}>
      {icon}
      <h2>{title}</h2>
      {children}
    </section>
  );
}
