import { socialFile } from "../../../../cms/social";
import { publicSocialCards, findSocialCard } from "../../../lib/social-registry";
import { drawSocialCard } from "../../../lib/og-card";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  const cards = publicSocialCards().filter(card => card.kind === "writing");
  return cards.length ? cards.flatMap(card => [{ file: socialFile(card) }, { file: `${card.slug}.png` }]) : [{ file: "_.png" }];
}
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const card = findSocialCard("writing", (await params).file);
  if (!card) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(await drawSocialCard(card)), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff" } });
}
