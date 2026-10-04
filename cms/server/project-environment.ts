import type { AdminEnv } from "./http";
/** Reuse draft/revision/hierarchy services without sharing the writing namespace. */
export function projectEnvironment(env: AdminEnv): AdminEnv {
  const prefix = "workspaces/projects/";
  const bucket = env.WRITING;
  const writing = new Proxy(bucket, {
    get(target, property) {
      if (property === "get" || property === "head")
        return (key: string, options?: unknown) =>
          (target[property] as Function).call(target, key.startsWith(prefix) ? key : prefix + key, options);
      if (property === "put")
        return (key: string, value: unknown, options?: unknown) =>
          target.put(key.startsWith(prefix) ? key : prefix + key, value as string, options as R2PutOptions);
      if (property === "delete")
        return (keys: string | string[]) =>
          target.delete(
            Array.isArray(keys)
              ? keys.map((key) => (key.startsWith(prefix) ? key : prefix + key))
              : (keys.startsWith(prefix) ? keys : prefix + keys),
          );
      if (property === "list")
        return async (options: R2ListOptions = {}) => {
          const rawPrefix = options.prefix ?? "";
          const resolvedPrefix = rawPrefix.startsWith(prefix) ? rawPrefix : prefix + rawPrefix;
          const result = await target.list({
            ...options,
            prefix: resolvedPrefix,
            startAfter: options.startAfter
              ? (options.startAfter.startsWith(prefix) ? options.startAfter : prefix + options.startAfter)
              : undefined,
          });
          return {
            ...result,
            objects: (result.objects ?? []).map((object) => ({
              ...object,
              key: object.key.startsWith(prefix) ? object.key.slice(prefix.length) : object.key,
            })),
            delimitedPrefixes: (result.delimitedPrefixes ?? []).map((key) =>
              key.startsWith(prefix) ? key.slice(prefix.length) : key,
            ),
          };
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { ...env, WRITING: writing, contentKind: "projects" };
}

