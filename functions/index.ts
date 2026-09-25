import { DISCOVERY_LINKS, negotiate } from "../cms/server/negotiate";

/** The home page: HTML for browsers, /llms.txt for agents that ask for Markdown, and discovery Link headers for both. */
export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = (ctx) => negotiate(ctx, "/llms.txt", DISCOVERY_LINKS);
