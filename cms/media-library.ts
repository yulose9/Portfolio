export function assetIdentity(src: string, digest?: string | null): string {
  return digest
    ? `${digest}-${/-(\d+x\d+)\.[a-z0-9]+$/.exec(src)?.[1] ?? "single"}`
    : src;
}
export function assetMetadataKey(key: string, digest?: string | null): string {
  return `media-meta/${encodeURIComponent(assetIdentity(key, digest))}.json`;
}
