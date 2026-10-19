// @ts-nocheck
/**
 * Structural equality that ignores object key order. Firestore returns map
 * keys sorted while local state keeps insertion order, so a plain
 * JSON.stringify comparison reports phantom changes.
 */
export const stableStringify = (value: unknown): string =>
  JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (v as Record<string, unknown>)[k];
            return acc;
          }, {})
      : v,
  );

export const isEqual = (a: unknown, b: unknown): boolean =>
  stableStringify(a) === stableStringify(b);
