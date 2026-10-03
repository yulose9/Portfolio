import { projectEnvironment } from "../../../../cms/server/project-environment";
import { HttpError, type AdminFunction } from "../../../../cms/server/http";
import * as route0 from "../posts/index";
import * as route1 from "../posts/[id]/index";
import * as route2 from "../posts/[id]/publish";
import * as route3 from "../posts/[id]/unpublish";
import * as route4 from "../posts/[id]/parent";
import * as route5 from "../posts/[id]/duplicate";
import * as route6 from "../posts/[id]/references";
import * as route7 from "../posts/[id]/restore";
import * as route8 from "../posts/[id]/published-source";
import * as route9 from "../posts/[id]/revisions/index";
import * as route10 from "../posts/[id]/revisions/[at]";
import * as route11 from "../bulk";
import * as route12 from "../search";
import * as route13 from "../research/index";
import * as route14 from "../research/[id]";
import * as route15 from "../connections";
import * as route16 from "../folders";
import * as route17 from "../page-order";
import * as route18 from "../pulse";
const routes: { path: string; handlers: Record<string, unknown> }[] = [
  {path: "posts", handlers: route0},
  {path: "posts/:id", handlers: route1},
  {path: "posts/:id/publish", handlers: route2},
  {path: "posts/:id/unpublish", handlers: route3},
  {path: "posts/:id/parent", handlers: route4},
  {path: "posts/:id/duplicate", handlers: route5},
  {path: "posts/:id/references", handlers: route6},
  {path: "posts/:id/restore", handlers: route7},
  {path: "posts/:id/published-source", handlers: route8},
  {path: "posts/:id/revisions", handlers: route9},
  {path: "posts/:id/revisions/:at", handlers: route10},
  {path: "bulk", handlers: route11},
  {path: "search", handlers: route12},
  {path: "research", handlers: route13},
  {path: "research/:id", handlers: route14},
  {path: "connections", handlers: route15},
  {path: "folders", handlers: route16},
  {path: "page-order", handlers: route17},
  {path: "pulse", handlers: route18},
];
export const onRequest: AdminFunction<"path"> = async ctx => {
  const raw = ctx.params.path;
  const parts = (Array.isArray(raw) ? raw.join("/") : raw ?? "").split("/");
  for (const route of routes) {
    const expected = route.path.split("/");
    if (parts.length !== expected.length || expected.some((part, i) => !part.startsWith(":") && part !== parts[i])) continue;
    const handler = route.handlers[`onRequest${ctx.request.method[0]}${ctx.request.method.slice(1).toLowerCase()}`] as AdminFunction<string> | undefined;
    if (!handler) return new Response(null, { status: 405 });
    const params: Record<string, string> = {};
    expected.forEach((part, i) => { if (part.startsWith(":")) params[part.slice(1)] = parts[i]; });
    const env = projectEnvironment(ctx.env);
    const mutation = !["GET", "HEAD"].includes(ctx.request.method);
    const lockKey = "meta/publication-lock";
    let lock: R2Object | null = null;
    if (mutation) {
      const old = await env.WRITING.get(lockKey);
      if (old && Date.now() - Number(await old.text()) < 300000) throw new HttpError("Another project change is being saved. Try again shortly.", 409);
      lock = await env.WRITING.put(lockKey, String(Date.now()), { onlyIf: new Headers(old ? { "If-Match": old.etag } : { "If-None-Match": "*" }) });
      if (!lock) throw new HttpError("Another project change is in progress.", 409);
    }
    try { return await handler({ ...ctx, env, params } as Parameters<AdminFunction<string>>[0]); }
    finally { if (lock) await env.WRITING.put(lockKey, "0", { onlyIf: new Headers({ "If-Match": lock.etag }) }); }
  }
  return new Response(null, { status: 404 });
};