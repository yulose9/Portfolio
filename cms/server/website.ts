import {
  publishedWebsite,
  validateWebsite,
  type WebsiteDraft,
} from "../website";
import { HttpError, type AdminEnv } from "./http";
import { commit, readFile } from "./github";
const key = "website/draft.json";
export async function websiteDraft(env: AdminEnv): Promise<WebsiteDraft> {
  const object = await env.WRITING.get(key);
  if (object) return object.json<WebsiteDraft>();
  const source = await readFile(env, "content/website.json");
  return {
    content: source ? validateWebsite(JSON.parse(source)) : publishedWebsite,
    version: null,
    source,
  };
}
export async function saveWebsite(
  env: AdminEnv,
  input: { content: unknown; base: string | null },
): Promise<WebsiteDraft> {
  const old = await env.WRITING.get(key);
  const draft = old ? await old.json<WebsiteDraft>() : await websiteDraft(env);
  if (input.base !== draft.version)
    throw new HttpError(
      "Website content changed in another session. Reload before saving.",
      409,
    );
  let content;
  try {
    content = validateWebsite(input.content);
  } catch (e) {
    throw new HttpError((e as Error).message);
  }
  const next = { ...draft, content, version: crypto.randomUUID() };
  const saved = await env.WRITING.put(key, JSON.stringify(next), {
    onlyIf: new Headers(
      old ? { "If-Match": old.etag } : { "If-None-Match": "*" },
    ),
  });
  if (!saved)
    throw new HttpError(
      "Website content changed while saving. Reload before saving.",
      409,
    );
  // Immutable checkpoints are also the recovery source for explicit restores.
  // R2 lists lexically: an inverted timestamp puts recent snapshots first.
  const revisionKey = `${String(9999999999999 - Date.now()).padStart(13, "0")}-${next.version}`;
  await env.WRITING.put(
    `website/revisions/${revisionKey}.json`,
    JSON.stringify(next),
  );
  return next;
}
export async function publishWebsite(env: AdminEnv, base: string) {
  const draft = await websiteDraft(env);
  if (!base || base !== draft.version)
    throw new HttpError(
      "Save and review the current website before publishing.",
      409,
    );
  const content = { ...draft.content, revision: crypto.randomUUID() };
  const source = JSON.stringify(content, null, 2) + "\n";
  const hash = await commit(
    env,
    "website: publish portfolio content",
    [{ path: "content/website.json", content: source }],
    [{ path: "content/website.json", content: draft.source }],
  );
  const receipt = {
    commit: hash,
    revision: content.revision,
    at: new Date().toISOString(),
  };
  await env.WRITING.put(
    `website/receipts/${hash}.json`,
    JSON.stringify(receipt),
  );
  // Preserve newer edits made while GitHub was publishing; only advance the public base.
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await env.WRITING.get(key);
    if (!current) break;
    const value = await current.json<WebsiteDraft>();
    const next = {
      ...value,
      source,
      receipt,
      content: value.version === base ? content : value.content,
    };
    if (
      await env.WRITING.put(key, JSON.stringify(next), {
        onlyIf: new Headers({ "If-Match": current.etag }),
      })
    )
      return next;
  }
  throw new HttpError(
    "Publication was submitted, but its receipt could not be attached to the draft. Reload and review before publishing again.",
    409,
  );
}

export async function websiteRevisions(env: AdminEnv, cursor?: string) {
  const page = await env.WRITING.list({
    prefix: "website/revisions/",
    limit: 50,
    ...(cursor ? { cursor } : {}),
  });
  return {
    items: page.objects.map((object) => ({
      version: object.key.slice("website/revisions/".length, -5),
      at: object.uploaded.toISOString(),
    })),
    cursor: page.truncated ? page.cursor : null,
  };
}

export async function restoreWebsite(
  env: AdminEnv,
  input: { version: string; base: string | null },
) {
  if (
    typeof input.version !== "string" ||
    !/^(?:\d{13}-)?[a-f0-9-]{36}$/.test(input.version)
  )
    throw new HttpError("Invalid website revision.");
  const object = await env.WRITING.get(
    `website/revisions/${input.version}.json`,
  );
  if (!object) throw new HttpError("Website revision was not found.", 404);
  const previous = await object.json<WebsiteDraft>();
  // Restoring creates a new private version and never rewinds the publication base.
  return saveWebsite(env, { content: previous.content, base: input.base });
}
