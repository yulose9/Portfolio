import published from "../content/website.json";
/**
 * All page copy lives here so the layout components stay presentational.
 * Swap these values and the page follows — no component edits needed.
 */

export type Entry = {
  /** The role, or the certificate name. */
  title: string;
  /** The employer, or the issuing body. Rendered on its own line. */
  company?: string;
  year: string;
  /** Keyed rather than a component, so site-content stays free of imports. */
  icon?: "robot" | "hardhat" | "palette";
  /**
   * Issuer mark. github/hashicorp/google are the real brand marks; "cloud" is a
   * neutral stand-in for AWS and Azure, whose marks are not in Simple Icons.
   */
  logo?: "github" | "hashicorp" | "google" | "cloud";
  /** Omit to render the row as plain text instead of a link. */
  href?: string;
  /** Shown in the hover preview panel. Omit and the row just highlights. */
  image?: string;
  /** How the preview frames the image: logos need padding, screenshots fill. */
  fit?: "cover" | "contain";
};

export type Link = {
  label: string;
  href: string;
  /** Overrides the derived URL text — for links whose URL is not readable. */
  display?: string;
  /**
   * github and x are the real brand marks. email, linkedin and resume are
   * neutral glyphs: Simple Icons carries no LinkedIn mark, and a trademark is
   * not something to redraw by hand.
   */
  icon?: "email" | "github" | "linkedin" | "x" | "resume";
};

export type Post = {
  title: string;
  /** ISO date. The year groups the list; the rest renders as DD/MM. */
  date: string;
  href?: string;
};

export type Tab = {
  id: string;
  label: string;
  /** A tab renders a list of entries, or prose, or both. */
  items?: Entry[];
  body?: string[];
  links?: Link[];
  posts?: Post[];
  /** Shown in place of an empty list. */
  empty?: string;
};

export const PROFILE = published.profile;
export type Tool = { label: string; src: string; href?: string; hidden?: boolean };
export const TOOLS: Tool[] = published.tools.filter(tool => !(tool as Tool).hidden);
export const TABS: Tab[] = (published.tabs as (Tab & { hidden?: boolean })[]).filter(tab => !tab.hidden);