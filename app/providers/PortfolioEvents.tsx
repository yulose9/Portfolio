"use client";
import { useEffect } from "react";
import posthog from "posthog-js";

/** Explicit, bounded events. No input values or arbitrary element text is collected. */
export default function PortfolioEvents() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let pathname = location.pathname;
    let lastActive = Date.now(); let tick = Date.now(); let seconds = 0;
    let milestones = new Set<number>();
    const kind = () => pathname.startsWith("/writing/") ? "writing" : pathname.startsWith("/projects/") ? "projects" : "website";
    const properties = () => ({ content_kind: kind(), content_id: document.querySelector<HTMLElement>("[data-content-id]")?.dataset.contentId ?? pathname, $pathname: pathname, event_version: 1 });
    const send = (event: string, extra: Record<string, string | number> = {}) => {
      if (!pathname.startsWith("/admin") && !posthog.has_opted_out_capturing()) posthog.capture(event, { ...properties(), ...extra });
    };
    const flush = () => { if (seconds >= 1) { send("portfolio_active", { seconds: Math.min(15, Math.round(seconds)) }); seconds = 0; } };
    const activity = () => { lastActive = Date.now(); };
    const scroll = () => {
      activity();
      const body = document.querySelector<HTMLElement>("[data-reading-body], .article-body");
      if (!body || kind() === "website") return;
      const bounds = body.getBoundingClientRect();
      if (bounds.top >= innerHeight || bounds.bottom <= 0) return;
      const depth = Math.min(100, Math.max(0, (innerHeight - bounds.top) / Math.max(1, bounds.height) * 100));
      for (const milestone of [25, 50, 75, 100]) if (depth >= milestone && !milestones.has(milestone)) { milestones.add(milestone); send("portfolio_depth", { milestone }); }
    };
    const click = (event: MouseEvent) => {
      activity();
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const url = new URL(anchor.href, location.href);
      const action = url.protocol === "mailto:" ? "email_click" : /\.pdf$/i.test(url.pathname) || anchor.getAttribute("download") !== null || /resume/i.test(url.pathname) ? "resume_click" : url.protocol === "tel:" ? "phone_click" : url.origin !== location.origin && url.protocol === "https:" ? (url.hostname.includes("github.com") ? "github_click" : "external_link") : "";
      if (action) send("portfolio_action", { action, destination_host: url.hostname });
      if (url.origin === location.origin && url.pathname !== pathname) send("portfolio_navigation", { source_kind: kind(), destination_kind: url.pathname.startsWith("/writing/") ? "writing" : url.pathname.startsWith("/projects/") ? "projects" : "website" });
    };
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (pathname !== location.pathname) { flush(); pathname = location.pathname; milestones = new Set(); seconds = 0; lastActive = now; }
      if (!document.hidden && now - lastActive < 30000) {
        const body = document.querySelector<HTMLElement>("[data-reading-body], .article-body");
        const bounds = body?.getBoundingClientRect();
        if (!body || (bounds && bounds.top < innerHeight && bounds.bottom > 0)) seconds += Math.min(1, (now - tick) / 1000);
      }
      tick = now;
      if (seconds >= 10) flush();
    }, 1000);
    const visibility = () => { flush(); tick = Date.now(); };
    document.addEventListener("click", click); document.addEventListener("keydown", activity); window.addEventListener("pointermove", activity, { passive: true }); window.addEventListener("scroll", scroll, { passive: true }); document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", flush);
    return () => { flush(); clearInterval(interval); document.removeEventListener("click", click); document.removeEventListener("keydown", activity); window.removeEventListener("pointermove", activity); window.removeEventListener("scroll", scroll); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", flush); };
  }, []);
  return null;
}
