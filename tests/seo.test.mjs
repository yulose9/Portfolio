import test from "node:test";
import assert from "node:assert/strict";

import { markdownToTree } from "../cms/render.ts";
import { suggestSlug } from "../cms/slug.ts";
import { isValidSlug } from "../cms/format.ts";
import { clip, plainText, postDescription } from "../app/lib/seo.ts";

const headings = (tree) => {
  const out = [];
  const walk = (n) => {
    if (/^h[1-6]$/.test(n.tagName ?? "")) out.push(n.tagName);
    for (const k of n.children ?? []) walk(k);
  };
  walk(tree);
  return out;
};

test("a post body never emits an h1 and never skips a heading level", async () => {
  const tree = await markdownToTree("# Top\n\ntext\n\n#### Deep\n\n## Next\n\n### Sub\n\n###### Very deep\n");
  assert.deepEqual(headings(tree), ["h2", "h3", "h2", "h3", "h4"]);
});

test("toggle headings take part in the heading order", async () => {
  const tree = await markdownToTree("## A\n\n<details>\n<summary><h4>Folded</h4></summary>\n\nInside.\n\n</details>\n");
  assert.deepEqual(headings(tree), ["h2", "h3"]);
});

test("suggested slugs are short, ASCII, hyphenated and valid", () => {
  assert.equal(suggestSlug("The age of constant change and uncertainty"), "age-constant-change-uncertainty");
  assert.equal(suggestSlug("Why retrieval was never the hard part!"), "why-retrieval-never-hard-part");
  assert.equal(suggestSlug("Café déjà vu"), "cafe-deja-vu");
  assert.equal(suggestSlug("The API"), "the-api");
  const long = suggestSlug("Building reliable agentic systems on AWS with Terraform, RHEL and a lot of patience over many months");
  assert.ok(long.length <= 60 && isValidSlug(long), long);
});

test("meta descriptions come from the post, sized for a search snippet", () => {
  const body = "On January 2, 2026, I posted a story about [Forrester](https://x.com)'s predictions. **They** said two things that stuck with me.\n\n## Next\n\nMore text here that goes on.";
  const d = postDescription({ title: "T", dek: "This year has been wild.", body });
  assert.ok(d.startsWith("This year has been wild. On January 2, 2026"), d);
  assert.ok(d.length <= 160, String(d.length));
  assert.ok(!/[\[\]*#]/.test(d), d);
  assert.equal(postDescription({ title: "Only a title", dek: "", body: "" }), "Only a title");
  assert.equal(plainText("![alt](/a.png) Hello [[Page|label]]"), "Hello label");
  assert.equal(clip("one two three four", 12), "one two…");
});
