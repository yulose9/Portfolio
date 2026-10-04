"use client";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Briefcase,
  CaretUpDown,
  ChartLine,
  ClockCounterClockwise,
  FileText,
  FolderSimple,
  Globe,
  Keyboard,
  Laptop,
  List,
  MagnifyingGlass,
  NotePencil,
  SidebarSimple,
  SignOut,
  SquaresFour,
  type Icon,
} from "@phosphor-icons/react";
import { Fluent } from "./extensions/emoji";
import { Sidebar, useSidebar } from "@cloudflare/kumo/components/sidebar";
import { Breadcrumbs } from "@cloudflare/kumo/components/breadcrumbs";
import { DropdownMenu } from "@cloudflare/kumo/components/dropdown";
import { LinkProvider, type LinkComponentProps } from "@cloudflare/kumo/utils";

import { Button } from "../../components/kit/button";
import { Tooltip } from "../../components/kit/tooltip";
import { Kbd } from "../../components/kit/kbd";
import { publishedWebsite } from "../../../cms/website";
import { SoundToggle } from "../../components/ui/sound";
import { ThemeToggle } from "../../components/ui/theme";
import { keys } from "./menu";
import { cn } from "../../lib/cn";
import {
  DESTINATION_LABEL,
  DESTINATIONS,
  recentContext,
  requestView,
  useRecents,
  useShownView,
  VIEWS,
  type Destination,
  type RecentItem,
  type ViewScope,
} from "./shell-nav";

export type { Destination };

export function destinationFromUrl(): Destination {
  const p = new URLSearchParams(window.location.search);
  const value = p.get("section");
  if (p.has("post")) return value === "projects" ? "projects" : "writing";
  return DESTINATIONS.includes(value as Destination) ? (value as Destination) : "overview";
}

export const DESTINATION_ICON: Record<Destination, Icon> = {
  overview: SquaresFour,
  analytics: ChartLine,
  writing: NotePencil,
  projects: Briefcase,
  website: Globe,
};

/*
 * The control-center shell, after Cloudflare's dashboard: Kumo's sidebar
 * (260px, or a 64px icon rail that peeks open as an overlay on hover or
 * keyboard focus), a slim top bar with breadcrumbs, and quick search into
 * the ⌘K palette. The page bodies are the children; the shell never styles
 * them.
 */

const OPEN_KEY = "admin-sidebar";
const RECENTS_OPEN_KEY = "admin-sidebar-recents";
const WIDTH_KEY = "admin-sidebar-width";
const PEEK_DELAY = 120;
const PEEK_GRACE = 200;

function readFlag(key: string, fallback: boolean) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}
function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* a preference, not data */
  }
}

function readWidth(fallback: number) {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return fallback;
    const num = parseInt(raw, 10);
    return Number.isFinite(num) && num >= 180 && num <= 500 ? num : fallback;
  } catch {
    return fallback;
  }
}
function writeWidth(value: number) {
  try {
    localStorage.setItem(WIDTH_KEY, String(Math.round(value)));
  } catch {}
}

const SidebarResizeContext = createContext<{
  width: number;
  setWidth: React.Dispatch<React.SetStateAction<number>>;
  resetWidth: () => void;
}>({ width: 260, setWidth: () => {}, resetWidth: () => {} });

type Nav = {
  section: Destination;
  editing: boolean;
  onNavigate: (section: Destination) => void;
  onOpenRecent: (item: RecentItem) => void;
  onSearch: () => void;
};
const NavContext = createContext<Nav | null>(null);
function useNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav must be used inside ControlShell");
  return nav;
}

/*
 * Kumo's breadcrumbs and menu links render through its LinkProvider. Links
 * into the admin (/admin?section=…&view=…) navigate in place, through the
 * same unsaved-work check as the sidebar; everything else is a plain link.
 */
const ShellLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(function ShellLink({ to, href, onClick, ...props }, ref) {
  const nav = useContext(NavContext);
  const target = to ?? href ?? "#";
  return (
    <a
      ref={ref}
      href={target}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !nav || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const url = new URL(target, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== "/admin") return;
        const section = url.searchParams.get("section") as Destination | null;
        if (!section || !DESTINATIONS.includes(section)) return;
        event.preventDefault();
        const view = url.searchParams.get("view");
        if (view && (section === "writing" || section === "projects")) requestView(section, view);
        nav.onNavigate(section);
      }}
    />
  );
});

export default function ControlShell({
  section,
  onNavigate,
  onOpenRecent,
  onSearch,
  email,
  editing,
  children,
}: {
  section: Destination;
  onNavigate: (section: Destination) => void;
  onOpenRecent: (item: RecentItem) => void;
  onSearch: () => void;
  email: string;
  /** A post or project is open: the editor's own bar takes the top bar's place. */
  editing: boolean;
  children: ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => readWidth(260));
  const resetWidth = useCallback(() => {
    setSidebarWidth(260);
    try {
      localStorage.removeItem(WIDTH_KEY);
    } catch {}
  }, []);

  return (
    <NavContext.Provider value={{ section, editing, onNavigate, onOpenRecent, onSearch }}>
      <SidebarResizeContext.Provider value={{ width: sidebarWidth, setWidth: setSidebarWidth, resetWidth }}>
        <LinkProvider component={ShellLink}>
          <Sidebar.Provider
            className="control-shell control-kumo-shell"
            defaultOpen={readFlag(OPEN_KEY, true)}
            onOpenChange={(next) => {
              writeFlag(OPEN_KEY, next);
            }}
            collapsible="icon"
            peekable
            mobileBreakpoint={768}
            animationDuration={220}
            style={
              {
                "--sidebar-width": `${sidebarWidth}px`,
                "--sidebar-width-icon": "64px",
                "--sidebar-easing": "cubic-bezier(0.23, 1, 0.32, 1)",
              } as CSSProperties
            }
          >
            <ShellSidebar />
            <div className="control-content" id="admin-content">
              {editing ? null : <TopBar email={email} />}
              {children}
            </div>
          </Sidebar.Provider>
        </LinkProvider>
      </SidebarResizeContext.Provider>
    </NavContext.Provider>
  );
}

/*
 * The peek. Kumo opens it the instant the pointer touches the rail and
 * closes it the instant it leaves; Cloudflare's own dashboard waits for
 * intent. So the shell keeps its own wish (`want`): 120ms of hover before
 * the peek, 200ms of grace after leaving, and keyboard focus opens it at
 * once. A layout effect squares Kumo's state with that wish before paint.
 * The footer (the collapse toggle) never starts a peek, but keeps one open.
 */
function ShellSidebar() {
  const sidebar = useSidebar();
  const { open, isMobile, isPeeking, startPeek, stopPeek, toggleSidebar } = sidebar;
  const compact = !open && !isMobile;
  const [want, setWant] = useState(false);
  if (!compact && want) setWant(false);
  const timer = useRef(0);
  const pointerInside = useRef(false);
  const keyboardInside = useRef(false);

  useLayoutEffect(() => {
    if (!compact) return;
    if (want && !isPeeking) startPeek();
    else if (!want && isPeeking) stopPeek();
  }, [compact, want, isPeeking, startPeek, stopPeek]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // ⌘B / Ctrl+B, as in Cloudflare's dashboard and VS Code. Not while typing:
  // in a field or the editor it is bold.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "b") return;
      const target = event.target as Element | null;
      if (target?.closest?.("input, textarea, select, [contenteditable], .ProseMirror, [role=dialog]")) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:sidebar-toggle", toggleSidebar);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:sidebar-toggle", toggleSidebar);
    };
  }, [toggleSidebar]);

  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setWant(next), delay);
  };
  const inFooter = (target: EventTarget) => target instanceof Element && !!target.closest('[data-sidebar="footer"]');

  const { width: currentWidth, setWidth, resetWidth } = useContext(SidebarResizeContext);
  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    pointerId: number;
    hasMoved: boolean;
    startTime: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startWidth: currentWidth,
      pointerId: e.pointerId,
      hasMoved: false,
      startTime: Date.now(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [currentWidth]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - drag.startX; // Dragging right expands left sidebar
    if (!drag.hasMoved && Math.abs(deltaX) > 3) {
      drag.hasMoved = true;
      document.body.setAttribute("data-resizing-sidebar", "true");
    }

    if (drag.hasMoved) {
      const nextWidth = Math.max(180, Math.min(drag.startWidth + deltaX, 480));
      setWidth(nextWidth);
    }
  }, [setWidth]);

  const handlePointerUp = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const elapsed = Date.now() - drag.startTime;
    const hasMoved = drag.hasMoved;
    dragRef.current = null;
    document.body.removeAttribute("data-resizing-sidebar");

    if (!hasMoved && elapsed < 400) {
      toggleSidebar();
    } else if (hasMoved) {
      writeWidth(currentWidth);
    }
  }, [currentWidth, toggleSidebar]);

  const handlePointerCancel = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      document.body.removeAttribute("data-resizing-sidebar");
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetWidth();
  }, [resetWidth]);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSidebar();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setWidth((prev) => {
        const next = Math.min(prev + 20, 480);
        writeWidth(next);
        return next;
      });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth((prev) => {
        const next = Math.max(prev - 20, 180);
        writeWidth(next);
        return next;
      });
    }
  }, [setWidth, toggleSidebar]);

  return (
    <Sidebar
      className="control-sidebar-frame"
      contentClassName="control-kumo-nav"
      onPointerOver={(event: PointerEvent<HTMLElement>) => {
        if (!compact || event.pointerType === "touch") return;
        pointerInside.current = true;
        if (want) window.clearTimeout(timer.current);
        else if (!inFooter(event.target)) schedule(true, PEEK_DELAY);
        else window.clearTimeout(timer.current);
      }}
      onPointerLeave={() => {
        pointerInside.current = false;
        if (!compact) return;
        if (!want) window.clearTimeout(timer.current);
        else if (!keyboardInside.current) schedule(false, PEEK_GRACE);
      }}
      onFocus={(event: FocusEvent<HTMLElement>) => {
        if (!compact || inFooter(event.target) || !(event.target as Element).matches?.(":focus-visible")) return;
        keyboardInside.current = true;
        window.clearTimeout(timer.current);
        setWant(true);
      }}
      onBlur={(event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        keyboardInside.current = false;
        if (compact && !pointerInside.current) {
          window.clearTimeout(timer.current);
          setWant(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && compact && want) {
          keyboardInside.current = false;
          window.clearTimeout(timer.current);
          setWant(false);
        }
      }}
    >
      <Sidebar.Header className="control-sidebar-header">
        <Brand />
        {isMobile ? <Sidebar.Close className="control-sidebar-close" /> : null}
      </Sidebar.Header>
      <Sidebar.Content>
        <QuickSearch />
        <Navigation />
      </Sidebar.Content>
      <Sidebar.Footer className="control-sidebar-footer">
        <Tooltip
          side="right"
          content={
            <span className="control-tip">
              {open ? "Collapse sidebar" : "Expand sidebar"}
              <Kbd size="sm">{keys("⌘B")}</Kbd>
            </span>
          }
        >
          <Sidebar.Trigger
            className="control-sidebar-toggle"
            aria-keyshortcuts="Control+B Meta+B"
            data-sound={open ? "close" : "open"}
          >
            <SidebarSimple size={18} aria-hidden="true" />
          </Sidebar.Trigger>
        </Tooltip>
        <Tooltip content="View live website" side="right" sideOffset={10}>
          <a
            className="control-footer-link control-footer-icon-link"
            href="/"
            target="_blank"
            rel="noreferrer"
            aria-label="View live website"
          >
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </Tooltip>
      </Sidebar.Footer>
      {open && !isMobile ? (
        <Tooltip content="Drag to resize · Click to collapse" side="right" sideOffset={8} delay={120}>
          <button
            type="button"
            role="separator"
            aria-orientation="vertical"
            aria-label="Navigation sidebar border: Drag to resize · Click to collapse"
            className="control-sidebar-resize-handle"
            data-sound="close"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
          >
            <span className="control-sidebar-resize-line" />
          </button>
        </Tooltip>
      ) : null}
    </Sidebar>
  );
}

function Brand() {
  const { onNavigate } = useNav();
  const { isMobile, setOpenMobile, state } = useSidebar();
  return (
    <Tooltip content="nazarene.dev · Personal workspace" side="right" sideOffset={10} disabled={state !== "collapsed"}>
      <button
        type="button"
        className="control-brand"
        onClick={() => {
          onNavigate("overview");
          if (isMobile) setOpenMobile(false);
        }}
      >
        {/* The site's favicon mark, from public/icon-192.png. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={24} height={24} className="control-brand-mark" />
        <span className="control-brand-text">
          <span className="control-brand-name">nazarene.dev</span>
          <span className="control-brand-sub">Personal workspace</span>
        </span>
      </button>
    </Tooltip>
  );
}

/** Kumo's menu button with the kit tooltip that names it while the rail is icons only. */
type MenuButtonProps = ComponentProps<typeof Sidebar.MenuButton> & { tip: string };
const NavButton = forwardRef<HTMLButtonElement, MenuButtonProps>(function NavButton({ tip, ...props }, ref) {
  const { state } = useSidebar();
  return (
    <Tooltip content={tip} side="right" sideOffset={10} disabled={state !== "collapsed"}>
      <Sidebar.MenuButton ref={ref} {...props} />
    </Tooltip>
  );
});

const icon = (Glyph: Icon) => <Glyph size={18} className="control-nav-icon" aria-hidden="true" />;

function QuickSearch() {
  const { onSearch } = useNav();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  return (
    <Tooltip content={`Quick search (${keys("⌘K")})`} side="right" sideOffset={10} disabled={!isCollapsed}>
      <button
        type="button"
        className="control-quick-search"
        aria-label="Quick search"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={onSearch}
      >
        <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
        <span className="control-quick-search-label">Quick search…</span>
        <Kbd size="sm" aria-hidden="true" className="control-quick-search-kbd">
          {keys("⌘K")}
        </Kbd>
      </button>
    </Tooltip>
  );
}

function Navigation() {
  const { section, onNavigate } = useNav();
  const { isMobile, setOpenMobile } = useSidebar();
  const go = (id: Destination) => {
    onNavigate(id);
    if (isMobile) setOpenMobile(false);
  };
  const item = (id: Destination) => (
    <Sidebar.MenuItem key={id}>
      <NavButton tip={DESTINATION_LABEL[id]} active={section === id} aria-current={section === id ? "page" : undefined} icon={icon(DESTINATION_ICON[id])} onClick={() => go(id)}>
        {DESTINATION_LABEL[id]}
      </NavButton>
    </Sidebar.MenuItem>
  );
  return (
    <nav aria-label="Admin navigation" className="control-nav">
      <Sidebar.Group>
        <Sidebar.Menu>
          {item("overview")}
          <Recents />
        </Sidebar.Menu>
      </Sidebar.Group>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Content</Sidebar.GroupLabel>
        <Sidebar.Menu>
          <ViewGroup scope="writing" />
          <ViewGroup scope="projects" />
        </Sidebar.Menu>
      </Sidebar.Group>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Site</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {item("analytics")}
          {item("website")}
        </Sidebar.Menu>
      </Sidebar.Group>
    </nav>
  );
}

function RecentGlyph({ item }: { item: RecentItem }) {
  const iconVal = item.icon?.trim();
  if (iconVal) {
    if (iconVal === "ph:laptop" || iconVal === "laptop") {
      return <Laptop size={14} className="control-recent-icon" aria-hidden="true" />;
    }
    if (iconVal === "ph:folder" || iconVal.startsWith("ph:folder")) {
      return <FolderSimple size={14} className="control-recent-icon" aria-hidden="true" />;
    }
    if (iconVal === "ph:file" || iconVal.startsWith("ph:file")) {
      return <FileText size={14} className="control-recent-icon" aria-hidden="true" />;
    }
    if (iconVal === "ph:briefcase" || iconVal.startsWith("ph:briefcase")) {
      return <Briefcase size={14} className="control-recent-icon" aria-hidden="true" />;
    }
    if (iconVal === "ph:globe" || iconVal.startsWith("ph:globe")) {
      return <Globe size={14} className="control-recent-icon" aria-hidden="true" />;
    }
    if (!iconVal.includes(":") && !/^[a-z0-9_-]+$/i.test(iconVal)) {
      return (
        <span className="control-recent-emoji" aria-hidden="true">
          <Fluent emoji={iconVal} size={15} />
        </span>
      );
    }
  }

  if (item.kind === "project") {
    return <Laptop size={14} className="control-recent-icon" aria-hidden="true" />;
  }
  if (item.kind === "page") {
    return <Globe size={14} className="control-recent-icon" aria-hidden="true" />;
  }
  return <FileText size={14} className="control-recent-icon" aria-hidden="true" />;
}

function Recents() {
  const { onOpenRecent } = useNav();
  const { isMobile, setOpenMobile } = useSidebar();
  const recents = useRecents();
  const [open, setOpen] = useState(() => readFlag(RECENTS_OPEN_KEY, true));
  const prevCount = useRef(recents.length);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (recents.length > prevCount.current && recents[0]) {
      const id = `${recents[0].kind}:${recents[0].id}`;
      setNewlyAddedId(id);
      const timer = setTimeout(() => setNewlyAddedId(null), 1200);
      return () => clearTimeout(timer);
    }
    prevCount.current = recents.length;
  }, [recents]);

  return (
    <Sidebar.MenuItem>
      <Sidebar.Collapsible
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          writeFlag(RECENTS_OPEN_KEY, next);
        }}
      >
        <Sidebar.CollapsibleTrigger
          render={
            <NavButton tip="Recents" icon={icon(ClockCounterClockwise)}>
              Recents
              <Sidebar.MenuChevron />
            </NavButton>
          }
        />
        <Sidebar.CollapsibleContent>
          <Sidebar.MenuSub className="control-sub">
            {recents.length ? (
              recents.map((item) => {
                const itemKey = `${item.kind}:${item.id}`;
                const isEntering = newlyAddedId === itemKey;
                return (
                  <Sidebar.MenuSubButton
                    key={itemKey}
                    className={cn("control-recent", isEntering && "control-recent-entering")}
                    onClick={() => {
                      onOpenRecent(item);
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <span className="control-recent-badge">
                      <RecentGlyph item={item} />
                    </span>
                    <span className="control-recent-text">
                      <span className="control-recent-title">{item.title}</span>
                      <span className="control-recent-context">{recentContext(item)}</span>
                    </span>
                  </Sidebar.MenuSubButton>
                );
              })
            ) : (
              <li className="control-recent-empty">Posts and pages you open appear here.</li>
            )}
          </Sidebar.MenuSub>
        </Sidebar.CollapsibleContent>
      </Sidebar.Collapsible>
    </Sidebar.MenuItem>
  );
}

/*
 * Writing and Projects: the row opens the section and shows its views; on
 * the section, it only folds them. The views are the list's own filters.
 */
function ViewGroup({ scope }: { scope: ViewScope }) {
  const { section, editing, onNavigate } = useNav();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const here = section === scope;
  const shown = useShownView(scope);
  const [open, setOpen] = useState(here);
  const [wasHere, setWasHere] = useState(here);
  if (here !== wasHere) {
    setWasHere(here);
    if (here) setOpen(true);
  }
  const arriving = useRef(false);
  const label = DESTINATION_LABEL[scope];
  const choose = (view: string) => {
    requestView(scope, view);
    if (!here || editing) onNavigate(scope);
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar.MenuItem>
      <Sidebar.Collapsible
        open={open}
        onOpenChange={(next) => {
          if (arriving.current) {
            arriving.current = false;
            setOpen(true);
          } else setOpen(next);
        }}
      >
        <Sidebar.CollapsibleTrigger
          render={
            <NavButton
              tip={label}
              active={here && (!open || state === "collapsed")}
              aria-current={here ? "page" : undefined}
              icon={icon(DESTINATION_ICON[scope])}
              onClick={() => {
                if (here && !editing) return;
                arriving.current = true;
                onNavigate(scope);
                if (isMobile) setOpenMobile(false);
              }}
            >
              {label}
              <Sidebar.MenuChevron />
            </NavButton>
          }
        />
        <Sidebar.CollapsibleContent>
          <Sidebar.MenuSub className="control-sub">
            {VIEWS[scope].map((view) => {
              const current = here && !editing && shown === view.id;
              return (
                <Sidebar.MenuSubButton key={view.id} active={current} aria-current={current ? "true" : undefined} onClick={() => choose(view.id)}>
                  {view.label}
                </Sidebar.MenuSubButton>
              );
            })}
          </Sidebar.MenuSub>
        </Sidebar.CollapsibleContent>
      </Sidebar.Collapsible>
    </Sidebar.MenuItem>
  );
}

/* ── Top bar ─────────────────────────────────────────────────────────── */

function TopBar({ email }: { email: string }) {
  const { onSearch } = useNav();
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <header className="control-topbar">
      <button type="button" className="control-topbar-icon control-topbar-menu" aria-label="Toggle navigation" aria-expanded={openMobile} onClick={() => setOpenMobile(!openMobile)}>
        <List size={18} aria-hidden="true" />
      </button>
      <Crumbs />
      <div className="control-topbar-actions">
        <button type="button" className="control-topbar-icon control-topbar-search" aria-label="Quick search" onClick={onSearch}>
          <MagnifyingGlass size={17} aria-hidden="true" />
        </button>
        <ThemeToggle className="control-topbar-icon" />
        <SoundToggle className="control-topbar-icon" />
        <Tooltip content="View live website" side="bottom" sideOffset={6}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="control-topbar-icon"
            aria-label="View live website"
          >
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </Tooltip>
        <Account email={email} />
      </div>
    </header>
  );
}

function Crumbs() {
  const { section } = useNav();
  const writing = useShownView("writing");
  const projects = useShownView("projects");
  const label = DESTINATION_LABEL[section];
  if (section !== "writing" && section !== "projects")
    return (
      <Breadcrumbs size="sm" className="control-crumbs">
        <Breadcrumbs.Current>{label}</Breadcrumbs.Current>
      </Breadcrumbs>
    );
  const views = VIEWS[section];
  const shown = section === "writing" ? writing : projects;
  const current = views.find((v) => v.id === shown) ?? views[0];
  return (
    <Breadcrumbs size="sm" className="control-crumbs">
      <Breadcrumbs.Link href={`/admin?section=${section}&view=all`}>{label}</Breadcrumbs.Link>
      <Breadcrumbs.Separator />
      {/* The current view doubles as a switcher between its siblings. */}
      <DropdownMenu>
        <DropdownMenu.Trigger className="control-crumb-switch" aria-current="page">
          <span className="control-crumb-current">{current.label}</span>
          <CaretUpDown size={12} weight="bold" aria-hidden="true" />
          <span className="sr-only">, switch view</span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" sideOffset={6} className="control-menu">
          {views.map((view) => (
            <DropdownMenu.Item key={view.id} selected={view.id === current.id} onClick={() => requestView(section, view.id)}>
              {view.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    </Breadcrumbs>
  );
}

function Account({ email }: { email: string }) {
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const name = publishedWebsite.profile.name || "John Nazarene Dela Pisa";
  const photo = publishedWebsite.profile.photo || "/avatar-1024.webp";
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger className="control-account" aria-label={`Account, ${name} (${email})`}>
        <span className="control-avatar" aria-hidden="true">
          {photo && !photoFailed ? (
            <img
              src={photo}
              alt=""
              width={28}
              height={28}
              className="control-avatar-img"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            initial
          )}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" sideOffset={6} className="control-menu">
        <DropdownMenu.Group>
          <div className="control-account-profile-header">
            <span className="control-avatar control-avatar-menu" aria-hidden="true">
              {photo && !photoFailed ? (
                <img
                  src={photo}
                  alt=""
                  width={36}
                  height={36}
                  className="control-avatar-img"
                />
              ) : (
                initial
              )}
            </span>
            <div className="control-account-meta">
              <span className="control-account-name">{name}</span>
              <span className="control-account-email" title={email}>{email}</span>
            </div>
          </div>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.LinkItem href="/admin/shortcuts" icon={Keyboard}>
          <span className="flex-1">Keyboard shortcuts</span>
          <Kbd size="sm" variant="subtle">?</Kbd>
        </DropdownMenu.LinkItem>
        <DropdownMenu.LinkItem href="/cdn-cgi/access/logout" icon={SignOut} variant="danger">
          Sign out
        </DropdownMenu.LinkItem>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
