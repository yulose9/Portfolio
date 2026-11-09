import { socialFile } from "../../../../cms/social";
import { publicSocialCards, findSocialCard } from "../../../lib/social-registry";
import { drawSocialCard } from "../../../lib/og-card";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return publicSocialCards().filter(card => card.kind !== "writing").flatMap(card => [
    { kind: card.kind, file: socialFile(card) },
    // Stable aliases keep old feed/image-sitemap links usable.
    { kind: card.kind, file: `${card.slug}.png` },
  ]);
}
export async function GET(_: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params;
  const card = findSocialCard(kind, file);
  if (!card) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await drawSocialCard(card)), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff" } });
}
