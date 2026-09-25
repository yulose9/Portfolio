"use client";

import { useEffect, useRef, useState } from "react";

import { audioSeconds, formatDuration } from "../../../cms/media";

/*
 * A voice note, played the way messaging apps do it: one round button, the
 * recording's own waveform (decoded from the file when it scrolls into view,
 * so the bars are the real shape of the voice), a tap anywhere on it to
 * seek, and 1× / 1.5× / 2×. Shared by the article page and the editor.
 */

const BARS = 48;

async function peaks(src: string): Promise<number[]> {
  const buf = await (await fetch(src)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const step = Math.floor(data.length / BARS) || 1;
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    let max = 0;
    for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 8) max = Math.max(max, Math.abs(data[j]));
    out.push(max);
  }
  const top = Math.max(...out, 0.01);
  return out.map((v) => Math.max(0.08, v / top));
}

const SPEEDS = [1, 1.5, 2];

export default function AudioPlayer({ src, title }: { src: string; title?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(audioSeconds(src) ?? 0);
  const [bars, setBars] = useState<number[] | null>(null);
  const [speed, setSpeed] = useState(1);

  // Waveform once it's on screen; a flat line until then (or if it can't decode).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done) return;
      done = true;
      io.disconnect();
      peaks(src)
        .then(setBars)
        .catch(() => setBars(null));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.min(duration, Math.max(0, ((e.clientX - r.left) / r.width) * duration));
  };

  const progress = duration ? time / duration : 0;
  const shown = bars ?? Array.from({ length: BARS }, () => 0.18);

  return (
    <div ref={box} className="voice" data-playing={playing || undefined}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
      <button type="button" className="voice-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path className="voice-icon-play" d="M5 3.5v9l7.5-4.5z" />
          <path className="voice-icon-pause" d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" />
        </svg>
      </button>
      <div
        className="voice-wave"
        role="slider"
        tabIndex={0}
        aria-label={title ? `Seek: ${title}` : "Seek"}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatDuration(time)} of ${formatDuration(duration)}`}
        onPointerDown={seek}
        onKeyDown={(e) => {
          const a = audio.current;
          if (!a) return;
          if (e.key === "ArrowRight") a.currentTime = Math.min(duration, a.currentTime + 5);
          if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {shown.map((h, i) => (
          <span key={i} className="voice-bar" data-on={i / BARS < progress || undefined} style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      <span className="voice-time">{formatDuration(playing || time ? time : duration)}</span>
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
