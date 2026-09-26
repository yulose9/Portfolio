# Writing editor controls

- Drag a text selection across paragraphs to select whole blocks. Use the floating toolbar for formatting, duplicate, or delete. Drag a selected block's grip to move the selection together. The block menu and move shortcuts also act on the selected group. Undo restores these edits.
- Select an image to edit its width in pixels, alt text, or caption. Drag either bottom corner to resize with its aspect ratio preserved. Reset size restores automatic sizing. Sized images are saved as HTML inside Markdown so their dimensions survive publishing.
- Type `@` and a date or page name, then choose an item with the mouse or the arrow keys and Enter. Examples: `@today`, `@yesterday`, `@last Monday`, `@Tuesday 14:30`, and `@2026-09-06`.
- Dates use Asia/Manila (UTC+8). A mention stores its calendar date, not the word “today.” The label updates as time passes: Today, Yesterday, Last Sunday, then a full date at seven days. Click the mention in the editor to change its date or optional 24-hour time. Readers cannot edit dates.
- Choose an existing page in the `@` menu, or type a new title and choose “Create subpage.” The new page is a draft associated with its parent. Open its link in another tab to write it. Parent and child are published independently. Public mentions resolve stable IDs to current published slugs; unpublished targets remain text.
- On phones and narrower windows, the contents list is a sticky disclosure above the article body and closes after choosing a heading. At 1440px and wider it becomes a right rail beyond the article's wide figures.

## Checks

Run the editor and mention regression tests with:

```sh
node --experimental-loader ./tests/typescript-loader.mjs --test tests/editor-blocks.test.mjs tests/mentions.test.mjs tests/updated-at.test.mjs
```

These cover date rollover, Markdown persistence, parent validation, published link resolution, mixed-block edits and undo, and image dimensions. They do not replace browser checks for dragging, popover placement, keyboard focus, or responsive layout.
