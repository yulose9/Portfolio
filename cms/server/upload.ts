/** Coarse container signatures, not a malware scanner or a full decoder. */
export function matchesMediaType(bytes: Uint8Array, type: string): boolean {
  const at = (offset: number, text: string) => [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  switch (type) {
    case "image/png": return starts(137, 80, 78, 71, 13, 10, 26, 10);
    case "image/jpeg": return starts(255, 216, 255);
    case "image/gif": return at(0, "GIF87a") || at(0, "GIF89a");
    case "image/webp": return at(0, "RIFF") && at(8, "WEBP");
    case "image/avif": {
      if (!at(4, "ftyp")) return false;
      const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
      for (let i = 8; i + 4 <= Math.min(boxSize, bytes.length, 256); i += 4) {
        if (i !== 12 && (at(i, "avif") || at(i, "avis"))) return true;
      }
      return false;
    }
    case "video/mp4":
    case "audio/mp4": return bytes.length >= 12 && at(4, "ftyp");
    case "video/webm":
    case "audio/webm": return starts(26, 69, 223, 163);
    case "audio/ogg": return at(0, "OggS");
    case "audio/mpeg": return at(0, "ID3") || (bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 224) === 224);
    default: return false;
  }
}
