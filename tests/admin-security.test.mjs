import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Exercise the actual dependency-free request/upload helpers without starting
// Pages, contacting Access, or reading deployment credentials.
async function loadHelper(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { readJson, readBytes, isAdminWrite } = await loadHelper("../cms/server/http.ts");
const { matchesMediaType } = await loadHelper("../cms/server/upload.ts");
const request = (body, headers = {}) => new Request("https://admin.example/api/admin/posts", {
  method: "POST", body, headers: { "Content-Type": "application/json", ...headers },
});

test("JSON rejects malformed, non-object, and incorrect media types", async () => {
  for (const input of ["{", "null", "[]", '"text"', "1"]) {
    await assert.rejects(readJson(request(input)), { status: 400 });
  }
  await assert.rejects(readJson(request("{}", { "Content-Type": "text/plain" })), { status: 415 });
  assert.deepEqual(await readJson(request('{"title":"Draft"}')), { title: "Draft" });
});

test("reader rejects actual overflow even with a false length header", async () => {
  await assert.rejects(readBytes(request("12345", { "Content-Length": "1" }), 4), { status: 413 });
  assert.equal((await readBytes(request("1234"), 4)).length, 4);
  await assert.rejects(readBytes(request("1", { "Content-Length": "9999" }), 4), { status: 413 });
});

test("cross-site forms and missing or opaque origins cannot mutate", () => {
  const good = { Origin: "https://admin.example", "X-Admin-Request": "1", "Sec-Fetch-Site": "same-origin" };
  assert.equal(isAdminWrite(request("{}", good)), true);
  for (const headers of [
    {}, { ...good, Origin: "null" }, { ...good, Origin: "https://evil.example" },
    { ...good, "X-Admin-Request": "" }, { ...good, "Sec-Fetch-Site": "same-site" },
    { ...good, "Sec-Fetch-Site": "cross-site" },
  ]) assert.equal(isAdminWrite(request("{}", headers)), false);
});

test("media content must match declared format", () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(matchesMediaType(png, "image/png"), true);
  assert.equal(matchesMediaType(png, "image/jpeg"), false);
  for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "video/mp4", "audio/webm", "audio/ogg", "audio/mpeg"]) {
    assert.equal(matchesMediaType(new TextEncoder().encode("<svg onload='alert(1)'></svg>"), type), false);
    assert.equal(matchesMediaType(new Uint8Array(), type), false);
  }
});
