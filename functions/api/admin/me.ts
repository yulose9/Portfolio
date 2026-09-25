import { json, type AdminFunction } from "../../../cms/server/http";

/** Who's signed in, and whether the server side is wired up. */
export const onRequestGet: AdminFunction = async ({ data, env }) =>
  json({ email: data.email, github: Boolean(env.GITHUB_TOKEN), storage: Boolean(env.WRITING) });
