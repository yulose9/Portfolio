"use client";

import { ArrowSquareOut, LinkSimple, Trash } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from "react-tweet";
import type { Tweet } from "react-tweet/api";

import { parseEmbed, threadsFrame, youtubeFrame } from "../../../../cms/embeds";
import { EmbedBase } from "./blocks";

/*
 * The embed, in the editor. A post on X is drawn by react-tweet's own card
 * from data the admin API fetches (the same card the site renders at build);
 * Threads and YouTube show their real players. An empty embed asks for a link.
 */

function XPreview({ url }: { url: string }) {
  const [state, setState] = useState<{ tweet?: Tweet; error?: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/admin/embed?url=${encodeURIComponent(url)}`)
      .then(async (r) => {
        const body = (await r.json()) as { tweet?: Tweet; error?: string };
        if (live) setState(r.ok ? { tweet: body.tweet } : { error: body.error ?? "Couldn’t load the post." });
      })
      .catch(() => live && setState({ error: "Couldn’t load the post." }));
    return () => {
      live = false;
    };
  }, [url]);

  if (!state) return <TweetSkeleton />;
  if (state.tweet) return <EmbeddedTweet tweet={state.tweet} />;
  return (
    <div className="embed-error">
      <TweetNotFound />
      <p>{state.error}</p>
    </div>
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
