import test from "node:test";
import assert from "node:assert/strict";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { PollBase } from "../app/admin/ui/extensions/blocks-schema.ts";

const manager = new MarkdownManager({ extensions: [StarterKit.configure({ codeBlock: false }), PollBase] });
const pollOf = (md) => manager.parse(md).content.find((n) => n.type === "poll");
// What the poll's node view does: replace the attrs, then the draft is saved as Markdown.
const edit = (doc, attrs) => ({ ...doc, content: doc.content.map((n) => (n.type === "poll" ? { ...n, attrs: { ...n.attrs, ...attrs } } : n)) });

test("edited poll options survive a Markdown save and reopen", () => {
  const start = manager.serialize({ type: "doc", content: [{ type: "poll", attrs: { pollId: "abc123def4", question: "Tabs or spaces?", options: ["Tabs", "Spaces"] } }] });
  let doc = manager.parse(start);
  // Rename an option, add one below it (Enter), type into it, then move it up (Alt+↑).
  doc = edit(doc, { options: ["Tabs (hard)", "", "Spaces"] });
  doc = edit(doc, { options: ["Tabs (hard)", "Both", "Spaces"] });
  doc = edit(doc, { question: "Tabs, spaces or both?", options: ["Both", "Tabs (hard)", "Spaces"] });
  const md = manager.serialize(doc);
  const poll = pollOf(md);
  assert.deepEqual(poll.attrs, { pollId: "abc123def4", question: "Tabs, spaces or both?", options: ["Both", "Tabs (hard)", "Spaces"] });
  assert.equal(manager.serialize(manager.parse(md)), md, "a second save is identical");
});

test("blank options are dropped on save, but a poll never drops below two", () => {
  const base = { type: "poll", attrs: { pollId: "abc123def4", question: "Pick one", options: ["A", "", "B", " "] } };
  assert.deepEqual(pollOf(manager.serialize({ type: "doc", content: [base] })).attrs.options, ["A", "B"]);
  // Mid-edit, with one option still blank: it must read back as a poll, not as stray HTML.
  const midEdit = { ...base, attrs: { ...base.attrs, options: ["A", ""] } };
  const poll = pollOf(manager.serialize({ type: "doc", content: [midEdit] }));
  assert.ok(poll, "still a poll");
  assert.equal(poll.attrs.options.length, 2);
  assert.equal(poll.attrs.options[0], "A");
});
