/* eslint-disable @next/next/no-img-element -- ImageResponse renders images, not browser components. */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og.js";
import { emojiPattern } from "../../cms/emoji";
import { pageIconSrc } from "../../cms/page-icon";
import { publicArtworkPath, SOCIAL_ORIGIN, SOCIAL_SIZE, socialVersion, type SocialCard } from "../../cms/social";
import { clip, plainText } from "./seo";

const MAX_BYTES = 8 * 1024 * 1024;
const artworkCache = new Map<string, Promise<Buffer | null>>();
const cardCache = new Map<string, Promise<Buffer>>();
let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[]> | undefined;
const dataUrl = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;
const text = (value: string, max: number) => clip(plainText(value).replace(emojiPattern(), " "), max);

async function boundedImage(url: string): Promise<Buffer | null> {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!response.ok || !/^image\/(png|jpeg|webp|gif|avif)(?:;|$)/i.test(response.headers.get("content-type") || "") || Number(response.headers.get("content-length")) > MAX_BYTES) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = []; let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function loadArtwork(source: string | null | undefined, fluent = false): Promise<Buffer | null> {
  if (!source) return null;
  // The only external request allowed is our pinned Fluent asset package.
  const isFluent = fluent && /^https:\/\/cdn\.jsdelivr\.net\/npm\/@lobehub\/fluent-emoji-3d@1\.1\.0\/assets\/[a-f0-9-]+\.webp$/.test(source);
  const publicPath = publicArtworkPath(source);
  if (!isFluent && !publicPath) return null;
  if (!artworkCache.has(source)) artworkCache.set(source, (async () => {
    try {
      if (publicPath) {
        const root = path.resolve(process.cwd(), "public");
        const file = path.resolve(root, `.${publicPath}`);
        if (!file.startsWith(`${root}${path.sep}`)) return null;
        try {
          const actual = await fs.realpath(file);
          if (!actual.startsWith(`${root}${path.sep}`)) return null;
          const stat = await fs.stat(actual);
          return stat.size <= MAX_BYTES ? await fs.readFile(actual) : null;
        } catch {
          // Uploaded media lives in R2. Fetch only this public same-origin namespace.
          if (!/^\/media\/\d{4}\/[a-z0-9.-]+$/i.test(publicPath)) return null;
          return await boundedImage(`${SOCIAL_ORIGIN}${publicPath}`);
        }
      }
      return await boundedImage(source);
    } catch { return null; }
  })());
  return artworkCache.get(source)!;
}

async function fonts() {
  fontCache ??= Promise.all(([400, 600] as const).map(async weight => {
    const bytes = await fs.readFile(path.join(process.cwd(), "assets/og", `Inter-${weight}.ttf`));
    return { name: "Inter", data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, weight, style: "normal" as const };
  }));
  return fontCache;
}

async function raster(bytes: Buffer, width: number, height: number) {
  return sharp(bytes, { limitInputPixels: 40_000_000, animated: false }).rotate()
    .resize(width, height, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).png({ compressionLevel: 9 }).toBuffer();
}

/** One PNG contract for every public route. Rendered on publication, never per visitor. */
export function drawSocialCard(card: SocialCard): Promise<Buffer> {
  const key = socialVersion(card);
  if (!cardCache.has(key)) cardCache.set(key, render(card));
  return cardCache.get(key)!;
}

async function render(card: SocialCard): Promise<Buffer> {
  const [art, iconBytes, fontData] = await Promise.all([
    loadArtwork(card.image), loadArtwork(card.icon ? pageIconSrc(card.icon) : null, true), fonts(),
  ]);
  if (art && card.visual === "artwork") {
    try { return await raster(art, SOCIAL_SIZE.width, SOCIAL_SIZE.height); }
    catch { /* Invalid artwork falls back to a useful title card. */ }
  }
  let image: string | null = null, icon: string | null = null;
  try { if (art && card.visual === "editorial") image = dataUrl(await raster(art, 416, 432)); } catch { /* Text remains usable. */ }
  try { if (iconBytes) icon = dataUrl(await sharp(iconBytes, { limitInputPixels: 40_000_000 }).resize(88, 88, { fit: "inside" }).png().toBuffer()); } catch { /* Optional icon. */ }
  const title = text(card.title, image ? 110 : 155);
  const description = text(card.description, image ? 120 : 180);
  const titleSize = image ? (title.length > 65 ? 46 : 56) : (title.length > 100 ? 54 : title.length > 60 ? 64 : 78);
  const response = new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "56px 64px 42px", background: "#ffffff", color: "#171717", fontFamily: "Inter", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 44 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: image ? 612 : 1072 }}>
          {icon && <img src={icon} alt="" width={64} height={64} style={{ objectFit: "contain" }} />}
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em", overflow: "hidden", maxHeight: image ? 220 : 252 }}>{title}</div>
          {description && <div style={{ fontSize: 26, lineHeight: 1.4, color: "#525252", maxHeight: 110, overflow: "hidden" }}>{description}</div>}
        </div>
        {image && <div style={{ display: "flex", width: 416, height: 432, flexShrink: 0 }}><img src={image} alt="" width={416} height={432} /></div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, color: "#525252", marginTop: 28 }}>
        <span>nazarene.dev{card.kind === "projects" ? "/projects" : card.kind === "writing" || card.kind === "tags" ? "/writing" : ""}</span>
        <span>{text((card.authors || []).join(", "), 65)}</span>
      </div>
    </div>,
    { ...SOCIAL_SIZE, fonts: fontData },
  );
  return sharp(Buffer.from(await response.arrayBuffer())).png({ compressionLevel: 9, palette: true, colours: 256 }).toBuffer();
}
