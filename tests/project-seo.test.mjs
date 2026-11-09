import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { projectAncestors, projectSeo, projectShareImage } from "../app/lib/project-seo.ts";
import { ID, SITE_INFO, jsonLd } from "../app/constants/seo.ts";
import { markdownToTree, prioritizeLeadImage } from "../cms/render.ts";
import { projectImageSizes, sizeProjectImages } from "../cms/project-images.ts";
import { imageInfo } from "../cms/media.ts";
import { pageIconSrc } from "../cms/page-icon.ts";
import { fontLinks, fontVars } from "../cms/fonts.ts";

const source = (overrides = {}) => ({
  id: "project-test", slug: "a-real-project", title: "A real project", dek: "An author's account.",
  body: "I built a prototype and documented what happened.\n\n## Process\n\nI tested it with a colleague.",
  authors: [{ name: SITE_INFO.name, email: "private-owner@example.test" }, { name: "Coauthor", email: "private-coauthor@example.test", avatar: "gen:private:seed" }],
  tags: ["Design", "Tools"], cover: null, ogImage: null, parentId: null,
  publishedAt: "2026-01-02T03:04:05+08:00", updatedAt: "2026-02-03T04:05:06Z",
  ...overrides,
});
const nodeOf = (graph, type) => graph["@graph"].find(node => node["@type"] === type);
const imagesIn = tree => tree.children.flatMap(node => [
  ...(node.tagName === "img" ? [node] : []), ...(node.children ? imagesIn(node) : []),
]);

test("project canonical, Open Graph, Twitter and graph use the same public source facts", () => {
  const page = source();
  const { metadata, graph, url } = projectSeo(page);
  assert.equal(url, `${SITE_INFO.url}/projects/a-real-project`);
  assert.equal(metadata.alternates.canonical, url);
  assert.equal(metadata.alternates.types["text/markdown"][0].url, `${url}/index.md`);
  assert.ok(metadata.alternates.types["application/rss+xml"]);
  assert.equal(metadata.openGraph.url, url);
  assert.equal(metadata.openGraph.type, "article");
  assert.equal(metadata.openGraph.publishedTime, page.publishedAt);
  assert.equal(metadata.openGraph.modifiedTime, page.updatedAt);
  for (const output of [metadata, metadata.openGraph, metadata.twitter]) {
    assert.equal(output.title, page.title);
    assert.equal(output.description, metadata.description);
  }
  assert.ok(metadata.description.startsWith("An author's account. I built a prototype"));
  assert.ok(metadata.description.length <= 160);
  const article = nodeOf(graph, "Article");
  const webPage = nodeOf(graph, "WebPage");
  assert.equal(article.mainEntityOfPage["@id"], webPage["@id"]);
  assert.equal(webPage.mainEntity["@id"], article["@id"]);
  assert.equal(webPage.breadcrumb["@id"], nodeOf(graph, "BreadcrumbList")["@id"]);
  assert.equal(article.publisher["@id"], nodeOf(graph, "Person")["@id"]);
  assert.equal(article.isPartOf["@id"], ID.website);
  assert.equal(nodeOf(graph, "WebSite")["@id"], ID.website);
  assert.equal(article.datePublished, page.publishedAt);
  assert.deepEqual(article.keywords, page.tags);
});

test("metadata selects public author names without copying email or draft fields", () => {
  const page = source({
    authors: [...source().authors, { name: "  ", email: "anonymous@example.test" }],
    editorial: { notes: "PRIVATE_EDITORIAL" }, editorDocument: { text: "PRIVATE_DRAFT" },
    project: { outcomes: ["PRIVATE_UNSHOWN_OUTCOME"], timeframe: "Never a publication date" },
  });
  const { metadata, graph } = projectSeo(page);
  assert.deepEqual(metadata.authors, [{ name: SITE_INFO.name, url: SITE_INFO.url }, { name: "Coauthor" }]);
  assert.deepEqual(metadata.openGraph.authors, [SITE_INFO.name, "Coauthor"]);
  assert.equal(nodeOf(graph, "Article").author[1].url, undefined);
  assert.equal(metadata.twitter.creator, undefined);
  assert.doesNotMatch(JSON.stringify({ metadata, graph }), /@example\.test|mailto:|private:seed|PRIVATE_|"email"|"editorDocument"|"outcomes"/);
});

test("missing facts stay missing, with CreativeWork for an image-only page", () => {
  const page = source({ body: "![Artwork](/art.png)", dek: "", authors: [], tags: [], publishedAt: "", updatedAt: "" });
  const { metadata, graph } = projectSeo(page);
  assert.equal(metadata.description, page.title);
  assert.equal(metadata.openGraph.type, "website");
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(metadata.authors, []);
  assert.deepEqual(metadata.keywords, []);
  assert.equal(metadata.openGraph.images.length, 1);
  assert.match(metadata.openGraph.images[0].url, /\/og\/projects\/.*\.png$/);
  assert.equal(metadata.twitter.images.length, 1);
  assert.equal(nodeOf(graph, "Article"), undefined);
  const work = nodeOf(graph, "CreativeWork");
  for (const key of ["datePublished", "dateModified", "author", "keywords", "headline", "aggregateRating", "offers"]) assert.equal(work[key], undefined);
  assert.equal(nodeOf(graph, "WebPage").primaryImageOfPage, undefined);
  assert.doesNotMatch(JSON.stringify(graph), /\/og\/writing\/|1200|630|SoftwareApplication|Product/);
});

test("descriptions are bounded source excerpts and ignore hidden HTML", () => {
  const { metadata } = projectSeo(source({
    dek: "", body: "<!-- PRIVATE_COMMENT --><script>PRIVATE_SCRIPT</script><style>PRIVATE_CSS</style>\n\n" + "Published words about the prototype. ".repeat(20),
  }));
  assert.match(metadata.description, /^Published words about the prototype/);
  assert.ok(metadata.description.length <= 160);
  assert.doesNotMatch(metadata.description, /PRIVATE_|<|>/);
});

test("invalid and reversed dates are omitted instead of made up", () => {
  for (const invalid of ["", "yesterday", "2026-02-30T12:00:00Z", "2026-01-02T03:04:05", "2026-13-01", "<script>"]) {
    const { metadata, graph } = projectSeo(source({ publishedAt: invalid, updatedAt: invalid }));
    assert.equal(metadata.openGraph.publishedTime, undefined);
    assert.equal(metadata.openGraph.modifiedTime, undefined);
    assert.equal(nodeOf(graph, "Article").datePublished, undefined);
    assert.equal(nodeOf(graph, "WebPage").dateModified, undefined);
  }
  const { metadata, graph } = projectSeo(source({ updatedAt: "2025-01-01T00:00:00Z" }));
  assert.equal(metadata.openGraph.modifiedTime, undefined);
  assert.equal(nodeOf(graph, "Article").dateModified, undefined);
});

test("uploaded share art uses a normalized PNG while the cover remains primary", () => {
  const page = source({ ogImage: "/media/2026/share.png", cover: { src: "/cover.webp", alt: "Actual screenshot", width: 900, height: 600 } });
  const share = projectShareImage(page);
  assert.match(share.url, /^https:\/\/nazarene\.dev\/og\/projects\/a-real-project\.[a-f0-9]{16}\.png$/);
  assert.equal(share.width,1200);assert.equal(share.height,630);assert.equal(share.type,"image/png");
  const { metadata, graph } = projectSeo(page);
  assert.deepEqual(metadata.openGraph.images, metadata.twitter.images);
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(nodeOf(graph, "Article").image, [`${SITE_INFO.url}/cover.webp`, share.url]);
  assert.equal(nodeOf(graph, "WebPage").primaryImageOfPage.url, `${SITE_INFO.url}/cover.webp`);
});

test("every cover choice has the same output dimensions, including invalid sources", () => {
  const cover = { src: "/media/2026/abcdefghij-2048x1280.webp", alt: "A prototype" };
  for (const ogImage of [null, "cover", "javascript:alert(1)", "/logo.svg?color=blue"]) {
    const share=projectShareImage(source({ ogImage, cover }));
    assert.equal(share.width,1200);assert.equal(share.height,630);
    assert.match(share.url,/^https:\/\/nazarene.dev\/og\/projects\//);
  }
});

test("unsafe URLs never become metadata images; SVG can represent content but not a social card", () => {
  for (const src of ["javascript:alert(1)", "data:image/png;base64,private", "//evil.test/a.png", "https://private:secret@example.test/a.png", "file:///private.png", "gen:avatar:private", "https://example.test/a\n.png"]) {
    const { metadata, graph } = projectSeo(source({ ogImage: src, cover: { src, alt: "Artwork" } }));
    assert.equal(metadata.openGraph.images.length, 1);
  assert.match(metadata.openGraph.images[0].url, /\/og\/projects\/.*\.png$/);
    assert.deepEqual(nodeOf(graph, "Article").image, [metadata.openGraph.images[0].url]);
  }
  const { metadata, graph } = projectSeo(source({ cover: { src: "/diagram.svg", alt: "Diagram" } }));
  assert.equal(metadata.twitter.images.length, 1);
  assert.deepEqual(nodeOf(graph, "Article").image, [`${SITE_INFO.url}/diagram.svg`, metadata.openGraph.images[0].url]);
});

test("breadcrumbs match the visible public ancestor order and stop on missing/cyclic parents", () => {
  const grandparent = source({ id: "root", slug: "root", title: "Root" });
  const parent = source({ id: "parent", slug: "parent", title: "Parent", parentId: "root" });
  const page = source({ parentId: "parent" });
  const { graph, ancestors } = projectSeo(page, [parent, page, grandparent]);
  assert.deepEqual(ancestors.map(item => item.id), ["root", "parent"]);
  const crumbs = nodeOf(graph, "BreadcrumbList").itemListElement;
  assert.deepEqual(crumbs.map(crumb => crumb.name), ["Projects", "Root", "Parent", page.title]);
  assert.deepEqual(crumbs.map(crumb => crumb.position), [1, 2, 3, 4]);
  assert.ok(crumbs.every(crumb => crumb.item.startsWith(`${SITE_INFO.url}/projects`)));
  assert.deepEqual(projectAncestors(page, []), []);
  assert.deepEqual(projectAncestors(source({ parentId: "project-test" }), [page]), []);
  assert.equal(projectAncestors(page, [{ ...parent, parentId: page.id }, page]).length, 1);
});

test("hostile source text round-trips in JSON-LD without closing its script element", () => {
  const attack = '</script><script>alert("injection")</script><!-- & \u2028\u2029';
  const { graph, metadata } = projectSeo(source({ title: attack, authors: [{ name: attack, email: "private@example.test" }], tags: [attack] }));
  const serialized = jsonLd(graph);
  assert.doesNotMatch(serialized.__html, /</);
  assert.deepEqual(JSON.parse(serialized.__html), graph);
  const script = renderToStaticMarkup(createElement("script", { type: "application/ld+json", dangerouslySetInnerHTML: serialized }));
  assert.equal((script.match(/<script\b/g) ?? []).length, 1);
  assert.equal((script.match(/<\/script>/g) ?? []).length, 1);
  const meta = renderToStaticMarkup(createElement("meta", { name: "description", content: metadata.title }));
  assert.doesNotMatch(meta, /<script|<\/script/);
  assert.doesNotMatch(script, /private@example\.test/);
});

test("project image hints use the actual column and keep srcset, alt, dimensions and priority", async () => {
  const src = "/media/2026/abcdefghij-2048x1280.webp";
  const tree = await markdownToTree(`![Prototype screenshot](${src})`);
  const image = imagesIn(tree)[0];
  const before = structuredClone(image.properties);
  sizeProjectImages(tree);
  assert.deepEqual(image.properties, { ...before, sizes: projectImageSizes(2048) });
  assert.equal(image.properties.srcSet, imageInfo(src).srcSet);
  assert.match(image.properties.sizes, /672px/);
  assert.match(image.properties.sizes, /600px.*100vw - 40px.*100vw - 96px/);
  assert.equal(prioritizeLeadImage(tree), true);
  assert.equal(image.properties.loading, "eager");
  assert.equal(image.properties.fetchPriority, "high");
});

test("project sizing preserves author-resized images and leaves Writing defaults untouched", async () => {
  const src = "/media/2026/abcdefghij-2048x1280.webp";
  const custom = await markdownToTree(`<img src="${src}" alt="Screenshot" width="320" height="200">`);
  const before = structuredClone(custom);
  sizeProjectImages(custom);
  assert.deepEqual(custom, before);
  const small = await markdownToTree("![Small](/media/2026/abcdefghij-320x200.webp)");
  sizeProjectImages(small);
  assert.match(imagesIn(small)[0].properties.sizes, /min\(320px/);
  const writing = await markdownToTree(`![Writing image](${src})`);
  assert.equal(imagesIn(writing)[0].properties.sizes, imageInfo(src).sizes);
});

test("page icons support Fluent emoji and media, with custom fonts and Inter defaults preserved", () => {
  assert.equal(pageIconSrc("/media/2026/abcdefghij-72x72.webp"), "/media/2026/abcdefghij-72x72.webp");
  assert.ok(pageIconSrc("🎨").startsWith("https://"));
  assert.equal(pageIconSrc("javascript:alert(1)"), "");
  const fonts = { heading: { family: "Newsreader", source: "google" }, body: { family: "IBM Plex Sans", source: "google" } };
  assert.match(fontVars(fonts)["--article-heading-font"], /Newsreader/);
  assert.match(fontVars(fonts)["--article-body-font"], /IBM Plex Sans/);
  assert.equal(fontVars(null)["--article-body-font"], undefined);
  assert.deepEqual(fontLinks({ body: { family: "Inter", source: "google" } }), []);
});
