import test from "node:test";
import assert from "node:assert/strict";
import { editableLink } from "../app/admin/ui/editable-link.ts";

test("link editing leaves page mentions and other atom node links to their own handlers", () => {
  const root = { contains: link => link.inside };
  const ordinary = { inside:true, closest:() => null };
  const pageMention = { inside:true, closest:() => ({contentEditable:"false"}) };
  const outside = { inside:false, closest:() => null };
  const target = link => ({closest:() => link});
  assert.equal(editableLink(root,target(ordinary)),ordinary);
  assert.equal(editableLink(root,target(pageMention)),null);
  assert.equal(editableLink(root,target(outside)),null);
  assert.equal(editableLink(root,null),null);
});
