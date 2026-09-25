import { negotiate } from "../../cms/server/negotiate";

/** /writing: the hub, or its Markdown list for agents that ask for it. */
export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = (ctx) => negotiate(ctx, "/writing/index.md");
