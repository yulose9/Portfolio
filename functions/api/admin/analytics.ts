import { json, type AdminFunction } from "../../../cms/server/http";
import { analyticsReport } from "../../../cms/server/analytics";
export const onRequestGet: AdminFunction = async ({ env, request }) => json(await analyticsReport(env, new URL(request.url).searchParams));
