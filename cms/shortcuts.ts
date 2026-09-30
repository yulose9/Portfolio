export const SHORTCUTS = [
  { id: "save", label: "Save page", keys: "Mod+s", group: "Workspace" },
  { id: "find", label: "Find in page", keys: "Mod+f", group: "Search" },
  { id: "replace", label: "Find and replace", keys: "Mod+h", group: "Search" },
  {
    id: "palette",
    label: "Search pages and commands",
    keys: "Mod+k",
    group: "Search",
  },
  { id: "details", label: "Page details", keys: "Mod+.", group: "Workspace" },
  {
    id: "preview",
    label: "Toggle page preview",
    keys: "Mod+Shift+e",
    group: "Workspace",
  },
  {
    id: "publish",
    label: "Open publishing options",
    keys: "Mod+Shift+p",
    group: "Workspace",
  },
  { id: "bold", label: "Bold", keys: "Mod+b", group: "Formatting" },
  { id: "italic", label: "Italic", keys: "Mod+i", group: "Formatting" },
  { id: "underline", label: "Underline", keys: "Mod+u", group: "Formatting" },
  {
    id: "strike",
    label: "Strikethrough",
    keys: "Mod+Shift+s",
    group: "Formatting",
  },
  { id: "code", label: "Inline code", keys: "Mod+e", group: "Formatting" },
  { id: "undo", label: "Undo", keys: "Mod+z", group: "Editing" },
  { id: "redo", label: "Redo", keys: "Mod+Shift+z", group: "Editing" },
  {
    id: "heading1",
    label: "Heading 1",
    keys: "Mod+Alt+1",
    group: "Formatting",
  },
  {
    id: "heading2",
    label: "Heading 2",
    keys: "Mod+Alt+2",
    group: "Formatting",
  },
  {
    id: "heading3",
    label: "Heading 3",
    keys: "Mod+Alt+3",
    group: "Formatting",
  },
  {
    id: "paragraph",
    label: "Paragraph",
    keys: "Mod+Alt+0",
    group: "Formatting",
  },
  {
    id: "bullet",
    label: "Bullet list",
    keys: "Mod+Shift+7",
    group: "Formatting",
  },
  {
    id: "ordered",
    label: "Numbered list",
    keys: "Mod+Shift+8",
    group: "Formatting",
  },
  {
    id: "duplicate",
    label: "Duplicate block",
    keys: "Mod+d",
    group: "Editing",
  },
  {
    id: "moveUp",
    label: "Move block up",
    keys: "Mod+Shift+arrowup",
    group: "Editing",
  },
  {
    id: "moveDown",
    label: "Move block down",
    keys: "Mod+Shift+arrowdown",
    group: "Editing",
  },
] as const;
export type ShortcutId = (typeof SHORTCUTS)[number]["id"];
export type Bindings = Partial<Record<ShortcutId, string>>;
export function shortcutKey(e: {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string {
  if (!e.metaKey && !e.ctrlKey) return "";
  let key = e.key.toLowerCase();
  if (["control", "meta", "shift", "alt"].includes(key)) return "";
  if (e.code && /^Digit[0-9]$/.test(e.code)) key = e.code.slice(-1);
  return `Mod+${e.altKey ? "Alt+" : ""}${e.shiftKey ? "Shift+" : ""}${key}`;
}
export function validateBindings(value: unknown): Bindings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid shortcuts.");
  const result: Bindings = {};
  const used = new Set<string>();
  for (const item of SHORTCUTS) {
    const key = (value as Record<string, unknown>)[item.id] ?? item.keys;
    if (
      typeof key !== "string" ||
      !/^Mod\+(?:Alt\+)?(?:Shift\+)?(?:[a-z0-9.,/;'-]|arrowup|arrowdown|arrowleft|arrowright)$/.test(
        key,
      )
    )
      throw new Error("Use Ctrl/⌘ plus a letter, number or arrow.");
    if (
      [
        "Mod+w",
        "Mod+q",
        "Mod+t",
        "Mod+n",
        "Mod+r",
        "Mod+l",
        "Mod+a",
        "Mod+c",
        "Mod+x",
        "Mod+v",
        "Mod+Shift+v",
        "Mod+Shift+t",
        "Mod+Shift+n",
        "Mod+Alt+f",
      ].includes(key)
    )
      throw new Error("That shortcut is reserved by the browser or editor.");
    if (used.has(key))
      throw new Error(
        `${key} is already assigned. Change the other action first.`,
      );
    used.add(key);
    result[item.id] = key;
  }
  return result;
}
