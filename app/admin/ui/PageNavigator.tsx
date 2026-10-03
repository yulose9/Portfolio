"use client";
import { useEffect, useState } from "react";
import { api, type PostSummary } from "./api";
import PageTree from "./PageTree";
import Sheet from "./Sheet";

export default function PageNavigator({
  open,
  onClose,
  currentId,
  onOpen,
  beforeNavigate,
  onPinCurrent,
}: {
  open: boolean;
  onClose: () => void;
  currentId: string;
  onOpen: (id: string) => void;
  beforeNavigate: () => Promise<boolean>;
  onPinCurrent: () => Promise<void>;
}) {
  const [pages, setPages] = useState<PostSummary[] | null>(null),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestKey = `${open}:${retry}`;
  const [shownRequest, setShownRequest] = useState(requestKey);
  if (shownRequest !== requestKey) {
    setShownRequest(requestKey);
    if (open) {
      setError("");
      setPages(null);
    }
  }
  useEffect(() => {
    if (!open) return;
    let live = true;
    void api
      .list()
      .then((result) => {
        if (live) setPages(result.posts);
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Pages could not be loaded.",
          );
      });
    return () => {
      live = false;
    };
  }, [open, retry]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pages"
      description="Your page hierarchy and shortcuts."
      className="page-navigator-sheet"
    >
      <PageTree
        pages={pages ?? []}
        loading={!pages && !error}
        loadError={error || undefined}
        onRetry={() => setRetry((n) => n + 1)}
        currentId={currentId}
        embedded
        beforeNavigate={beforeNavigate}
        onPinCurrent={onPinCurrent}
        onOpen={(id) => {
          onClose();
          if (id !== currentId) onOpen(id);
        }}
      />
    </Sheet>
  );
}
