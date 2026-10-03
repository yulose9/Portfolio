import type { AdminEnv } from "./http";
/** Reuse draft/revision/hierarchy services without sharing the writing namespace. */
export function projectEnvironment(env: AdminEnv): AdminEnv {
  const prefix = "workspaces/projects/";
  const bucket = env.WRITING;
  const writing = new Proxy(bucket, {
    get(target, property) {
      if (property === "get" || property === "head")
        return (key: string, options?: unknown) =>
          (target[property] as Function).call(target, prefix + key, options);
      if (property === "put")
        return (key: string, value: unknown, options?: unknown) =>
          target.put(prefix + key, value as string, options as R2PutOptions);
      if (property === "delete")
        return (keys: string | string[]) =>
          target.delete(
            Array.isArray(keys)
              ? keys.map((key) => prefix + key)
              : prefix + keys,
          );
      if (property === "list")
        return async (options: R2ListOptions = {}) => {
          const result = await target.list({
            ...options,
            prefix: prefix + (options.prefix ?? ""),
          });
          return {
            ...result,
            objects: result.objects.map((object) => ({
              ...object,
              key: object.key.slice(prefix.length),
            })),
            delimitedPrefixes: result.delimitedPrefixes.map((key) =>
              key.slice(prefix.length),
            ),
          };
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { ...env, WRITING: writing, contentKind: "projects" };
}
