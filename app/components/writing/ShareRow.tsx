"use client";

import { Export, FacebookLogo, LinkSimple, LinkedinLogo, ThreadsLogo, XLogo } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

import { copy } from "../menu/actions";

/**
 * Share, at the end of the article: copy the link (with the site's toast), or
 * hand it to X, Threads, LinkedIn or Facebook. Plain links for those, so they
 * work before this island hydrates and with script off. On a phone, "Share…"
 * opens the system sheet (Messages, WhatsApp, Telegram, AirDrop…).
 */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const text = encodeURIComponent(title);
  const link = encodeURIComponent(url);
  // The system share sheet exists or it doesn't; false on the server.
  const native = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false
  );

  return (
    <div className="article-share" role="group" aria-label="Share">
      <button type="button" data-keycap className="share-button" onClick={() => void copy(url, "Link copied")}>
        <LinkSimple size={16} weight="bold" aria-hidden="true" />
        Copy link
      </button>
      {native ? (
        <button type="button" data-keycap className="share-button" onClick={() => void navigator.share({ title, url }).catch(() => {})} aria-label="Share…">
          <Export size={16} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
      <a className="share-button" data-keycap href={`https://x.com/intent/post?text=${text}&url=${link}`} target="_blank" rel="noreferrer" aria-label="Share on X">
        <XLogo size={16} weight="bold" aria-hidden="true" />
      </a>
      <a className="share-button" data-keycap href={`https://www.threads.com/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noreferrer" aria-label="Share on Threads">
        <ThreadsLogo size={16} weight="bold" aria-hidden="true" />
      </a>
      <a className="share-button" data-keycap href={`https://www.linkedin.com/sharing/share-offsite/?url=${link}`} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn">
        <LinkedinLogo size={16} weight="bold" aria-hidden="true" />
      </a>
      <a className="share-button" data-keycap href={`https://www.facebook.com/sharer/sharer.php?u=${link}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook">
        <FacebookLogo size={16} weight="bold" aria-hidden="true" />
      </a>
    </div>
  );
}
