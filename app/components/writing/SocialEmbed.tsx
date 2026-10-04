"use client";

import SiFacebook from "@icons-pack/react-simple-icons/icons/SiFacebook";
import SiThreads from "@icons-pack/react-simple-icons/icons/SiThreads";
import SiInstagram from "@icons-pack/react-simple-icons/icons/SiInstagram";
import { useCallback, useEffect, useRef, useState } from "react";

import { embedAuthor, facebookFrame, instagramFrame, threadsFrame, type FacebookEmbed, type InstagramEmbed, type ThreadsEmbed } from "../../../cms/embeds";

/*
 * A post on Threads, Instagram or Facebook, in a card that looks like it came from there.
 * The platform's own embed iframe sits inside; the card around it carries the
 * logo, the author and a link out, so the post still reads as that platform's
 * while the frame loads, and if it never does (a private post, a blocked
 * frame, no network) the card is the fallback.
 */

export type SocialMeta = { author?: string; handle?: string; text?: string };

type Status = "loading" | "ready" | "failed";

/** How long a frame gets to load before the card shows its fallback. */
const LOAD_TIMEOUT = 15_000;
const THREADS_ORIGINS = new Set(["https://www.threads.com", "https://www.threads.net"]);
const FACEBOOK_POST_HEIGHT = 600;
const FACEBOOK_POST_OPEN = 1200;

const label = (e: ThreadsEmbed | FacebookEmbed | InstagramEmbed) =>
  e.kind === "threads"
    ? "Threads"
    : e.kind === "instagram"
      ? (e.format === "reel" ? "Instagram Reel" : "Instagram Post")
      : e.format === "post"
        ? "Facebook"
        : `Facebook ${e.format}`;

/** The site's theme, as the pre-paint script set it; "auto" follows the system. */
function useDocumentTheme(): "light" | "dark" | "auto" | null {
  const [theme, setTheme] = useState<"light" | "dark" | "auto" | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const t = root.dataset.theme;
      setTheme(t === "dark" || t === "light" ? t : "auto");
    };
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  return theme;
}

/** The stage's width, rounded so a resize doesn't reload the frame per pixel. */
function useWidth(ref: React.RefObject<HTMLElement | null>, step = 20): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(step, Math.floor(el.clientWidth / step) * step));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [ref, step]);
  return width;
}

/** The frame's load status, kept per src: a new src (a theme or width change) starts over at "loading". */
function useLoad(src: string | null) {
  const [state, setState] = useState<{ src: string | null; status: Status }>({ src, status: "loading" });
  const status: Status = state.src === src ? state.status : "loading";
  const setStatus = useCallback(
    (next: Status | ((s: Status) => Status)) =>
      setState((prev) => {
        const current = prev.src === src ? prev.status : "loading";
        return { src, status: typeof next === "function" ? next(current) : next };
      }),
    [src],
  );
  useEffect(() => {
    if (!src) return;
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), LOAD_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [src, setStatus]);
  return [status, setStatus] as const;
}

function Logo({ embed, size }: { embed: ThreadsEmbed | FacebookEmbed | InstagramEmbed; size: number }) {
  if (embed.kind === "threads") {
    return <SiThreads className="social-embed-logo" size={size} title="" aria-hidden="true" />;
  }
  if (embed.kind === "instagram") {
    return <SiInstagram className="social-embed-logo" size={size} color="default" title="" aria-hidden="true" />;
  }
  return <SiFacebook className="social-embed-logo" size={size} color="default" title="" aria-hidden="true" />;
}

function Fallback({ embed, meta }: { embed: ThreadsEmbed | FacebookEmbed | InstagramEmbed; meta?: SocialMeta }) {
  const where = embed.kind === "threads" ? "Threads" : embed.kind === "instagram" ? "Instagram" : "Facebook";
  return (
    <div className="social-embed-fallback">
      {meta?.text ? <p className="social-embed-text">{meta.text}</p> : null}
      <p className="social-embed-note">
        {meta?.text
          ? `The full post didn’t load here. Open it on ${where} to see it all.`
          : `This post didn’t load here. It may be private or removed; open it on ${where} to see it.`}
      </p>
    </div>
  );
}

export default function SocialEmbed({ embed, meta }: { embed: ThreadsEmbed | FacebookEmbed | InstagramEmbed; meta?: SocialMeta }) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const theme = useDocumentTheme();
  const width = useWidth(stage);
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  const facebookWidth = embed.kind === "facebook" && width ? Math.min(width, embed.format === "reel" ? 360 : 500) : null;
  const instagramWidth = embed.kind === "instagram" && width ? Math.min(width, embed.format === "reel" ? 380 : 540) : null;
  const frameWidth = embed.kind === "instagram" ? instagramWidth : facebookWidth;
  const src =
    embed.kind === "threads"
      ? theme
        ? threadsFrame(embed, theme)
        : null
      : embed.kind === "instagram"
        ? instagramFrame(embed)
        : facebookWidth
          ? facebookFrame(embed, facebookWidth)
          : null;
  const [status, setStatus] = useLoad(src);

  // Threads tells the parent its height, as a number, once the post has laid out.
  useEffect(() => {
    if (embed.kind !== "threads") return;
    const onMessage = (event: MessageEvent) => {
      if (!THREADS_ORIGINS.has(event.origin) || event.source !== frame.current?.contentWindow) return;
      const h = Number(event.data);
      if (Number.isFinite(h) && h > 0 && h < 20_000) {
        setHeight(Math.ceil(h));
        setStatus("ready");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embed.kind, setStatus]);

  const handle = meta?.handle ?? embedAuthor(embed);
  const name =
    embed.kind === "threads"
      ? handle
        ? `@${handle}`
        : "Threads post"
      : embed.kind === "instagram"
        ? embed.format === "reel"
          ? "Instagram Reel"
          : "Instagram Post"
        : meta?.author ?? embed.page ?? "Facebook";
  const sub =
    embed.kind === "threads"
      ? meta?.author && meta.author !== handle
        ? meta.author
        : "Threads"
      : embed.kind === "instagram"
        ? "Instagram"
        : embed.format === "post"
          ? "Post on Facebook"
          : embed.format === "video"
            ? "Video on Facebook"
            : "Reel on Facebook";

  const stageHeight =
    embed.kind === "threads"
      ? (height ?? 500)
      : embed.kind === "instagram"
        ? (embed.format === "reel" ? 640 : 560)
        : embed.format === "post"
          ? open
            ? FACEBOOK_POST_OPEN
            : FACEBOOK_POST_HEIGHT
          : facebookWidth
            ? Math.round(embed.format === "reel" ? (facebookWidth * 16) / 9 : (facebookWidth * 9) / 16)
            : undefined;

  const failed = status === "failed";
  const title = `${label(embed)} post${handle ? ` by ${embed.kind === "threads" ? "@" : ""}${handle}` : ""}`;

  return (
    <figure
      className="social-embed"
      data-platform={embed.kind}
      data-format={embed.kind === "facebook" ? embed.format : embed.kind === "instagram" ? embed.format : undefined}
      data-status={status}
    >
      <header className="social-embed-head">
        <Logo embed={embed} size={20} />
        <span className="social-embed-who">
          <strong>{name}</strong>
          <span>{sub}</span>
        </span>
      </header>
      {failed ? (
        <Fallback embed={embed} meta={meta} />
      ) : (
        <div
          ref={stage}
          className="social-embed-stage"
          style={stageHeight ? { height: stageHeight } : undefined}
        >
          {status === "loading" ? (
            <p className="social-embed-loading">
              {embed.kind === "threads"
                ? "Loading the post from Threads"
                : embed.kind === "instagram"
                  ? "Loading the reel from Instagram"
                  : "Loading the post from Facebook"}
            </p>
          ) : null}
          {src ? (
            <iframe
              ref={frame}
              src={src}
              title={title}
              loading="lazy"
              scrolling="no"
              allowFullScreen
              // The admin sends no referrer; Meta's plugins expect the page's origin.
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              style={frameWidth ? { width: frameWidth } : undefined}
              // A cross-origin frame can't say whether its post rendered, only that it loaded;
              // a frame that never loads (blocked, offline) falls back after the timeout.
              onLoad={() => setStatus((s) => (s === "loading" ? "ready" : s))}
            />
          ) : null}
        </div>
      )}
      <footer className="social-embed-foot">
        {embed.kind === "facebook" && embed.format === "post" && !failed ? (
          <button type="button" className="social-embed-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Show less" : "Show more"}
          </button>
        ) : null}
        <a className="social-embed-link" href={embed.url} target="_blank" rel="noreferrer">
          View on {embed.kind === "threads" ? "Threads" : embed.kind === "instagram" ? "Instagram" : "Facebook"}
        </a>
      </footer>
    </figure>
  );
}
