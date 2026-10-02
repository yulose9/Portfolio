/** Fence names → what the header says. Unknown names are shown as written. */
const NAMES: Record<string, string> = {
  bash: "Bash", sh: "Shell", shell: "Shell", zsh: "Zsh", c: "C", cpp: "C++", csharp: "C#", cs: "C#", css: "CSS",
  diff: "Diff", go: "Go", graphql: "GraphQL", html: "HTML", java: "Java", javascript: "JavaScript", js: "JavaScript",
  json: "JSON", jsx: "JSX", kotlin: "Kotlin", markdown: "Markdown", md: "Markdown", php: "PHP", powershell: "PowerShell",
  python: "Python", py: "Python", ruby: "Ruby", rust: "Rust", sql: "SQL", swift: "Swift", toml: "TOML", tsx: "TSX",
  typescript: "TypeScript", ts: "TypeScript", xml: "XML", yaml: "YAML", yml: "YAML", plaintext: "Text", text: "Text",
};

export const languageName = (lang?: string | null) => (lang ? NAMES[lang.toLowerCase()] ?? lang : "Text");
