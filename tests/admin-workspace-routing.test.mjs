import test from "node:test";
import assert from "node:assert/strict";
import { call, setApiWorkspace } from "../app/admin/ui/api.ts";

test("overview reads Writing counts after the Projects workspace was active", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ posts: [] }), { headers: { "Content-Type": "application/json" } });
  };
  try {
    setApiWorkspace("projects");
    await call("/posts", {}, "writing");
    await call("/projects/posts");
    await call("/posts");
    assert.deepEqual(requests.map(r => r.url), ["/api/admin/posts", "/api/admin/projects/posts", "/api/admin/projects/posts"]);
    for (const request of requests) {
      assert.equal(request.init.credentials, "same-origin");
      assert.equal(request.init.headers["X-Admin-Request"], "1");
    }
  } finally { globalThis.fetch = original; setApiWorkspace("writing"); }
});
