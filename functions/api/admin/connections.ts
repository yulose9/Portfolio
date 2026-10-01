import { json, type AdminFunction } from "../../../cms/server/http";
import { researchIndex } from "../../../cms/server/research";
import { connectionHealth } from "../../../cms/connections";

/** Admin-only derived metadata. Does not modify pages or publish a graph. */
export const onRequestGet: AdminFunction = async ({ env }) =>
  json({ pages: connectionHealth(await researchIndex(env)) });
