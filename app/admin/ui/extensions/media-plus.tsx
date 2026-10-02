"use client";

import { ClosedCaptioning, Trash } from "@phosphor-icons/react";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

import AudioPlayer from "../../../components/writing/AudioPlayer";
import VideoPlayer from "../../../components/writing/VideoPlayer";
import { MediaCaptionsSchema, safeCaptions } from "./media-schema";

/*
 * Video and audio, in the editor, played by the same player readers get
 * (components/writing/VideoPlayer.tsx), plus a field for a captions file
 * (.vtt). Replaces MediaView's node in the editor; same node name and
 * Markdown, one more optional attribute.
 */

function View({ node, updateAttributes, deleteNode, selected, editor }: ReactNodeViewProps) {
  const { kind, src, poster, loop, caption, captions } = node.attrs as { kind: string; src: string; poster: string | null; loop: boolean; caption: string; captions: string };
  const [track, setTrack] = useState(captions ?? "");
  const [bad, setBad] = useState(false);
  return (
    <NodeViewWrapper className="media-node" data-selected={selected || undefined} data-kind={kind}>
      <figure className={kind === "audio" ? "article-audio" : "article-figure article-video"} contentEditable={false}>
        <div className="embed-tools">
          <button type="button" className="embed-tool" onClick={() => deleteNode()} aria-label={`Remove ${kind}`}>
            <Trash size={14} weight="bold" />
          </button>
        </div>
        {kind === "audio" ? (
          <AudioPlayer src={src} title={caption} />
        ) : (
          <VideoPlayer src={src} poster={poster ?? undefined} loop={loop} autoPlay={loop} muted={loop} controls={!loop} preload="metadata" captions={captions || undefined} />
        )}
        <input className="editor-caption" value={caption ?? ""} onChange={(e) => updateAttributes({ caption: e.target.value })} placeholder="Caption (optional)" aria-label="Caption" />
        {kind === "video" && !loop && editor.isEditable ? (
          <label className="editor-captions-field" data-invalid={bad || undefined}>
            <ClosedCaptioning size={15} aria-hidden />
            <input value={track} placeholder="Captions file, /media/…/captions.vtt (optional)" aria-label="Captions file (.vtt)"
              onChange={(e) => { setTrack(e.target.value); setBad(false); }}
              onBlur={() => {
                const value = safeCaptions(track);
                setBad(Boolean(track.trim()) && !value);
                updateAttributes({ captions: value });
              }} />
          </label>
        ) : null}
      </figure>
    </NodeViewWrapper>
  );
}

export const MediaPlus = MediaCaptionsSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(View);
  },
});
