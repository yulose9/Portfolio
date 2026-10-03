import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { facebookFrame, parseEmbed, parseThreadsEmbedPage, threadsFrame } from "../cms/embeds.ts";
import { markdownToTree } from "../cms/render.ts";
import SocialEmbed from "../app/components/writing/SocialEmbed.tsx";

const all = (tree) => (tree.children ?? []).flatMap((n) => [n, ...all(n)]);

test("Threads links on threads.net and threads.com, long and short", () => {
  assert.deepEqual(parseEmbed("https://www.threads.net/@zuck/post/C8FZ4rrSsxc"), {
    kind: "threads", user: "zuck", code: "C8FZ4rrSsxc", url: "https://www.threads.com/@zuck/post/C8FZ4rrSsxc",
  });
  assert.deepEqual(parseEmbed("https://threads.com/@paul.0key/post/DV_pLGWAugC?xmt=abc"), {
    kind: "threads", user: "paul.0key", code: "DV_pLGWAugC", url: "https://www.threads.com/@paul.0key/post/DV_pLGWAugC",
  });
  assert.deepEqual(parseEmbed("https://www.threads.com/t/DV_pLGWAugC"), {
    kind: "threads", code: "DV_pLGWAugC", url: "https://www.threads.com/t/DV_pLGWAugC",
  });
  assert.equal(parseEmbed("https://www.threads.net/@zuck"), null, "a profile isn't a post");
});

test("Facebook posts, videos, reels and photos", () => {
  const fb = (raw) => parseEmbed(raw);
  assert.deepEqual(fb("https://www.facebook.com/NASA/posts/pfbid02abcDEF123"), {
    kind: "facebook", format: "post", page: "NASA", url: "https://www.facebook.com/NASA/posts/pfbid02abcDEF123",
  });
  assert.deepEqual(fb("https://m.facebook.com/permalink.php?story_fbid=pfbid0XYZ&id=100064"), {
    kind: "facebook", format: "post", url: "https://www.facebook.com/permalink.php?story_fbid=pfbid0XYZ&id=100064",
  });
  assert.deepEqual(fb("https://www.facebook.com/share/p/1AbCdEfGh/"), {
    kind: "facebook", format: "post", url: "https://www.facebook.com/share/p/1AbCdEfGh/",
  });
  assert.equal(fb("https://www.facebook.com/share/v/1AbCdEfGh/").format, "video");
  assert.equal(fb("https://www.facebook.com/share/r/1AbCdEfGh/").format, "reel");
  assert.deepEqual(fb("https://fb.watch/abC-123/"), { kind: "facebook", format: "video", url: "https://fb.watch/abC-123/" });
  assert.deepEqual(fb("https://www.facebook.com/NASA/videos/1234567890/"), {
    kind: "facebook", format: "video", page: "NASA", url: "https://www.facebook.com/NASA/videos/1234567890",
  });
  assert.equal(fb("https://www.facebook.com/NASA/videos/a-launch/1234567890").url, "https://www.facebook.com/NASA/videos/1234567890");
  assert.deepEqual(fb("https://www.facebook.com/reel/987654321"), {
    kind: "facebook", format: "reel", url: "https://www.facebook.com/reel/987654321",
  });
  assert.deepEqual(fb("https://www.facebook.com/photo?fbid=1122334455&set=a.1"), {
    kind: "facebook", format: "post", url: "https://www.facebook.com/photo/?fbid=1122334455",
  });
  assert.equal(fb("https://www.facebook.com/watch/?v=556677").url, "https://www.facebook.com/watch/?v=556677");
  for (const no of [
    "https://www.facebook.com/NASA",
    "https://www.facebook.com/permalink.php?story_fbid=1",
    "https://www.facebook.com/groups/123/posts/456",
    "https://www.facebook.com/share/",
    "https://notfacebook.com/NASA/posts/1",
  ]) assert.equal(fb(no), null, no);
});

test("X and YouTube still parse", () => {
  assert.equal(parseEmbed("https://twitter.com/jack/status/20").kind, "x");
  assert.equal(parseEmbed("https://youtu.be/dQw4w9WgXcQ").kind, "youtube");
});

test("frames: Threads follows the theme, Facebook picks its plugin and size", () => {
  const threads = parseEmbed("https://www.threads.net/@zuck/post/C8FZ4rrSsxc");
  assert.equal(threadsFrame(threads), "https://www.threads.com/@zuck/post/C8FZ4rrSsxc/embed");
  assert.equal(threadsFrame(threads, "dark"), "https://www.threads.com/@zuck/post/C8FZ4rrSsxc/embed?theme=dark");
  assert.equal(threadsFrame(parseEmbed("https://www.threads.com/t/DV_pLGWAugC"), "auto"), "https://www.threads.com/t/DV_pLGWAugC/embed?theme=auto");

  const post = new URL(facebookFrame(parseEmbed("https://www.facebook.com/NASA/posts/123"), 500));
  assert.equal(post.origin + post.pathname, "https://www.facebook.com/plugins/post.php");
  assert.equal(post.searchParams.get("href"), "https://www.facebook.com/NASA/posts/123");
  assert.equal(post.searchParams.get("show_text"), "true");
  assert.equal(post.searchParams.get("width"), "500");

  const video = new URL(facebookFrame(parseEmbed("https://fb.watch/abc/"), 480));
  assert.equal(video.pathname, "/plugins/video.php");
  assert.equal(video.searchParams.get("show_text"), "false");
  const reel = new URL(facebookFrame(parseEmbed("https://www.facebook.com/reel/1"), 360));
  assert.equal(reel.searchParams.get("height"), "640");
});

test("Threads' embed page gives the handle and the text", () => {
  const html = `<div class="AuthorIdentity"><a href="https://www.threads.com/&#064;paul.0key" class="HeaderLink"><span>paul.0key</span></a></div>
    <span class="BodyTextContainer"><span>Can City run it back?! &amp; more &#x1F600;</span></span>`;
  assert.deepEqual(parseThreadsEmbedPage(html), { handle: "paul.0key", text: "Can City run it back?! & more \u{1F600}" });
  assert.equal(parseThreadsEmbedPage("<html>Threads</html>"), null);
});

test("a Facebook or Threads link alone on its line renders as an embed", async () => {
  for (const url of ["https://www.facebook.com/NASA/posts/123", "https://www.threads.com/t/DV_pLGWAugC"]) {
    const tree = await markdownToTree(`Before.\n\n${url}\n\nAfter.`);
    const embed = all(tree).find((n) => n.tagName === "x-embed");
    assert.ok(embed, url);
    assert.equal(JSON.parse(embed.properties.dataEmbed).url, url);
  }
});

test("the card: platform, author from the link, a link out, no iframe before the browser", () => {
  const fb = renderToStaticMarkup(createElement(SocialEmbed, { embed: parseEmbed("https://www.facebook.com/NASA/posts/123") }));
  assert.match(fb, /class="social-embed" data-platform="facebook" data-format="post" data-status="loading"/);
  assert.match(fb, /<strong>NASA<\/strong><span>Post on Facebook<\/span>/);
  assert.match(fb, /href="https:\/\/www.facebook.com\/NASA\/posts\/123"[^>]*>View on Facebook<\/a>/);
  assert.match(fb, /Show more/);
  assert.match(fb, /<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(fb, /<iframe/);

  const th = renderToStaticMarkup(createElement(SocialEmbed, {
    embed: parseEmbed("https://www.threads.net/@zuck/post/C8FZ4rrSsxc"),
  }));
  assert.match(th, /data-platform="threads"/);
  assert.match(th, /<strong>@zuck<\/strong><span>Threads<\/span>/);
  assert.match(th, />View on Threads<\/a>/);
  assert.doesNotMatch(th, /Show more/);

  const short = renderToStaticMarkup(createElement(SocialEmbed, {
    embed: parseEmbed("https://www.threads.com/t/DV_pLGWAugC"), meta: { handle: "paul.0key" },
  }));
  assert.match(short, /<strong>@paul.0key<\/strong>/, "the handle the API found fills in a short link");
});
