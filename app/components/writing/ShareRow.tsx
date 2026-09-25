"use client";

import { LinkSimple, LinkedinLogo, XLogo } from "@phosphor-icons/react";

import { copy } from "../menu/actions";

/**
 * Share, at the end of the article: copy the link (with the site's toast), or
 * hand it to X or LinkedIn. Plain links for the last two, so they work before
 * this island hydrates and with script off.
 */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const text = encodeURIComponent(title);
  const link = encodeURIComponent(url);
  return (
    <div className="article-share" role="group" aria-label="Share">
      <button type="button" data-keycap className="share-button" onClick={() => void copy(url, "Link copied")}>
        <LinkSimple size={16} weight="bold" aria-hidden="true" />
        Copy link
      </button>
      <a
        className="share-button"
        data-keycap
        href={`https://x.com/intent/post?text=${text}&url=${link}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
      >
        <XLogo size={16} weight="bold" aria-hidden="true" />
      </a>
      <a
        className="share-button"
        data-keycap
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${link}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn"
      >
        <LinkedinLogo size={16} weight="bold" aria-hidden="true" />
      </a>
    </div>
  );
}
