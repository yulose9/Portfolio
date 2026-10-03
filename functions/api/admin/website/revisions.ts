import {
  json,
  readJson,
  type AdminFunction,
} from "../../../../cms/server/http";
import {
  websiteRevisions,
  restoreWebsite,
} from "../../../../cms/server/website";

export const onRequestGet: AdminFunction = async ({ env, request }) =>
  json(
    await websiteRevisions(
      env,
      new URL(request.url).searchParams.get("cursor") ?? undefined,
    ),
  );

export const onRequestPost: AdminFunction = async ({ env, request }) =>
  json(await restoreWebsite(env, await readJson(request)));
