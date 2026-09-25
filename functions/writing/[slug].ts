import { negotiate } from "../../cms/server/negotiate";

/** A post: the page, or the Markdown it was written in for agents that ask for it. */
export const onRequest: PagesFunction<{ ASSETS: Fetcher }, "slug"> = (ctx) => negotiate(ctx, `/writing/${encodeURIComponent(String(ctx.params.slug))}/index.md`);
