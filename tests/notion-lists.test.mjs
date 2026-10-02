import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { outdentEmptyItem } from "../app/admin/ui/extensions/tab-keys.ts";
import { HEADING_SHORTCUT, headingLevelFor } from "../app/admin/ui/extensions/heading-rules.ts";
import { filterSlashItems, orderSlashItems, slashGroupOf, SLASH_GROUPS } from "../app/admin/ui/slash-groups.ts";

/* ── Enter on an empty list item ─────────────────────────────────────── */

const schema = getSchema([StarterKit, TaskList, TaskItem.configure({ nested: true })]);

// A small builder: strings are paragraphs, ul/ol/todo are lists, li is an item.
const p = (text) => ({ type: "paragraph", content: text ? [{ type: "text", text }] : undefined });
const block = (child) => (typeof child === "string" ? p(child) : child);
const ul = (...items) => ({ type: "bulletList", content: items });
const ol = (...items) => ({ type: "orderedList", content: items });
const todo = (...items) => ({ type: "taskList", content: items.map((i) => ({ ...i, type: "taskItem", attrs: { checked: false } })) });
const li = (...children) => ({ type: "listItem", content: children.map(block) });
const doc = (...children) => schema.nodeFromJSON({ type: "doc", content: children.map(block) });

/** The document as short text: ul[...], li(...), "words". */
function show(node) {
  const names = { bulletList: "ul", orderedList: "ol", taskList: "todo", listItem: "li", taskItem: "li" };
  if (node.type.name === "paragraph") return JSON.stringify(node.textContent);
  const inner = [];
  node.forEach((child) => inner.push(show(child)));
  if (node.type.name === "doc") return inner.join(" ");
  const name = names[node.type.name] ?? node.type.name;
  return node.type.name.endsWith("List") ? `${name}[${inner.join(", ")}]` : `${name}(${inner.join(", ")})`;
}

/** A state with the caret in the first empty paragraph inside a list item. */
function caretInEmptyItem(document) {
  let at = null;
  document.descendants((node, pos, parent) => {
    if (at === null && node.type.name === "paragraph" && node.content.size === 0 && parent && /item$/i.test(parent.type.name)) at = pos + 1;
    return at === null;
  });
  assert.notEqual(at, null, "no empty item in the test document");
  return EditorState.create({ doc: document, selection: TextSelection.create(document, at) });
}

/** Press Enter (the outdent command) on the state; returns the new state, or null if it passed. */
function enter(state) {
  let next = null;
  const handled = outdentEmptyItem(state, (tr) => (next = state.apply(tr)));
  return handled ? next : null;
}

test("Enter on an empty nested bullet steps it out one level", () => {
  const state = enter(caretInEmptyItem(doc(ul(li("a", ul(li("b"), li("")))))));
  assert.equal(show(state.doc), 'ul[li("a", ul[li("b")]), li("")]');
  assert.equal(state.selection.$from.parent.content.size, 0);
});

test("Enter keeps stepping out until level 0, then ends the list", () => {
  let state = caretInEmptyItem(doc(ul(li("a", ul(li("b", ul(li("")))))), "after"));
  state = enter(state);
  assert.equal(show(state.doc), 'ul[li("a", ul[li("b"), li("")])] "after"');
  state = enter(state);
  assert.equal(show(state.doc), 'ul[li("a", ul[li("b")]), li("")] "after"');
  state = enter(state);
  assert.equal(show(state.doc), 'ul[li("a", ul[li("b")])] "" "after"');
  // Now a paragraph: Enter is no longer ours.
  assert.equal(enter(state), null);
});

test("an empty item in the middle of a nested list steps out, taking the items after it", () => {
  const state = enter(caretInEmptyItem(doc(ul(li("a", ul(li(""), li("c")))))));
  assert.equal(show(state.doc), 'ul[li("a"), li("", ul[li("c")])]');
});

test("an empty item with nested children steps out with them", () => {
  const state = enter(caretInEmptyItem(doc(ul(li("a", ul(li("", ul(li("x")))))))));
  assert.equal(show(state.doc), 'ul[li("a"), li("", ul[li("x")])]');
});

test("numbered and to-do lists step out the same way", () => {
  const numbered = enter(caretInEmptyItem(doc(ol(li("one", ol(li("")))))));
  assert.equal(show(numbered.doc), 'ol[li("one"), li("")]');
  const tasks = enter(caretInEmptyItem(doc(todo(li("one", todo(li("")))))));
  assert.equal(show(tasks.doc), 'todo[li("one"), li("")]');
  assert.equal(tasks.doc.firstChild.childCount, 2);
  // A bullet inside a numbered item steps out into the numbered list.
  const mixed = enter(caretInEmptyItem(doc(ol(li("one", ul(li("")))))));
  assert.equal(show(mixed.doc), 'ol[li("one"), li("")]');
});

test("Enter on an empty top-level item ends the list as a paragraph", () => {
  assert.equal(show(enter(caretInEmptyItem(doc(ul(li("a"), li(""))))).doc), 'ul[li("a")] ""');
  assert.equal(show(enter(caretInEmptyItem(doc(todo(li("a"), li(""))))).doc), 'todo[li("a")] ""');
  assert.equal(show(enter(caretInEmptyItem(doc(ol(li("a"), li(""), li("c"))))).doc), 'ol[li("a")] "" ol[li("c")]');
});

test("Enter in an item with words, or with a selection, is left to the list", () => {
  const document = doc(ul(li("a", ul(li("b")))));
  const inWords = EditorState.create({ doc: document, selection: TextSelection.create(document, document.content.size - 5) });
  assert.equal(inWords.selection.$from.parent.type.name, "paragraph");
  assert.equal(inWords.selection.$from.parent.textContent, "b");
  assert.equal(enter(inWords), null);
  const selected = EditorState.create({ doc: document, selection: TextSelection.create(document, 3, 4) });
  assert.equal(enter(selected), null);
});

test("an empty paragraph tucked under an item's first line is left alone", () => {
  const document = doc(ul(li("a", "")));
  const state = EditorState.create({ doc: document, selection: TextSelection.create(document, document.content.size - 3) });
  assert.equal(state.selection.$from.index(-1), 1);
  assert.equal(enter(state), null);
});

/* ── "# " headings ───────────────────────────────────────────────────── */

test("one to three hashes make Heading 1 to 3 (h2 to h4)", () => {
  assert.equal(headingLevelFor(HEADING_SHORTCUT.exec("# ")[1]), 2);
  assert.equal(headingLevelFor(HEADING_SHORTCUT.exec("## ")[1]), 3);
  assert.equal(headingLevelFor(HEADING_SHORTCUT.exec("### ")[1]), 4);
  assert.equal(HEADING_SHORTCUT.exec("#### "), null);
  assert.equal(HEADING_SHORTCUT.exec("#"), null);
});

/* ── The "/" menu's sections ─────────────────────────────────────────── */

const item = (id, title, keywords = [], shortcut) => ({ id, title, keywords, shortcut, group: slashGroupOf(id) });
const MENU = [
  item("code", "Code", ["code", "snippet", "pre"], "```"),
  item("emoji", "Emoji", ["emoji", "icon", "smiley"], ":"),
  item("table", "Table", ["table", "grid", "rows", "columns"]),
  item("paragraph", "Text", ["paragraph", "p", "plain"]),
  item("image", "Photo, video or audio", ["picture", "photo", "video"]),
  item("h1", "Heading 1", ["h1", "title", "section", "heading"], "#"),
  item("bullet", "Bulleted list", ["ul", "bullet", "list"], "-"),
  item("divider", "Divider", ["hr", "rule", "divider", "line"], "---"),
  item("mystery", "Something new", ["new"]),
  item("mention", "Mention a page", ["mention", "page"], "@"),
];

test("menu items sit in Notion's sections, in Notion's order", () => {
  assert.deepEqual(SLASH_GROUPS, ["Basic blocks", "Media", "Advanced", "Inline"]);
  assert.deepEqual(
    orderSlashItems(MENU).map((i) => `${i.group}: ${i.id}`),
    [
      "Basic blocks: paragraph",
      "Basic blocks: h1",
      "Basic blocks: bullet",
      "Basic blocks: divider",
      "Media: image",
      "Advanced: table",
      "Advanced: code",
      "Advanced: mystery",
      "Inline: mention",
      "Inline: emoji",
    ],
  );
});

test("searching hides empty sections and leads with the best match", () => {
  const ids = (query) => filterSlashItems(MENU, query).map((i) => i.id);
  assert.deepEqual(ids(""), orderSlashItems(MENU).map((i) => i.id));
  // "table" is a whole title in Advanced: Advanced comes first.
  assert.deepEqual(ids("table"), ["table"]);
  // "li" starts a word of "Bulleted list" and "line" is a divider keyword:
  // Basic blocks only, the title match first.
  assert.deepEqual(ids("li"), ["bullet", "divider"]);
  // "co" starts "Code" (Advanced) before it matches a keyword of the table.
  assert.deepEqual(ids("co")[0], "code");
  // A Markdown shortcut finds its block.
  assert.deepEqual(ids("---"), ["divider"]);
  assert.deepEqual(ids("zzz"), []);
  // Each section appears once, its items together.
  const groups = filterSlashItems(MENU, "e").map((i) => i.group);
  const runs = groups.filter((g, i) => i === 0 || g !== groups[i - 1]);
  assert.ok(runs.length > 1);
  assert.equal(new Set(runs).size, runs.length);
});

/* ── Nested list markers (app/article.css) ───────────────────────────── */

test("nested bullets and numbers cycle every three levels, nine levels deep", async () => {
  const css = (await readFile(new URL("../app/article.css", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const rules = [...css.matchAll(/(\.article-body[^{}]*?)\{\s*list-style-type:\s*([a-z-]+);\s*\}/g)].map(([, selector, style]) => ({
    selector: selector.replace(/\s+/g, " ").trim(),
    style,
  }));
  const BULLET = 'ul:not([data-type], .contains-task-list)';
  const bullets = ["disc", "circle", "square"];
  const numbers = ["decimal", "lower-alpha", "lower-roman"];
  for (let depth = 1; depth <= 8; depth++) {
    const bullet = `.article-body ${Array(depth + 1).fill(BULLET).join(" ")}`;
    assert.equal(rules.find((r) => r.selector === bullet)?.style, bullets[depth % 3], `bullet level ${depth}`);
    const number = `.article-body ${"ol ".repeat(depth)}ol:not([type])`;
    assert.equal(rules.find((r) => r.selector === number)?.style, numbers[depth % 3], `number level ${depth}`);
  }
  // Level 0 is the plain list's own style.
  assert.match(css, /\.article-body ul \{\s*list-style: disc;/);
  assert.match(css, /\.article-body ol \{\s*list-style: decimal;/);
});
