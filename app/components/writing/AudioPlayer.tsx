"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { audioSeconds, formatDuration } from "../../../cms/media";

/*
 * A voice note, played the way messaging apps do it: one round button, the
 * recording's own waveform across the whole width (decoded from the file
 * when it scrolls into view, so the bars are the real shape of the voice),
 * press or drag anywhere on it to seek, the time so far and in all, and
 * 1× / 1.25× / 1.5× / 2×.
 *
 * AudioFigure is the card around it, with the caption as its title line.
 * The article page and the editor both draw that card, so a voice note looks
 * the same in both; the editor swaps the caption for a field.
 */

/** Resolution the file is decoded at; the bars on screen are resampled from it. */
const PEAKS = 240;
/** One bar per this many pixels of waveform (a 3px bar and a 2px gap). */
const BAR_PX = 5;
const SPEEDS = [1, 1.25, 1.5, 2];

async function peaks(src: string): Promise<number[]> {
  const buf = await (await fetch(src)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const step = Math.floor(data.length / PEAKS) || 1;
  const out: number[] = [];
  for (let i = 0; i < PEAKS; i++) {
    let max = 0;
    for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 8) max = Math.max(max, Math.abs(data[j]));
    out.push(max);
  }
  const top = Math.max(...out, 0.01);
  return out.map((v) => Math.max(0.08, v / top));
}

/** `count` bars from the decoded peaks: the loudest moment in each slice. */
function resample(values: number[], count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i * values.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * values.length) / count));
    return Math.max(...values.slice(from, to));
  });
}

const clock = (s: number) => formatDuration(Math.floor(Math.max(0, s)));

export default function AudioPlayer({ src, title }: { src: string; title?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(audioSeconds(src) ?? 0);
  const [decoded, setDecoded] = useState<number[] | null>(null);
  const [count, setCount] = useState(56);
  const [hover, setHover] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);

  // As many bars as the width holds, so they keep their size on any screen.
  useEffect(() => {
    const el = wave.current;
    if (!el) return;
    const fit = () => setCount(Math.max(24, Math.min(PEAKS, Math.floor(el.clientWidth / BAR_PX))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The waveform once it's on screen; a flat line until then (or if it can't decode).
  useEffect(() => {
    const el = wave.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done) return;
      done = true;
      io.disconnect();
      peaks(src)
        .then(setDecoded)
        .catch(() => setDecoded(null));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  // While it plays, the progress follows every frame rather than timeupdate's
  // four times a second, so the fill glides instead of stepping.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  const seekTo = (seconds: number) => {
    const a = audio.current;
    if (!a || !duration) return;
    const to = Math.min(duration, Math.max(0, seconds));
    a.currentTime = to;
    setTime(to);
  };
  // Press and drag scrubs: the waveform keeps the pointer until it is let go.
  const startSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(at(e) * duration);
  };
  const moveSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") setHover(at(e));
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekTo(at(e) * duration);
  };

  const progress = duration ? Math.min(1, time / duration) : 0;
  const bars = decoded ? resample(decoded, count) : Array.from({ length: count }, () => 0.18);
  const row = (className: string, clip?: number) => (
    <span className={className} aria-hidden="true" style={clip === undefined ? undefined : { clipPath: `inset(0 ${(1 - clip) * 100}% 0 0)` }}>
      {bars.map((h, i) => (
        <span key={i} className="voice-bar" style={{ height: `${Math.round(h * 100)}%` }} />
      ))}
    </span>
  );

  return (
    <div className="voice" data-playing={playing || undefined} data-ready={decoded ? "" : undefined}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          setTime(e.currentTarget.currentTime);
        }}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => !playing && setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
      <button type="button" className="voice-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path className="voice-icon-play" d="M5 3.5v9l7.5-4.5z" />
          <path className="voice-icon-pause" d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" />
        </svg>
      </button>
      <div
        ref={wave}
        className="voice-wave"
        role="slider"
        tabIndex={0}
        aria-label={title ? `Seek: ${title}` : "Seek"}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${clock(time)} of ${clock(duration)}`}
        data-hover={hover !== null || undefined}
        onPointerDown={startSeek}
        onPointerMove={moveSeek}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          const a = audio.current;
          if (!a) return;
          // The slider keys: arrows step 5s, Page keys 30s, Home/End the ends.
          const to: Record<string, number> = {
            ArrowRight: a.currentTime + 5,
            ArrowUp: a.currentTime + 5,
            ArrowLeft: a.currentTime - 5,
            ArrowDown: a.currentTime - 5,
            PageUp: a.currentTime + 30,
            PageDown: a.currentTime - 30,
            Home: 0,
            End: duration,
          };
          if (e.key in to) {
            e.preventDefault();
            seekTo(to[e.key]);
          } else if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {row("voice-bars")}
        {hover !== null ? row("voice-bars voice-bars-hover", hover) : null}
        {row("voice-bars voice-bars-on", progress)}
      </div>
      <span className="voice-time">
        <span className="voice-time-now">{clock(time)}</span>
        <span className="voice-time-total"> / {clock(duration)}</span>
      </span>
      <button
        type="button"
        className="voice-speed"
        onClick={() => {
          const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
          setSpeed(next);
          if (audio.current) audio.current.playbackRate = next;
        }}
        aria-label={`Playback speed ${speed}×`}
      >
        {speed}×
      </button>
    </div>
  );
}

/**
 * The voice-note card: the caption as its title line, then the player. The
 * editor passes `caption` as a field and `tools` (its remove button).
 */
export function AudioFigure({
  src,
  title,
  caption,
  tools,
  className,
  editing,
}: {
  src: string;
  title?: string;
  caption?: ReactNode;
  tools?: ReactNode;
  className?: string;
  /** In the editor: the card is a block, not text. */
  editing?: boolean;
}) {
  return (
    <figure
      className={className ? `article-audio ${className}` : "article-audio"}
      data-captioned={caption || title ? "" : undefined}
      contentEditable={editing ? false : undefined}
    >
      {tools}
      {caption ?? (title ? <figcaption className="voice-caption">{title}</figcaption> : null)}
      <AudioPlayer src={src} title={title} />
    </figure>
  );
}
