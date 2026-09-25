import { json, param, type AdminFunction } from "../../../../../../cms/server/http";
import { listRevisions } from "../../../../../../cms/server/store";

export const onRequestGet: AdminFunction<"id"> = async ({ env, params }) =>
  json({
    revisions: (await listRevisions(env, param(params.id))).map(({ at, label, words }) => ({ at, label, words })),
  });
