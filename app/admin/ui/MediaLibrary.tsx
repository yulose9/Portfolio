"use client";
import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { api } from "./api";
export type Asset = {
  src: string;
  size: number;
  type: string;
  uploadedAt: string;
  usedIn: { id: string; title: string }[];
};
export default function MediaLibrary({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert?: (asset: Asset) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setBusy(true);
      setError("");
    }
  }
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void api
      .media()
      .then((r) => {
        if (alive) {
          setAssets(r.assets);
          setCursor(r.cursor);
        }
      })
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "Could not load media.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);
  const more = async () => {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const r = await api.media(cursor);
      setAssets((a) => [...a, ...r.assets]);
      setCursor(r.cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Media library"
      description="Uploaded assets and the pages that reference them."
    >
      {error ? <p role="alert">{error}</p> : null}
      {!assets.length ? (
        <p role="status">
          {busy ? "Loading media…" : "No uploaded assets yet."}
        </p>
      ) : null}
      <div className="media-library">
        {assets.map((asset) => (
          <article key={asset.src}>
            {asset.type.startsWith("image/") ? (
              <img
                src={asset.src}
                alt=""
                loading="lazy"
                width={96}
                height={72}
              />
            ) : (
              <span>
                {asset.type.startsWith("video/") ? "Video" : "Audio / file"}
              </span>
            )}
            <div>
              <a href={asset.src} target="_blank" rel="noreferrer">
                {asset.src.split("/").pop()}
              </a>
              <small>
                {Math.ceil(asset.size / 1024)} KB ·{" "}
                {new Date(asset.uploadedAt).toLocaleDateString()}
              </small>
              <p>
                {asset.usedIn.length
                  ? `Used in ${asset.usedIn.map((p) => p.title || "Untitled").join(", ")}`
                  : "No direct references found in saved pages"}
              </p>
              {onInsert ? (
                <button
                  className="admin-button"
                  type="button"
                  onClick={() => onInsert(asset)}
                >
                  Insert asset
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {cursor ? (
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => void more()}
        >
          {busy ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </Sheet>
  );
}
