export async function publishedFingerprint(
  source: string | null,
): Promise<string | null> {
  if (source === null) return null;
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source.replace(/\r\n/g, "\n")),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
