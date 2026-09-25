"use client";

import { useEffect } from "react";

/*
 * WebMCP (webmachinelearning.github.io/webmcp): the site's tools, offered to
 * an AI agent working in the visitor's browser, so it can read and move
 * around the site instead of scraping it. Read-only, same-origin, and only
 * where the browser has navigator.modelContext; elsewhere this does nothing.
 */

type Tool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
};
type ModelContext = { registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => Promise<void> | void };

const SECTIONS = ["about", "work", "projects", "certificates", "writing"] as const;

async function markdown(path: string, signal?: AbortSignal) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Only pages on nazarene.dev can be read.");
  const res = await fetch(url, { headers: { Accept: "text/markdown" }, signal });
  if (!res.ok) throw new Error(`${url.pathname} answered ${res.status}.`);
  return res.text();
}

const TOOLS: Tool[] = [
  {
    name: "list_posts",
    title: "List posts",
    description: "Every published post on nazarene.dev, newest first, as Markdown with titles, dates, tags and links.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: (_input, options) => markdown("/writing/index.md", options?.signal),
  },
  {
    name: "search_posts",
    title: "Search posts",
    description: "Find published posts whose title, summary or tags contain every word of the query.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Words to look for." } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    execute: async (input, options) => {
      const words = String(input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const lines = (await markdown("/writing/index.md", options?.signal)).split("\n").filter((l) => l.startsWith("- "));
      const hits = lines.filter((l) => words.every((w) => l.toLowerCase().includes(w)));
      return hits.length ? hits.join("\n") : "No published post matches.";
    },
  },
  {
    name: "read_page",
    title: "Read a page",
    description: "A page of nazarene.dev as Markdown: '/' for the profile summary, '/writing' for the post list, or '/writing/<slug>' for one post.",
    inputSchema: { type: "object", properties: { path: { type: "string", description: "A path on nazarene.dev, starting with /." } }, required: ["path"] },
    annotations: { readOnlyHint: true },
    execute: (input, options) => markdown(String(input.path ?? "/"), options?.signal),
  },
  {
    name: "open_section",
    title: "Open a section",
    description: "Show one section of the home page to the visitor: About, Work, Projects, Certificates or Writing.",
    inputSchema: { type: "object", properties: { section: { type: "string", enum: [...SECTIONS] } }, required: ["section"] },
    execute: async (input) => {
      const section = String(input.section);
      if (!(SECTIONS as readonly string[]).includes(section)) throw new Error(`Pick one of: ${SECTIONS.join(", ")}.`);
      if (window.location.pathname === "/") window.location.hash = section;
      else window.location.assign(`/#${section}`);
      return `Showing ${section}.`;
    },
  },
];

export default function WebMcpTools() {
  useEffect(() => {
    const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    for (const tool of TOOLS) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {});
      } catch {
        /* an older draft of the API: skip the tool rather than break the page */
      }
    }
    return () => controller.abort();
  }, []);
  return null;
}
