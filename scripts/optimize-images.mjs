#!/usr/bin/env node
/*
 * Build-time image optimization for the raster images in public/.
 *
 * Uploaded media (/media/...) is already converted in the browser before it
 * reaches R2 (app/admin/ui/media.ts). This script covers the other images:
 * the ones checked into public/ and referenced by the site content, such as
 * company logos and certification badges.
 *
 * For each referenced PNG, JPEG or WebP it writes AVIF and WebP copies at
 * responsive widths to public/optimized/, then records them in
 * app/image-manifest.json. app/lib/images.ts reads that manifest and turns a
 * plain src into a <picture> with srcsets. The original files stay as they are.
 *
 *   public/optimized/<hash>-<width>.avif
 *   public/optimized/<hash>-<width>.webp
 *
 * <hash> covers the file bytes and PIPELINE, so a changed image or changed
 * encoder settings gets new names. The names are safe to cache as immutable
 * (public/_headers already does this for /optimized/*). Work is incremental:
 * existing outputs are not encoded again.
 *
 * It runs from next.config.js on `next build` and `next dev`, and can also be
 * run by hand: `node scripts/optimize-images.mjs`. If sharp can't load, it
 * writes an empty manifest and exits 0. The site then serves the originals.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT_DIR = path.join(PUBLIC, "optimized");
const MANIFEST = path.join(ROOT, "app", "image-manifest.json");

/** Change this when widths or encoder settings change, so names change too. */
const PIPELINE = "v2:avif-q52-e4:webp-q78-e5";
/** Candidate widths. Each image keeps the ones narrower than itself, plus its own width capped at the largest. */
const WIDTHS = [64, 128, 256, 480, 960, 1600];

/** Where the site's image paths are written. */
const SOURCES = ["content/website.json", "app/site-content.ts", "content/writing", "content/projects"];
const REF = /["'(](\/(?:images|tools)\/[^"'()\s]+?\.(?:png|jpe?g|webp))["')]/gi;

function sourceFiles() {
  const files = [];
  for (const rel of SOURCES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      for (const f of fs.readdirSync(abs)) if (/\.(md|json|ts)$/.test(f)) files.push(path.join(abs, f));
    } else files.push(abs);
  }
  return files;
}

function referencedImages() {
  const found = new Set();
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(REF)) {
      const src = decodeURI(m[1]);
      if (fs.existsSync(path.join(PUBLIC, src))) found.add(src);
    }
  }
  return [...found].sort();
}

function writeManifest(entries) {
  const next = `${JSON.stringify(entries, null, 2)}\n`;
  const prev = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, "utf8") : "";
  // Rewriting an identical file would still restart `next dev` watchers.
  if (prev !== next) fs.writeFileSync(MANIFEST, next);
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("[images] sharp is unavailable; serving original images.");
    writeManifest({});
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  const keep = new Set();
  let encoded = 0;
  let before = 0;
  let after = 0;

  for (const src of referencedImages()) {
    const input = fs.readFileSync(path.join(PUBLIC, src));
    const hash = createHash("sha256").update(PIPELINE).update(input).digest("hex").slice(0, 16);
    const meta = await sharp(input).metadata();
    // Use the displayed size, after EXIF rotation.
    const rotated = (meta.orientation ?? 1) >= 5;
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    if (!width || !height) continue;

    const top = Math.min(width, WIDTHS[WIDTHS.length - 1]);
    const widths = [...WIDTHS.filter((w) => w < top), top];
    let smallestWebp = Infinity;

    for (const w of widths) {
      for (const format of ["avif", "webp"]) {
        const name = `${hash}-${w}.${format}`;
        const file = path.join(OUT_DIR, name);
        keep.add(name);
        if (!fs.existsSync(file)) {
          // rotate() applies EXIF orientation. sharp drops metadata unless told
          // to keep it, so EXIF, GPS and ICC profiles are not copied.
          const pipeline = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
          const buffer =
            format === "avif"
              ? await pipeline.avif({ quality: 52, effort: 4 }).toBuffer()
              : await pipeline.webp({ quality: 78, effort: 5 }).toBuffer();
          fs.writeFileSync(file, buffer);
          encoded++;
        }
        if (format === "webp" && w === top) smallestWebp = Math.min(smallestWebp, fs.statSync(file).size);
      }
    }
    before += input.length;
    after += smallestWebp;
    manifest[src] = { width, height, hash, widths };
  }

  // Delete files from earlier runs or older pipelines. The folder is generated.
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (!keep.has(name)) fs.rmSync(path.join(OUT_DIR, name), { force: true });
  }

  writeManifest(manifest);
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(
    `[images] ${Object.keys(manifest).length} images, ${encoded} files encoded; ` +
      `largest WebP ${kb(after)} vs originals ${kb(before)}.`
  );
}

main().catch((error) => {
  // A failed optimization should not fail the deploy. Originals still work.
  console.warn("[images] optimization failed; serving original images.", error);
  try {
    writeManifest({});
  } catch {}
});
