"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

/*
 * The article's video player, after shadcn's video player: the browser's own
 * <video>, with one quiet control bar over its foot. Play and pause, a
 * scrubber, the time, volume, speed (0.5× to 2×), captions when the post has
 * a .vtt file, picture-in-picture and full screen.
 *
 * Keyboard, once the player has focus: Space or K plays and pauses, ← / →
 * skip 5 seconds, J / L skip 10, ↑ / ↓ change the volume, M mutes, F goes
 * full screen, C toggles captions, < and > change the speed, 0–9 jump to
 * that tenth of the video. The bar hides while playing and comes back on
 * any pointer move or key.
 *
 * Looping, muted clips (GIFs turned into video) are not "videos" in this
 * sense and stay a bare autoplaying <video>.
 */

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type VideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & { "data-captions"?: string; captions?: string; captionsLabel?: string };

const clock = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(sec).padStart(2, "0")}`;
};

const Icon = ({ d, filled }: { d: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PATH = {
  play: "M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z",
  pause: "M7 4h3v16H7zM14 4h3v16h-3z",
  volume: "M4 9.5h3.5L12 5v14l-4.5-4.5H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11",
  muted: "M4 9.5h3.5L12 5v14l-4.5-4.5H4zM16.5 9.5l5 5M21.5 9.5l-5 5",
  cc: "M3.5 6.5h17v11h-17zM10 10.6a2 2 0 1 0 0 2.8M16.5 10.6a2 2 0 1 0 0 2.8",
  pip: "M3.5 5.5h17v13h-17zM12.5 12h6v5h-6z",
  full: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  exit: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
};

const noSubscribe = () => () => {};
const pipSupported = () => "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;

export default function VideoPlayer(props: VideoProps) {
  const { loop, autoPlay, controls, muted, captionsLabel = "English", className, style, captions: ownCaptions, "data-captions": markdownCaptions, ...rest } = props;
  const captions = ownCaptions || markdownCaptions || undefined;

  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hide = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setMuted] = useState(Boolean(muted));
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [cc, setCc] = useState(false);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const [started, setStarted] = useState(false);
  const canPip = useSyncExternalStore(noSubscribe, pipSupported, () => false);
  const [announce, setAnnounce] = useState("");
  const speedId = useId();

  const v = () => video.current;

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => {
      if (video.current && !video.current.paused) setIdle(true);
    }, 2200);
  }, []);

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("fullscreenchange", onFull);
      window.clearTimeout(hide.current);
    };
  }, []);

  useEffect(() => {
    const track = v()?.textTracks?.[0];
    if (track) track.mode = cc ? "showing" : "hidden";
  }, [cc]);

  const toggle = () => {
    const el = v();
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };
  const seekTo = (t: number) => {
    const el = v();
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration, t));
    setTime(el.currentTime);
  };
  const setVol = (next: number) => {
    const el = v();
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, next));
    el.muted = el.volume === 0;
  };
  const changeSpeed = (next: number) => {
    const el = v();
    if (el) el.playbackRate = next;
    setSpeed(next);
    setAnnounce(`Speed ${next}×`);
  };
  const stepSpeed = (dir: 1 | -1) => {
    const i = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (i === -1 ? 2 : i) + dir))];
    changeSpeed(next);
  };
  const fullscreen = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else (v() as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
  };
  const pip = () => {
    const el = v();
    if (!el) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void el.requestPictureInPicture().catch(() => {});
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    // Sliders and the speed menu keep their own arrow keys.
    if (target.matches("input[type=range]") && /^Arrow/.test(e.key)) return;
    if (target.closest("[role=menu]")) return;
    const el = v();
    if (!el) return;
    const k = e.key;
    let handled = true;
    if (k === " " || k === "k" || k === "K") {
      if (k === " " && target.tagName === "BUTTON") return;
      toggle();
    } else if (k === "ArrowLeft") seekTo(el.currentTime - 5);
    else if (k === "ArrowRight") seekTo(el.currentTime + 5);
    else if (k === "j" || k === "J") seekTo(el.currentTime - 10);
    else if (k === "l" || k === "L") seekTo(el.currentTime + 10);
    else if (k === "ArrowUp") setVol(el.volume + 0.1);
    else if (k === "ArrowDown") setVol(el.volume - 0.1);
    else if (k === "m" || k === "M") el.muted = !el.muted;
    else if (k === "f" || k === "F") fullscreen();
    else if ((k === "c" || k === "C") && captions) setCc((c) => !c);
    else if (k === ">" || k === ".") stepSpeed(1);
    else if (k === "<" || k === ",") stepSpeed(-1);
    else if (/^[0-9]$/.test(k) && Number.isFinite(el.duration)) seekTo((Number(k) / 10) * el.duration);
    else handled = false;
    if (handled) {
      e.preventDefault();
      wake();
    }
  };

  if (loop || (autoPlay && !controls)) {
    // eslint-disable-next-line jsx-a11y/media-has-caption -- a silent loop, not a video with speech
    return <video {...rest} className={className} style={style} loop={loop} autoPlay={autoPlay} muted={muted ?? true} playsInline />;
  }

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={box}
      className="video-player"
      data-playing={playing || undefined}
      data-idle={(playing && idle && !speedOpen) || undefined}
      data-fullscreen={full || undefined}
      tabIndex={0}
      role="group"
      aria-label="Video player. Space plays or pauses; arrows skip and change the volume."
      onKeyDown={onKey}
      onPointerMove={wake}
      onPointerLeave={() => playing && setIdle(true)}
    >
      <video
        {...rest}
        ref={video}
        className={className}
        style={style}
        muted={isMuted}
        playsInline
        crossOrigin={captions?.startsWith("http") ? "anonymous" : undefined}
        onClick={toggle}
        onDoubleClick={fullscreen}
        onPlay={() => { setPlaying(true); setStarted(true); wake(); }}
        onPause={() => { setPlaying(false); setIdle(false); }}
        onEnded={() => { setPlaying(false); setIdle(false); }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); e.currentTarget.playbackRate = speed; }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length && e.currentTarget.duration) setBuffered((b.end(b.length - 1) / e.currentTarget.duration) * 100);
        }}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
      >
        {captions ? <track kind="captions" src={captions} srcLang="en" label={captionsLabel} /> : null}
      </video>

      {!started ? (
        <button type="button" className="video-big-play" aria-label="Play video" onClick={toggle}>
          <Icon d={PATH.play} filled />
        </button>
      ) : null}

      <div className="video-controls" onPointerDown={(e) => e.stopPropagation()}>
        <div className="video-scrub" style={{ "--progress": `${progress}%`, "--buffered": `${buffered}%` } as React.CSSProperties}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            aria-label="Seek"
            aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            onChange={(e) => seekTo(Number(e.target.value))}
          />
        </div>
        <div className="video-bar">
          <button type="button" className="video-button" aria-label={playing ? "Pause (K)" : "Play (K)"} title={playing ? "Pause (K)" : "Play (K)"} onClick={toggle}>
            <Icon d={playing ? PATH.pause : PATH.play} filled />
          </button>
          <div className="video-volume">
            <button type="button" className="video-button" aria-label={isMuted ? "Unmute (M)" : "Mute (M)"} title={isMuted ? "Unmute (M)" : "Mute (M)"} onClick={() => { const el = v(); if (el) el.muted = !el.muted; }}>
              <Icon d={isMuted || volume === 0 ? PATH.muted : PATH.volume} />
            </button>
            <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} aria-label="Volume" aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`} onChange={(e) => setVol(Number(e.target.value))} style={{ "--level": `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties} />
          </div>
          <span className="video-time" aria-hidden="true">
            {clock(time)} <span>/ {clock(duration)}</span>
          </span>
          <span className="video-spacer" />
          <div className="video-speed">
            <button type="button" className="video-button video-speed-button" aria-haspopup="menu" aria-expanded={speedOpen} aria-controls={speedId} aria-label={`Playback speed, ${speed}×`} title="Playback speed (< >)" onClick={() => setSpeedOpen((o) => !o)}>
              {speed}×
            </button>
            {speedOpen ? (
              <div id={speedId} className="video-speed-menu" role="menu" aria-label="Playback speed"
                onKeyDown={(e) => {
                  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]")];
                  const i = items.indexOf(document.activeElement as HTMLButtonElement);
                  if (e.key === "Escape") { e.preventDefault(); setSpeedOpen(false); (e.currentTarget.previousElementSibling as HTMLElement)?.focus(); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
                }}
                ref={(el) => { el?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus(); }}
              >
                {SPEEDS.map((s) => (
                  <button key={s} type="button" role="menuitemradio" aria-checked={speed === s} tabIndex={speed === s ? 0 : -1}
                    onClick={(e) => { changeSpeed(s); setSpeedOpen(false); (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)?.focus(); }}>
                    {s === 1 ? "Normal" : `${s}×`}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {captions ? (
            <button type="button" className="video-button" aria-pressed={cc} aria-label="Captions (C)" title="Captions (C)" onClick={() => setCc((c) => !c)}>
              <Icon d={PATH.cc} />
            </button>
          ) : null}
          {canPip ? (
            <button type="button" className="video-button" aria-label="Picture in picture" title="Picture in picture" onClick={pip}>
              <Icon d={PATH.pip} />
            </button>
          ) : null}
          <button type="button" className="video-button" aria-label={full ? "Exit full screen (F)" : "Full screen (F)"} title={full ? "Exit full screen (F)" : "Full screen (F)"} onClick={fullscreen}>
            <Icon d={full ? PATH.exit : PATH.full} />
          </button>
        </div>
      </div>
      <span className="sr-only" role="status">{announce}</span>
    </div>
  );
}
