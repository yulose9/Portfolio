import { json, readJson, type AdminFunction } from "../../../cms/server/http";
import { websiteDraft, saveWebsite, publishWebsite } from "../../../cms/server/website";
export const onRequestGet: AdminFunction = async ({ env }) => json(await websiteDraft(env));
export const onRequestPut: AdminFunction = async ({ env, request }) => json(await saveWebsite(env, await readJson(request)));
export const onRequestPost: AdminFunction = async ({ env, request }) => { const input = await readJson<{ base: string }>(request); return json(await publishWebsite(env, input.base)); };
