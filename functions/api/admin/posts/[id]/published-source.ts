import { postPath, parsePost, postToDraft } from "../../../../../cms/format";
import { publishedFingerprint } from "../../../../../cms/published-fingerprint";
import {
  HttpError,
  json,
  param,
  readJson,
  type AdminFunction,
} from "../../../../../cms/server/http";
import { loadDraft } from "../../../../../cms/server/load";
import { readFile } from "../../../../../cms/server/github";
import { putDraftIfVersion, snapshot } from "../../../../../cms/server/store";
export const onRequestGet: AdminFunction<"id"> = async ({ env, params }) => {
  const d = await loadDraft(env, param(params.id));
  const source = d.liveSlug ? await readFile(env, postPath(d.liveSlug)) : null;
  return json({
    source,
    post: source ? parsePost(source) : null,
    fingerprint: await publishedFingerprint(source),
    base: d.updatedAt,
  });
};
/** Both choices are explicit; neither choice publishes anything. */
export const onRequestPost: AdminFunction<"id"> = async ({
  env,
  params,
  request,
}) => {
  const d = await loadDraft(env, param(params.id));
  const input = await readJson<{
    base: string;
    fingerprint: string | null;
    choice: "keep" | "import";
  }>(request);
  if (input.base !== d.updatedAt)
    throw new HttpError("The draft changed. Compare the versions again.", 409);
  if (!d.liveSlug) throw new HttpError("This page has no published source.");
  const source = await readFile(env, postPath(d.liveSlug));
  const fingerprint = await publishedFingerprint(source);
  if (fingerprint !== input.fingerprint)
    throw new HttpError(
      "The GitHub file changed again. Compare the versions again.",
      409,
    );
  if (!["keep", "import"].includes(input.choice))
    throw new HttpError("Choose which version to keep.");
  await snapshot(env, d, true, "Before published-source reconciliation");
  const imported = source ? postToDraft(parsePost(source)) : null;
  if (input.choice === "import" && (!imported || imported.id !== d.id))
    throw new HttpError(
      "The published file is missing or belongs to another page.",
    );
  const next = {
    ...d,
    ...(input.choice === "import" ? imported : {}),
    id: d.id,
    createdAt: d.createdAt,
    editorDocument: input.choice === "import" ? null : d.editorDocument,
    publishedFingerprint: fingerprint,
    updatedAt: new Date().toISOString(),
    dirty: input.choice === "keep",
  };
  await putDraftIfVersion(env, next, d.updatedAt);
  return json({ post: next });
};
