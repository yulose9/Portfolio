import { Extension, textblockTypeInputRule } from "@tiptap/core";

/*
 * Markdown headings the way Notion takes them: "# " at the start of a line
 * makes Heading 1, "## " Heading 2 and "### " Heading 3.
 *
 * On the page those are h2–h4 (h1 is the post's title), and Tiptap's own rule
 * counts hashes from the lowest level allowed, so on its own "## " would make
 * Heading 1 and "# " would do nothing. This rule runs first (higher priority);
 * four hashes still fall through to Tiptap's, which also gives Heading 3.
 */
export const HEADING_SHORTCUT = /^(#{1,3})\s$/;

/** The heading level (2–4) for the hashes typed: one hash is Heading 1, an h2. */
export const headingLevelFor = (hashes: string) => hashes.length + 1;

export const HeadingShortcuts = Extension.create({
  name: "headingShortcuts",
  priority: 150,

  addInputRules() {
    const type = this.editor.schema.nodes.heading;
    if (!type) return [];
    return [
      textblockTypeInputRule({
        find: HEADING_SHORTCUT,
        type,
        getAttributes: (match) => ({ level: headingLevelFor(match[1]) }),
      }),
    ];
  },
});
