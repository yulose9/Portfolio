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

export const PROFILE = {
  name: "John Nazarene Dela Pisa",
  rolePrefix: "AI Specialist at",
  employer: "FEAREX Technologies",
  employerUrl: "https://fearextechnologies.com",
};

/**
 * The tools row under the role line. Files live in public/tools; `label` is
 * both the hover label and the alt text. Order is the order shown.
 */
export type Tool = { label: string; src: string };

export const TOOLS: Tool[] = [
  { label: "Claude", src: "/tools/claude.svg" },
  { label: "Claude Code", src: "/tools/claude-code.svg" },
  { label: "Codex", src: "/tools/codex.svg" },
  { label: "Gemini", src: "/tools/gemini.svg" },
  // A raster inside an SVG wrapper at 2.4 MB; a 96px PNG (3x) is identical at 32px.
  { label: "Google Antigravity", src: "/tools/antigravity.png" },
  { label: "GitHub Copilot", src: "/tools/github-copilot.svg" },
  { label: "GitHub", src: "/tools/github.svg" },
  { label: "VS Code", src: "/tools/vscode.svg" },
  { label: "Figma", src: "/tools/figma.svg" },
  { label: "AWS", src: "/tools/aws.svg" },
];

export const TABS: Tab[] = [
  {
    id: "work",
    label: "Work",
    items: [
      {
        title: "AI Specialist",
        company: "FEAREX Technologies",
        year: "2026 — Present",
        icon: "robot",
        href: "https://fearextechnologies.com",
      },
      {
        title: "Solutions Architect (AWS & RHEL)",
        company: "Trends and Technologies",
        year: "2024 — 2026",
        icon: "hardhat",
        href: "https://www.trends.com.ph/",
        image: "/images/company-logos/trends-and-technologies.png",
        fit: "contain",
      },
      {
        title: "Design Intern (UI/UX)",
        company: "Archicoders",
        year: "2023 — 2024",
        icon: "palette",
        href: "https://archicoders.com/",
        image: "/images/company-logos/archicoders.jpg",
        fit: "contain",
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    items: [
      {
        title: "This portfolio, redesigned",
        year: "2026",
      },
    ],
  },
  {
    id: "certificates",
    label: "Certificates",
    items: [
      {
        title: "AWS Certified Cloud Practitioner",
        company: "Amazon Web Services",
        year: "2026",
        href: "https://www.credly.com/badges/158758df-43b4-49ea-bd59-034f673aa62f/linked_in_profile",
        logo: "cloud",
      },
      {
        title: "GitHub Copilot",
        company: "Microsoft",
        year: "2025",
        // ?ref=...linkedin.com stripped: it only tells Microsoft where the
        // click came from and is not part of addressing the credential.
        href: "https://learn.microsoft.com/en-us/users/jrdelapisa/credentials/63eb1c0444a4c682",
        logo: "github",
        image: "/images/certifications/Github_Copilot_badge.png",
        fit: "contain",
      },
      {
        title: "Terraform Associate",
        company: "HashiCorp",
        year: "2025",
        logo: "hashicorp",
        href: "https://www.credly.com/badges/bebd520f-8e29-4ec4-9f11-22a35b047349/linked_in_profile",
        image: "/images/certifications/TerraformAssociate.png",
        fit: "contain",
      },
      {
        title: "Cloud Digital Leader",
        company: "Google",
        year: "2025",
        logo: "google",
        href: "https://www.credly.com/badges/95d75765-13fa-4c81-802c-834c0217da8a/linked_in_profile",
        image: "/images/certifications/googlecloudpractitioner.png",
        fit: "contain",
      },
      {
        title: "Azure Fundamentals",
        company: "Microsoft",
        year: "2024",
        logo: "cloud",
        href: "https://learn.microsoft.com/api/credentials/share/en-us/JohnNazareneDelaPisa-8958/D57215FE29EAA434",
        image: "/images/certifications/microsoft-certified-fundamentals-badge.svg",
        fit: "contain",
      },
    ],
  },
  {
    // Its own tab now, rather than a section under the bio. Placeholders for
    // the moment: rows have no href, so they show the hand but go nowhere.
    id: "writing",
    label: "Writing",
    posts: [
      {
        title: "Your agent eval suite is measuring the wrong thing",
        date: "2026-06-18",
      },
      {
        title: "Terraform state is a coordination problem, not a file",
        date: "2026-02-04",
      },
      {
        title: "Checkpointing inference jobs on spot instances",
        date: "2025-11-12",
      },
      {
        title: "Retrieval was never the hard part",
        date: "2025-07-30",
      },
      {
        title: "Notes on tuning RHEL for latency-sensitive workloads",
        date: "2024-09-09",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    body: [
      "I am a Computer Engineer based in Cavite, Philippines, working as an AI Specialist at FEAREX Technologies.",
      "Most of what I build sits where AI meets infrastructure — agentic systems, the platforms they run on, and the tooling that keeps them dependable once they are in production. I care about the unglamorous half: evaluation, orchestration, and the plumbing that decides whether any of it survives contact with real use.",
      "Before this I spent two years as a Solutions Architect across AWS and RHEL, which is where the infrastructure instincts come from.",
    ],
    links: [
      {
        label: "Email",
        href: "mailto:jannazarene09@gmail.com",
        icon: "email",
      },
      { label: "GitHub", href: "https://github.com/yulose9", icon: "github" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/jannazarene",
        icon: "linkedin",
      },
      { label: "X", href: "https://x.com/xcszan", icon: "x" },
      {
        label: "Resume",
        href: "https://johnnazarene-resume.s3.ap-southeast-1.amazonaws.com/John_Nazarene_Resume_Latest_Cert.pdf",
        display: "Download PDF",
        icon: "resume",
      },
    ],
  },
];
