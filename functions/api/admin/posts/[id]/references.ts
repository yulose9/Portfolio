import {
  json,
  param,
  type AdminFunction,
} from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { researchIndex } from "../../../../../cms/server/research";
export const onRequestGet: AdminFunction<"id"> = async ({ env, params }) => {
  const id = param(params.id);
  await loadDraft(env, id);
  const index = await researchIndex(env);
  const current = index.find((d) => d.id === id);
  return json({
    incoming: index
      .filter((d) => d.id !== id)
      .flatMap((d) =>
        d.references
          .filter((r) => r.target === id)
          .map((r) => ({
            id: d.id,
            title: d.title,
            icon: d.icon,
            blockId: r.blockId,
            snippet: r.snippet,
          })),
      ),
    outgoing: (current?.references ?? []).map((r) => ({
      id: r.target,
      title: index.find((d) => d.id === r.target)?.title ?? "Unavailable page",
      snippet: r.snippet,
      missing: !index.some((d) => d.id === r.target),
    })),
  });
};
