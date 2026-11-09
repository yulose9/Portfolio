import { ConversionError, convertDocument } from "../../../cms/server/convert";
import { HttpError, isAdminWrite, json, readJson, type AdminFunction } from "../../../cms/server/http";

/** Root route: projectEnvironment must be applied only inside the conversion. */
export const onRequestPost: AdminFunction = async ({ env, request, data }) => {
  // Access identity comes from _middleware; reject direct/internal calls without it.
  if (!data?.email) return json({ error: "Sign in before converting a document." }, 401);
  if (!isAdminWrite(request)) return json({ error: "Conversion requires a same-origin admin request." }, 403);
  try {
    const result = await convertDocument(env, await readJson<unknown>(request, 2048));
    return json(result, result.replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof ConversionError) return json({ error: error.message, code: error.code }, error.status);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    return json({ error: "Conversion could not be confirmed. Retry the same saved version.", code: "copy_incomplete" }, 503);
  }
};
