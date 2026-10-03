import published from "../content/website.json";
import type { Tab, Tool } from "../app/site-content";
export type WebsiteContent = {
  version: 1;
  revision: string;
  profile: {
    name: string;
    rolePrefix: string;
    employer: string;
    employerUrl: string;
    photo: string;
    location: string;
    biography: string;
  };
  tools: (Tool & { href?: string; hidden?: boolean })[];
  tabs: (Tab & { hidden?: boolean })[];
  seo: { title: string; description: string; image: string };
};
export const publishedWebsite = published as WebsiteContent;
export type WebsiteDraft = {
  content: WebsiteContent;
  version: string | null;
  source: string | null;
  receipt?: { commit: string; revision: string; at: string };
};
const text = (v: unknown, max = 300) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export function websiteUrl(value: unknown, media = false) {
  const s = text(value, 2048);
  if (!s) return "";
  if (s.startsWith("/") && !s.startsWith("//") && !/[\\\x00-\x20]/.test(s))
    return s;
  try {
    const url = new URL(s);
    if (
      (media ? ["https:"] : ["https:", "mailto:", "tel:"]).includes(
        url.protocol,
      ) &&
      !url.username &&
      !url.password
    )
      return s;
  } catch {
    /* invalid */
  }
  throw new Error("Use a secure https URL, a site path, or a contact link.");
}
export function validateWebsite(value: unknown): WebsiteContent {
  if (!value || typeof value !== "object")
    throw new Error("Invalid website content.");
  const v = value as WebsiteContent;
  if (!v.profile || !v.seo || !Array.isArray(v.tabs) || !Array.isArray(v.tools))
    throw new Error("Website fields are missing.");
  const ids = new Set<string>();
  const tabs = v.tabs.slice(0, 8).map((tab) => {
    if (
      !["about", "work", "projects", "certificates", "writing"].includes(
        tab.id,
      ) ||
      ids.has(tab.id)
    )
      throw new Error(
        "Each homepage section must have a unique supported type.",
      );
    ids.add(tab.id);
    return {
      id: tab.id,
      label: text(tab.label, 60),
      hidden: Boolean(tab.hidden),
      ...(tab.empty ? { empty: text(tab.empty) } : {}),
      ...(Array.isArray(tab.body)
        ? { body: tab.body.slice(0, 30).map((p) => text(p, 10000)) }
        : {}),
      ...(Array.isArray(tab.items)
        ? {
            items: tab.items
              .slice(0, 100)
              .map((item) => ({
                title: text(item.title),
                company: text(item.company),
                year: text(item.year, 80),
                href: websiteUrl(item.href),
                image: websiteUrl(item.image, true),
                fit:
                  item.fit === "cover"
                    ? ("cover" as const)
                    : ("contain" as const),
                ...(["robot", "hardhat", "palette"].includes(item.icon ?? "")
                  ? { icon: item.icon }
                  : {}),
                ...(["github", "hashicorp", "google", "cloud"].includes(
                  item.logo ?? "",
                )
                  ? { logo: item.logo }
                  : {}),
              })),
          }
        : {}),
      ...(Array.isArray(tab.links)
        ? {
            links: tab.links
              .slice(0, 30)
              .map((link) => ({
                label: text(link.label, 100),
                href: websiteUrl(link.href),
                display: text(link.display, 100),
                ...(["email", "github", "linkedin", "x", "resume"].includes(
                  link.icon ?? "",
                )
                  ? { icon: link.icon }
                  : {}),
              })),
          }
        : {}),
    };
  });
  if (!text(v.profile.name)) throw new Error("Your profile needs a name.");
  return {
    version: 1,
    revision: text(v.revision, 80),
    profile: {
      name: text(v.profile.name),
      rolePrefix: text(v.profile.rolePrefix),
      employer: text(v.profile.employer),
      employerUrl: websiteUrl(v.profile.employerUrl),
      photo: websiteUrl(v.profile.photo, true),
      location: text(v.profile.location),
      biography: text(v.profile.biography, 4000),
    },
    tabs,
    tools: v.tools
      .slice(0, 80)
      .map((tool) => ({
        label: text(tool.label, 100),
        src: websiteUrl(tool.src, true),
        href: websiteUrl(tool.href),
        hidden: Boolean(tool.hidden),
      })),
    seo: {
      title: text(v.seo.title),
      description: text(v.seo.description, 1000),
      image: websiteUrl(v.seo.image, true),
    },
  };
}
