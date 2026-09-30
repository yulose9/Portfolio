import type { StoreEnv } from "./store";

/** A primary image owns its responsive family. Variants must never deduplicate independently. */
export async function canonicalImageKey(
  env: StoreEnv,
  key: string,
  digest: string,
  type: string,
): Promise<string> {
  const file = key.split("/").pop()!;
  const shape = /-(\d+x\d+)\.[a-z0-9]+$/.exec(file)?.[1] ?? "single";
  if (!type.startsWith("image/") || /-(?:\d+|poster)\.[a-z0-9]+$/.test(file))
    return key;
  const index = `media-index/${digest}-${shape}.json`;
  const existing = await env.WRITING.get(index);
  if (existing) return (await existing.json<{ key: string }>()).key;
  // Bootstrap existing uploads lazily; old immutable URLs keep working.
  let cursor: string | undefined;
  let chosen = key;
  do {
    const page = await env.WRITING.list({
      prefix: "media/",
      cursor,
      include: ["customMetadata", "httpMetadata"],
    });
    const match = page.objects.find(
      (o) =>
        o.customMetadata?.sha256 === digest &&
        o.httpMetadata?.contentType === type &&
        (/-(\d+x\d+)\.[a-z0-9]+$/.exec(o.key)?.[1] ?? "single") === shape &&
        !/-(?:\d+|poster)\.[a-z0-9]+$/.test(o.key),
    );
    if (match) {
      chosen = match.key;
      break;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const claim = await env.WRITING.put(index, JSON.stringify({ key: chosen }), {
    onlyIf: { etagDoesNotMatch: "*" },
  });
  // Concurrent uploads converge on one key, even if the first uploader disconnects before writing it.
  return claim
    ? chosen
    : (await (await env.WRITING.get(index))!.json<{ key: string }>()).key;
}
