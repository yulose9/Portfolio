import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = path.resolve("public");
const output = path.join(root, "optimized");
const widths = [96, 256, 480, 768, 1080, 1600];
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0;
let largestBytes = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (file !== output) await visit(file);
      continue;
    }
    if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
    const input = await readFile(file);
    const metadata = await sharp(input).metadata();
    if ((metadata.pages ?? 1) > 1) continue;
    const hash = createHash("sha256").update(input).update("webp-82-v1").digest("hex").slice(0, 16);
    const sourceWidth = metadata.autoOrient?.width ?? metadata.width;
    const candidates = [...new Set(widths.map(width => Math.min(width, sourceWidth)))];
    const variants = [];
    for (const width of candidates) {
      const name = `${hash}-${width}.webp`;
      const destination = path.join(output, name);
      try { await stat(destination); } catch {
        await sharp(input).autoOrient().resize({ width, withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 }).toFile(destination);
      }
      variants.push({ width, src: `/optimized/${name}` });
    }
    manifest[`/${path.relative(root, file).split(path.sep).join("/")}`] = variants;
    originalBytes += input.length;
    largestBytes += (await stat(path.join(root, variants.at(-1).src))).size;
  }
}

await visit(root);
await writeFile("app/image-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`${Object.keys(manifest).length} images: ${(originalBytes / 1e6).toFixed(2)} MB originals, ${(largestBytes / 1e6).toFixed(2)} MB largest WebP variants.`);
