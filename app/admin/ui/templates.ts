/*
 * Starting points for a new post (Notion's templates). Each is a skeleton to
 * write over, not filler: headings where the argument usually needs them and
 * one line in each saying what goes there.
 */

export type Template = { id: string; title: string; hint: string; emoji: string; init: { title?: string; body?: string; tags?: string[]; page?: boolean } };

export const TEMPLATES: Template[] = [
  { id: "blank", title: "Blank", hint: "An empty page", emoji: "📄", init: {} },
  {
    id: "essay",
    title: "Essay",
    hint: "An argument, start to finish",
    emoji: "✍️",
    init: {
      body: [
        "Open with the claim, in one or two sentences.",
        "",
        "## Why it matters",
        "",
        "The problem, and who has it.",
        "",
        "## What I found",
        "",
        "The evidence: numbers, examples, what you tried.",
        "",
        "## What to do about it",
        "",
        "The practical takeaway.",
      ].join("\n"),
    },
  },
  {
    id: "til",
    title: "Today I learned",
    hint: "One small, useful thing",
    emoji: "💡",
    init: {
      tags: ["TIL"],
      body: ["> [!TIP]", "> The thing, in one sentence.", "", "What I was doing when I ran into it, and the fix.", "", "```ts", "// the snippet", "```"].join("\n"),
    },
  },
  {
    id: "release",
    title: "Release notes",
    hint: "What shipped and why",
    emoji: "🚀",
    init: {
      tags: ["Release"],
      body: ["## New", "", "- ", "", "## Improved", "", "- ", "", "## Fixed", "", "- "].join("\n"),
    },
  },
  {
    id: "link",
    title: "Link post",
    hint: "Share a post, video or page, with a take",
    emoji: "🔗",
    init: { body: ["Paste a link to a post on X, Threads or a YouTube video on the next line.", "", "", "", "Why it's worth your time."].join("\n") },
  },
  {
    id: "note",
    title: "Listed note",
    hint: "Just a title in the Writing list",
    emoji: "🗂️",
    init: { page: false },
  },
];
