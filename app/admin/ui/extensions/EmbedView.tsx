"use client";

import { ArrowSquareOut, LinkSimple, Trash } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { Tweet, TweetSkeleton } from "react-tweet";

import { parseEmbed, youtubeFrame, type FacebookEmbed, type InstagramEmbed, type ThreadsEmbed, type XEmbed } from "../../../../cms/embeds";
import SocialEmbed, { type SocialMeta } from "../../../components/writing/SocialEmbed";
import { EmbedBase } from "./blocks";

/*
 * The embed, in the editor. A post on X is drawn by react-tweet's client component
 * directly, with a fallback link card on error or not found; Threads, Instagram, and
 * Facebook get the site's own responsive embed cards, and YouTube its player.
 */

/** Threads, Instagram, and Facebook preview card. */
function SocialPreview({ embed }: { embed: ThreadsEmbed | FacebookEmbed | InstagramEmbed }) {
  const [meta, setMeta] = useState<SocialMeta | undefined>(undefined);
  useEffect(() => {
    // Only Threads has an oEmbed text scraper on the admin API; others work from iframe/link directly.
    if (embed.kind !== "threads") return;
    let live = true;
    fetch(`/api/admin/embed?url=${encodeURIComponent(embed.url)}`)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { meta?: SocialMeta };
        if (live && r.ok && body.meta) setMeta(body.meta);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [embed.kind, embed.url]);
  return <SocialEmbed embed={embed} meta={meta} />;
}

type XCard = { author: string; handle: string; text: string; url: string };

function XPreview({ embed }: { embed: XEmbed }) {
  const [error, setError] = useState<string | null>(null);
  const handle = embed.url.split("/")[3] ?? "";

  if (error) {
    return (
      <XCardView
        card={{ author: handle ? `@${handle}` : "Post on X", handle, text: "", url: embed.url }}
        note="Open post on X"
      />
    );
  }

  return (
    <div className="react-tweet-theme" style={{ width: "100%", maxWidth: 550, margin: "0 auto" }}>
      <Tweet
        id={embed.id}
        fallback={<TweetSkeleton />}
        onError={() => {
          setError("The post could not be loaded directly.");
          return undefined;
        }}
        components={{
          TweetNotFound: () => (
            <XCardView
              card={{ author: handle ? `@${handle}` : "Post on X", handle, text: "", url: embed.url }}
              note="Open post on X"
            />
          ),
        }}
      />
    </div>
  );
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
            <div className="embed embed-x">
              <XPreview embed={embed} />
            </div>
          ) : embed.kind === "threads" || embed.kind === "facebook" || embed.kind === "instagram" ? (
            <div className="embed embed-social">
              <SocialPreview embed={embed} />
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
              setError("Paste a link to a post on X, Threads, Instagram, or Facebook, or a YouTube video.");
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
            placeholder="Paste a link to a post on X, Threads, Instagram, or Facebook, or a YouTube video"
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
