"use client";

import { ArrowSquareOut, LinkSimple, Trash } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { EmbeddedTweet, TweetSkeleton } from "react-tweet";
import type { Tweet } from "react-tweet/api";

import { parseEmbed, threadsFrame, youtubeFrame } from "../../../../cms/embeds";
import { EmbedBase } from "./blocks";

/*
 * The embed, in the editor. A post on X is drawn by react-tweet's own card
 * from data the admin API fetches (the same card the site renders at build);
 * Threads and YouTube show their real players. An empty embed asks for a link.
 */

type XCard = { author: string; handle: string; text: string; url: string };
type XState = { tweet?: Tweet; card?: XCard; error?: string };

function XPreview({ url }: { url: string }) {
  const [state, setState] = useState<XState | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/admin/embed?url=${encodeURIComponent(url)}`)
      .then(async (r) => {
        // Anything but JSON (a proxy page, a dev server without the API) is a miss, not a crash.
        const body = (await r.json().catch(() => ({}))) as XState;
        if (!live) return;
        if (r.ok && (body.tweet || body.card)) setState({ tweet: body.tweet, card: body.card });
        else setState({ error: body.error ?? "The preview isn’t available here." });
      })
      .catch(() => live && setState({ error: "The preview isn’t available here." }));
    return () => {
      live = false;
    };
  }, [url]);

  if (!state) return <TweetSkeleton />;
  if (state.tweet) return <EmbeddedTweet tweet={state.tweet} />;
  if (state.card) return <XCardView card={state.card} />;
  // No data: still show what was embedded, as a link, rather than "not found".
  const handle = url.split("/")[3] ?? "";
  return <XCardView card={{ author: handle ? `@${handle}` : "Post on X", handle, text: "", url }} note={state.error} />;
}

/** A plain post card, for when X only shares the author and text (or nothing). */
function XCardView({ card, note }: { card: XCard; note?: string }) {
  return (
    <a className="x-card" href={card.url} target="_blank" rel="noreferrer">
      <span className="x-card-head">
        <span className="x-card-avatar" aria-hidden="true">{(card.author || "X").replace(/^@/, "").charAt(0).toUpperCase()}</span>
        <span className="x-card-who">
          <strong>{card.author}</strong>
          {card.handle && card.author !== `@${card.handle}` ? <span>@{card.handle}</span> : null}
        </span>
        <svg className="x-card-logo" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.9zm-1.1 18h1.7L6.3 3.9H4.5z" />
        </svg>
      </span>
      {card.text ? <span className="x-card-text">{card.text}</span> : null}
      <span className="x-card-foot">{note ?? "View on X"}</span>
    </a>
  );
}

function View({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const url = String(node.attrs.url ?? "");
  const embed = parseEmbed(url);
  const [draft, setDraft] = useState(url);
  const [error, setError] = useState<string | null>(null);

  return (
    <NodeViewWrapper className="embed-node" data-selected={selected || undefined} data-kind={embed?.kind ?? "empty"}>
      {embed ? (
        <div className="embed-frame" contentEditable={false}>
          <div className="embed-tools">
            <a className="embed-tool" href={embed.url} target="_blank" rel="noreferrer" aria-label="Open original">
              <ArrowSquareOut size={14} weight="bold" />
            </a>
            <button type="button" className="embed-tool" onClick={() => deleteNode()} aria-label="Remove embed">
              <Trash size={14} weight="bold" />
            </button>
          </div>
          {embed.kind === "x" ? (
            <div className="embed embed-x" data-theme="light">
              <XPreview url={embed.url} />
            </div>
          ) : embed.kind === "threads" ? (
            <div className="embed embed-threads">
              <iframe src={threadsFrame(embed)} title={`Threads post by @${embed.user}`} loading="lazy" scrolling="no" />
            </div>
          ) : (
            <div className="embed embed-youtube">
              <iframe
                src={youtubeFrame(embed)}
                title="YouTube video"
                loading="lazy"
                allowFullScreen
                // The admin sends no referrer (see layout.tsx); YouTube refuses to play without one.
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </div>
          )}
        </div>
      ) : (
        <form
          className="embed-ask"
          contentEditable={false}
          onSubmit={(e) => {
            e.preventDefault();
            if (!parseEmbed(draft)) {
              setError("Paste a link to a post on X or Threads, or a YouTube video.");
              return;
            }
            updateAttributes({ url: draft.trim() });
          }}
        >
          <LinkSimple size={16} aria-hidden="true" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Backspace" && !draft)) {
                e.preventDefault();
                deleteNode();
              }
            }}
            placeholder="Paste a link to a post on X or Threads, or a YouTube video"
            aria-label="Embed link"
          />
          <button type="submit" className="admin-button admin-button-primary">
            Embed
          </button>
          {error ? <p className="embed-ask-error">{error}</p> : null}
        </form>
      )}
    </NodeViewWrapper>
  );
}

export const Embed = EmbedBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(View);
  },
});
