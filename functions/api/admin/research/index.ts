import { json, type AdminFunction } from "../../../../cms/server/http";
import type { ResearchItem } from "../../../../cms/research";
export const onRequestGet: AdminFunction = async ({ env }) => {
  const items: ResearchItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.WRITING.list({ prefix: "research/", cursor });
    for (let i = 0; i < page.objects.length; i += 12) {
      const batch = await Promise.all(
        page.objects.slice(i, i + 12).map(async (o) => {
          const obj = await env.WRITING.get(o.key);
          // A conversion stages annotations before exposing its destination page.
          // Hide partial copies, including after an interrupted request.
          const destination = obj?.customMetadata?.conversionPage;
          if (destination) {
            if (!/^[a-z0-9]{12}$/.test(destination)) return;
            const owner = await env.WRITING.get(`drafts/${destination}/current.json`);
            const draft = owner ? await owner.json<{ creationRequestId?: string }>() : null;
            if (!draft || draft.creationRequestId !== obj?.customMetadata?.conversion) return;
          }
          return obj?.json<ResearchItem>();
        }),
      );
      for (const item of batch) if (item) items.push(item);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return json({
    items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  });
};
