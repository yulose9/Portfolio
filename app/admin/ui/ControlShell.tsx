"use client";
import { type ReactNode } from "react";
import {
  ChartLine,
  SquaresFour,
  NotePencil,
  Briefcase,
  Globe,
  List,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { Sidebar, useSidebar } from "@cloudflare/kumo/components/sidebar";
export type Destination =
  "overview" | "analytics" | "writing" | "projects" | "website";
export function destinationFromUrl(): Destination {
  const p = new URLSearchParams(window.location.search);
  const value = p.get("section");
  if (p.has("post")) return value === "projects" ? "projects" : "writing";
  return ["overview", "analytics", "writing", "projects", "website"].includes(
    value ?? "",
  )
    ? (value as Destination)
    : "overview";
}
const destinations = [
  ["overview", "Overview", SquaresFour],
  ["analytics", "Analytics", ChartLine],
  ["writing", "Writing", NotePencil],
  ["projects", "Projects", Briefcase],
  ["website", "Website", Globe],
] as const;
export default function ControlShell({
  section,
  onNavigate,
  email,
  children,
}: {
  section: Destination;
  onNavigate: (section: Destination) => void;
  email: string;
  children: ReactNode;
}) {
  return (
    <Sidebar.Provider
      className="control-shell control-kumo-shell"
      defaultWidth={224}
      mobileBreakpoint={900}
      animationDuration={200}
    >
      <Sidebar
        className="control-sidebar-frame"
        contentClassName="control-kumo-nav"
      >
        <Sidebar.Header>
          <a
            className="control-brand"
            href="/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="control-monogram">n.</span>
            <span>
              nazarene.dev<small>Personal workspace</small>
            </span>
          </a>
        </Sidebar.Header>
        <Sidebar.Content>
          <Navigation section={section} onNavigate={onNavigate} />
        </Sidebar.Content>
        <Sidebar.Footer>
          <div className="control-sidebar-bottom">
            <a href="/" target="_blank" rel="noreferrer">
              View website <ArrowUpRight size={16} />
            </a>
            <a href="/admin/shortcuts">Keyboard shortcuts</a>
            <span title={email}>{email}</span>
          </div>
        </Sidebar.Footer>
      </Sidebar>
      <div className="control-content" id="admin-content">
        <div className="control-mobile-bar">
          <strong>nazarene.dev</strong>
          <Sidebar.Trigger aria-label="Toggle navigation">
            <List size={20} />
          </Sidebar.Trigger>
        </div>
        {children}
      </div>
    </Sidebar.Provider>
  );
}
function Navigation({
  section,
  onNavigate,
}: {
  section: Destination;
  onNavigate: (section: Destination) => void;
}) {
  const sidebar = useSidebar();
  return (
    <nav aria-label="Admin navigation">
      <Sidebar.Menu>
        {destinations.map(([id, label, Icon]) => (
          <Sidebar.MenuButton
            key={id}
            active={section === id}
            aria-current={section === id ? "page" : undefined}
            icon={<Icon size={19} />}
            onClick={() => {
              onNavigate(id);
              if (sidebar.isMobile) sidebar.setOpen(false);
            }}
          >
            {label}
          </Sidebar.MenuButton>
        ))}
      </Sidebar.Menu>
    </nav>
  );
}
