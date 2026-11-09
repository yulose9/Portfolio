import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "out");
const origin = "https://nazarene.dev";
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]));
async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}

let pages = 0;
const images = new Set();
for (const file of await files(root)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (!relative.endsWith(".html") || /^(?:admin(?:\/|\.)|404(?:\/|\.)|_not-found(?:\/|\.))/.test(relative)) continue;
  const html = await fs.readFile(file, "utf8");
  const head = html.split("</head>")[0];
  const tags = [...head.matchAll(/<meta\s[^>]*>/g)].map(match => attributes(match[0]));
  if (tags.some(tag => tag.name === "robots" && tag.content.includes("noindex"))) continue;
  const values = key => tags.filter(tag => tag.property === key || tag.name === key).map(tag => tag.content);
  const one = key => { const found = values(key); assert.equal(found.length, 1, `${relative}: expected one ${key}`); assert.ok(found[0]?.trim(), `${relative}: empty ${key}`); return found[0]; };
  const canonical = [...head.matchAll(/<link\s[^>]*>/g)].map(match => attributes(match[0])).filter(tag => tag.rel === "canonical");
  assert.equal(canonical.length, 1, `${relative}: canonical missing or duplicated`);
  const url = one("og:url");
  assert.equal(url, canonical[0].href, `${relative}: canonical and og:url disagree`);
  assert.equal(new URL(url).origin, origin);
  assert.equal(one("og:title"), one("twitter:title"), `${relative}: social titles disagree`);
  assert.equal(one("og:description"), one("twitter:description"), `${relative}: descriptions disagree`);
  one("og:type"); one("og:site_name"); one("og:image:alt");
  assert.equal(one("twitter:card"), "summary_large_image");
  assert.equal(one("og:image:type"), "image/png");
  assert.equal(one("og:image:width"), "1200");
  assert.equal(one("og:image:height"), "630");
  const image = one("og:image");
  assert.equal(image, one("twitter:image"), `${relative}: share images disagree`);
  const imageUrl = new URL(image);
  assert.equal(imageUrl.origin, origin);
  assert.match(imageUrl.pathname, /^\/og\/(?:site|writing|projects|tags)\/[^/]+\.[a-f0-9]{16}\.png$/);
  const imageFile = path.join(root, decodeURIComponent(imageUrl.pathname));
  const bytes = await fs.readFile(imageFile);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${relative}: not a PNG`);
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  assert.ok(bytes.length < 1_000_000, `${relative}: share image exceeds the 1 MB performance budget`);
  images.add(image); pages++;
}
assert.ok(pages >= 6, "No public page export found");
console.log(`Social export verified: ${pages} public pages, ${images.size} distinct PNGs, 1200×630, each under 1 MB.`);
