// @ts-nocheck
"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type SenecaTab = "home" | "protocol" | "growth" | "wealth" | "journal";

interface SenecaNavContextValue {
  tab: SenecaTab;
  setTab: (tab: SenecaTab) => void;
  navigate: (pathOrTab: string) => void;
  location: { pathname: string };
}

const SenecaNavContext = createContext<SenecaNavContextValue | null>(null);

/** Wait (up to ~2s) for a tab to mount, then bring the first matching target into view. */
function focusWhenMounted(targets: string[]) {
  if (typeof window === "undefined") return;
  const started = performance.now();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const tick = () => {
    const el = targets
      .map((id) => document.querySelector<HTMLElement>(`[data-nav-focus="${CSS.escape(id)}"]`))
      .find(Boolean);
    if (!el) {
      if (performance.now() - started < 2000) requestAnimationFrame(tick);
      return;
    }
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.classList.remove("sn-focus-flash");
    void el.offsetWidth; // restart the flash if it is already running
    el.classList.add("sn-focus-flash");
    window.setTimeout(() => el.classList.remove("sn-focus-flash"), 1600);
  };
  requestAnimationFrame(tick);
}

export function SenecaNavProvider({
  children,
  initialTab = "home",
  activeTab,
  onTabChange,
}: {
  children: ReactNode;
  initialTab?: SenecaTab;
  activeTab?: SenecaTab;
  onTabChange?: (tab: SenecaTab) => void;
}) {
  const [internalTab, setInternalTab] = useState<SenecaTab>(activeTab ?? initialTab);

  React.useEffect(() => {
    if (activeTab && activeTab !== internalTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab, internalTab]);

  const tab = activeTab ?? internalTab;

  const normalizeTab = (pathOrTab: string): SenecaTab => {
    const cleaned = pathOrTab.replace(/^\/seneca\/?/, "").replace(/^\//, "");
    if (!cleaned || cleaned === "home") return "home";
    if (cleaned === "protocol") return "protocol";
    if (cleaned === "growth") return "growth";
    if (cleaned === "wealth") return "wealth";
    if (cleaned === "journal") return "journal";
    return "home";
  };

  /**
   * navigate("/growth") switches tab; navigate("/growth#certifications")
   * also scrolls to the element marked data-nav-focus="certifications" and
   * flashes it once. Several targets may be listed ("#goal-x,certifications"):
   * the first one present on the page wins.
   */
  const navigate = (pathOrTab: string) => {
    const [path, hash] = pathOrTab.split("#");
    const nextTab = normalizeTab(path);
    setInternalTab(nextTab);
    onTabChange?.(nextTab);
    if (hash) focusWhenMounted(hash.split(","));
  };

  const setTab = (newTab: SenecaTab) => {
    setInternalTab(newTab);
    onTabChange?.(newTab);
  };

  const pathname = tab === "home" ? "/" : `/${tab}`;

  const value = useMemo(
    () => ({
      tab,
      setTab,
      navigate,
      location: { pathname },
    }),
    [tab, pathname],
  );

  return <SenecaNavContext.Provider value={value}>{children}</SenecaNavContext.Provider>;
}

export function useSenecaNav() {
  const context = useContext(SenecaNavContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    return {
      tab: "home" as SenecaTab,
      setTab: () => {},
      navigate: () => {},
      location: { pathname: "/" },
    };
  }
  return context;
}

// React Router DOM compatibility hooks for Seneca components:
export function useNavigate() {
  const { navigate } = useSenecaNav();
  return navigate;
}

export function useLocation() {
  const { location } = useSenecaNav();
  return location;
}

export function useSearchParams(): [URLSearchParams, (params: URLSearchParams) => void] {
  const [params, setParams] = useState(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams(),
  );
  return [params, setParams];
}
