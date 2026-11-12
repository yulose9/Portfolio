/** Keep authenticated workspaces and API routes out of public analytics. */
export function isPrivateTelemetryPath(value: string): boolean {
  try {
    const path = decodeURIComponent(new URL(value, "https://local.invalid").pathname);
    return /^\/(?:admin|seneca|api)(?:\/|$)/i.test(path);
  } catch { return true; }
}
