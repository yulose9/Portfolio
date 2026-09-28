import { json, type AdminFunction } from "../../../cms/server/http";
import { listDrafts } from "../../../cms/server/store";
import { livePosts } from "../../../cms/server/publish";
export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const [page, drafts, live] = await Promise.all([
    env.WRITING.list({
      prefix: "media/",
      limit: 60,
      cursor,
      include: ["httpMetadata"],
    }),
    listDrafts(env),
    livePosts(env),
  ]);
  const sources = [...drafts, ...live];
  const assets = page.objects.map((o) => {
    const src = `/${o.key}`;
    const usedIn = [
      ...new Map(
        sources
          .filter(
            (d) =>
              d.body.includes(src) ||
              d.cover?.src === src ||
              d.ogImage === src ||
              d.authors.some((a) => a.avatar === src),
          )
          .map((d) => [d.id, { id: d.id, title: d.title }]),
      ).values(),
    ];
    return {
      src,
      size: o.size,
      type: o.httpMetadata?.contentType ?? "application/octet-stream",
      uploadedAt: o.uploaded.toISOString(),
      usedIn,
    };
  });
  return json({ assets, cursor: page.truncated ? page.cursor : null });
};
