"use client";

import { DesktopTower, DeviceMobile } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import type { Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { parseEmbed, threadsFrame, youtubeFrame, type Embed } from "../../../cms/embeds";
import { fluentUrl } from "../../../cms/emoji";
import { fontLinks, fontVars } from "../../../cms/fonts";
import { readingMinutes, tagSlug } from "../../../cms/format";
import { markdownToTree, outline, setWikiResolver } from "../../../cms/render";
import AudioPlayer from "../../components/writing/AudioPlayer";
import AuthorCard from "../../components/writing/AuthorCard";
import Byline from "../../components/writing/Byline";
import FluentText from "../../components/writing/FluentText";
import ShareRow from "../../components/writing/ShareRow";
import Tag from "../../components/writing/Tag";
import Toc from "../../components/writing/Toc";
import { api, type Draft } from "./api";
import type { Meta } from "./Editor";

/*
 * Before it goes out: the post as readers will get it.
 *
 *  - Page: rendered by the site's own renderer (cms/render.ts) with the
 *    site's own stylesheets, inside a frame sized like a laptop or a phone,
 *    so the media queries are the real ones.
 *  - Lists: its row on the home page and in /writing, and its Google result.
 *  - Share: the link as X, Threads, LinkedIn, Facebook, Messenger, WhatsApp,
 *    Telegram and iMessage draw it, and as a browser tab and bookmark.
 */

const SITE = "https://nazarene.dev";
const longDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/* ── A frame that renders React into an iframe with the admin's own CSS ── */

function Frame({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();
    // Same stylesheets, same font variables, same classes as the real page.
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => doc.head.appendChild(n.cloneNode(true)));
    doc.documentElement.className = document.documentElement.className;
    doc.body.style.margin = "0";
    doc.body.style.background = "#fff";
    setBody(doc.body);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={box} className="preview-frame-box" style={{ height: height * scale }}>
      <iframe ref={iframe} className="preview-frame" title="Page preview" style={{ width, height, transform: `scale(${scale})` }} />
      {body ? createPortal(children, body) : null}
    </div>
  );
}

/* ── The article ─────────────────────────────────────────────────────── */

function EmbedPreview(props: Record<string, unknown>) {
  let embed: Embed;
  try {
    const data: unknown = JSON.parse(String(props["data-embed"]));
    if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string") return null;
    const parsed = parseEmbed(data.url);
    if (!parsed) return null;
    embed = parsed;
  } catch {
    return null;
  }
  if (embed.kind === "youtube")
    return (
      <div className="embed embed-youtube">
        <iframe src={youtubeFrame(embed)} title="YouTube video" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  if (embed.kind === "threads")
    return (
      <div className="embed embed-threads">
        <iframe src={threadsFrame(embed)} title="Threads post" loading="lazy" scrolling="no" />
      </div>
    );
  return (
    <div className="embed embed-x preview-embed-x">
      <a href={embed.url} target="_blank" rel="noreferrer">
        Post on X · {embed.url.replace("https://", "")}
      </a>
    </div>
  );
}

function AudioPreview(props: Record<string, unknown>) {
  const src = String(props["data-src"] ?? "");
  return src ? (
    <figure className="article-audio">
      <AudioPlayer src={src} />
    </figure>
  ) : null;
}

function Article({ meta, tree, doc }: { meta: Meta; tree: Root; doc: Draft }) {
  const toc = outline(tree);
  const url = `${SITE}/writing/${meta.slug || "…"}`;
  const body = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { "x-embed": EmbedPreview, "x-audio": AudioPreview } as unknown as Partial<Components>,
  });
  return (
    <div className="flex w-full justify-center bg-white">
      {fontLinks(meta.fonts).map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <main className="page-shell article-shell article-page preview-page w-full max-w-[672px] py-16" style={fontVars(meta.fonts) as React.CSSProperties}>
        <nav className="article-nav" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <a href="#">Writing</a>
            </li>
            <li aria-current="page">{meta.title || "Untitled"}</li>
          </ol>
        </nav>
        <article className="article" data-has-toc={toc.length >= 3 || undefined}>
          <header className="article-header">
            {meta.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="article-icon" src={fluentUrl(meta.icon)} alt="" width={72} height={72} />
            ) : null}
            <p className="article-eyebrow">
              <time>{longDate.format(meta.publishedAt ? new Date(meta.publishedAt) : doc.publishedAt ? new Date(doc.publishedAt) : new Date())}</time>
            </p>
            {meta.tags.length ? (
              <div className="article-header-tags">
                {meta.tags.map((t) => (
                  <Tag key={t} name={t} href={`#tag-${tagSlug(t)}`} />
                ))}
              </div>
            ) : null}
            <h1 className="article-title">
              <FluentText>{meta.title || "Untitled"}</FluentText>
            </h1>
            {meta.dek ? (
              <p className="article-dek">
                <FluentText>{meta.dek}</FluentText>
              </p>
            ) : null}
            <Byline authors={meta.authors} minutes={readingMinutes(doc.body)} updated={null} updatedLabel={null} />
          </header>
          {meta.cover ? (
            <figure className="article-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.cover.src} alt={meta.cover.alt} width={meta.cover.width} height={meta.cover.height} />
              {meta.cover.caption ? <figcaption>{meta.cover.caption}</figcaption> : null}
            </figure>
          ) : null}
          <div className="article-main">
            {toc.length >= 3 ? <Toc items={toc} /> : null}
            <div className="article-body">{body}</div>
          </div>
          <footer className="article-footer">
            {meta.tags.length ? (
              <ul className="article-tags">
                {meta.tags.map((t) => (
                  <li key={t}>
                    <Tag name={t} />
                  </li>
                ))}
              </ul>
            ) : null}
            <ShareRow url={url} title={meta.title} />
          </footer>
          <AuthorCard authors={meta.authors} />
        </article>
      </main>
    </div>
  );
}

/* ── Share cards ─────────────────────────────────────────────────────── */

/** The generated share card, drawn in HTML to the same layout as opengraph-image.tsx. */
function CardMock({ meta }: { meta: Meta }) {
  return (
    <div className="og-mock" aria-label="Generated share card">
      <div className="og-mock-inner">
        <div className="og-mock-top">
          <span className="og-mock-site">
            <i />
            nazarene.dev/writing
          </span>
          {meta.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fluentUrl(meta.icon)} alt="" />
          ) : null}
        </div>
        <div className="og-mock-title">{meta.title || "Untitled"}</div>
        {meta.dek ? <div className="og-mock-dek">{meta.dek}</div> : null}
        <div className="og-mock-foot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/og/avatar.png" alt="" />
          {meta.authors.map((a) => a.name).filter(Boolean).join(", ") || "John Nazarene Dela Pisa"}
        </div>
      </div>
    </div>
  );
}

function ShareImage({ meta }: { meta: Meta }) {
  const src = meta.ogImage && meta.ogImage !== "cover" ? meta.ogImage : meta.ogImage === "cover" && meta.cover ? meta.cover.src : null;
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="share-img" src={src} alt="" /> : <CardMock meta={meta} />;
}

function Shares({ meta }: { meta: Meta }) {
  const title = meta.title || "Untitled";
  const desc = meta.dek || `${title}, by John Nazarene Dela Pisa.`;
  const url = `nazarene.dev/writing/${meta.slug || "…"}`;
  return (
    <div className="share-grid">
      <section className="share-app">
        <h3>X</h3>
        <div className="mock-x">
          <div className="mock-x-card">
            <ShareImage meta={meta} />
            <span className="mock-x-domain">nazarene.dev</span>
          </div>
          <p className="mock-x-from">From nazarene.dev</p>
        </div>
      </section>
      <section className="share-app">
        <h3>Threads</h3>
        <div className="mock-card mock-threads">
          <ShareImage meta={meta} />
          <div className="mock-meta">
            <b>{title}</b>
            <span>nazarene.dev</span>
          </div>
        </div>
      </section>
      <section className="share-app">
        <h3>LinkedIn</h3>
        <div className="mock-card mock-linkedin">
          <ShareImage meta={meta} />
          <div className="mock-meta">
            <b>{title}</b>
            <span>nazarene.dev</span>
          </div>
        </div>
      </section>
      <section className="share-app">
        <h3>Facebook</h3>
        <div className="mock-card mock-facebook">
          <ShareImage meta={meta} />
          <div className="mock-meta">
            <span className="mock-caps">NAZARENE.DEV</span>
            <b>{title}</b>
            <span className="mock-clamp">{desc}</span>
          </div>
        </div>
      </section>
      <section className="share-app">
        <h3>Messenger</h3>
        <div className="mock-bubble mock-messenger">
          <ShareImage meta={meta} />
          <div className="mock-meta">
            <b>{title}</b>
            <span>nazarene.dev</span>
          </div>
        </div>
      </section>
      <section className="share-app">
        <h3>WhatsApp</h3>
        <div className="mock-wa">
          <div className="mock-wa-preview">
            <ShareImage meta={meta} />
            <div className="mock-meta">
              <b>{title}</b>
              <span className="mock-clamp">{desc}</span>
              <span>nazarene.dev</span>
            </div>
          </div>
          <span className="mock-wa-link">https://{url}</span>
        </div>
      </section>
      <section className="share-app">
        <h3>Telegram</h3>
        <div className="mock-tg">
          <span className="mock-tg-link">https://{url}</span>
          <div className="mock-tg-preview">
            <b className="mock-tg-site">John Nazarene Dela Pisa</b>
            <b>{title}</b>
            <span className="mock-clamp">{desc}</span>
            <ShareImage meta={meta} />
          </div>
        </div>
      </section>
      <section className="share-app">
        <h3>iMessage</h3>
        <div className="mock-imsg">
          <ShareImage meta={meta} />
          <div className="mock-meta">
            <b>{title}</b>
            <span>nazarene.dev</span>
          </div>
        </div>
      </section>
      <section className="share-app share-app-wide">
        <h3>Browser tab and bookmark</h3>
        <div className="mock-browsers">
          <div className="mock-chrome-tab">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="" width={16} height={16} />
            <span>{title} | John Nazarene Dela Pisa</span>
            <i>×</i>
          </div>
          <div className="mock-safari-tab">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="" width={16} height={16} />
            <span>{title} | John Nazarene Dela Pisa</span>
          </div>
          <div className="mock-bookmark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="" width={16} height={16} />
            <span>{title}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Lists({ meta, doc }: { meta: Meta; doc: Draft }) {
  const date = doc.publishedAt ? new Date(doc.publishedAt) : new Date();
  const dm = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit" }).format(date);
  return (
    <div className="preview-lists article-shell">
      <section>
        <h3>Home page, Writing tab</h3>
        <div className="mock-home-row">
          <span>{meta.title || "Untitled"}</span>
          <time>{dm}</time>
        </div>
        {!meta.page ? <p className="field-help">Listed only: shown, but not a link.</p> : null}
      </section>
      <section>
        <h3>/writing</h3>
        <div className="article-more-row">
          <span className="article-more-name">
            {meta.title || "Untitled"}
            {meta.dek ? <span className="writing-row-dek">{meta.dek}</span> : null}
          </span>
          <time>{dm}</time>
        </div>
      </section>
      {meta.page ? (
        <section>
          <h3>Google</h3>
          <div className="preview-search">
            <span className="preview-url">nazarene.dev › writing › {meta.slug || "…"}</span>
            <span className="preview-title">{meta.title || "Untitled"} | John Nazarene Dela Pisa</span>
            <span className="preview-desc">
              {longDate.format(date)} — {meta.dek || "Add a standfirst; it's what search shows here."}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Markdown → the site's tree, with [[links]] resolved against the other posts. */
function useTree(body: string, active: boolean) {
  const [tree, setTree] = useState<Root | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void (async () => {
      const { posts } = await api.list().catch(() => ({ posts: [] }));
      setWikiResolver((name) => {
        const key = name.trim().toLowerCase();
        const p = posts.find((x) => x.title.trim().toLowerCase() === key || x.slug === key);
        return p?.slug ? { slug: p.slug } : undefined;
      });
      const t = await markdownToTree(body);
      if (live) setTree(t);
    })();
    return () => {
      live = false;
    };
  }, [active, body]);
  return tree;
}

/**
 * The editor's "Page" view: the post as the site renders it, in place of
 * the editable page, at the window's own width. Read it the way a reader
 * will; switch back to Edit (⌘E) to change it.
 */
export function PageView({ meta, body, doc }: { meta: Meta; body: string; doc: Draft }) {
  const tree = useTree(body, true);
  return <div className="page-view">{tree ? <Article meta={meta} tree={tree} doc={{ ...doc, body }} /> : <p className="palette-empty">Rendering…</p>}</div>;
}

/* ── The sheet ───────────────────────────────────────────────────────── */

export default function PreviewSheet({
  open,
  onClose,
  meta,
  body,
  doc,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  meta: Meta;
  body: string;
  doc: Draft;
  onPublish: () => void;
}) {
  const [tab, setTab] = useState<"page" | "lists" | "share">("page");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const tree = useTree(body, open);

  const size = useMemo(() => (device === "desktop" ? { width: 1280, height: 900 } : { width: 393, height: 852 }), [device]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant="center" />
        <Dialog.Popup className="sheet preview-sheet" data-variant="full">
          <header className="preview-head">
            <div className="admin-segments" role="tablist" aria-label="Preview">
              {(["page", "lists", "share"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className="admin-segment" onClick={() => setTab(t)}>
                  {t === "page" ? "Page" : t === "lists" ? "In lists" : "When shared"}
                </button>
              ))}
            </div>
            {tab === "page" ? (
              <div className="admin-segments" role="radiogroup" aria-label="Device">
                <button type="button" role="radio" aria-checked={device === "desktop"} className="admin-segment" onClick={() => setDevice("desktop")} aria-label="Laptop">
                  <DesktopTower size={14} />
                </button>
                <button type="button" role="radio" aria-checked={device === "phone"} className="admin-segment" onClick={() => setDevice("phone")} aria-label="Phone">
                  <DeviceMobile size={14} />
                </button>
              </div>
            ) : null}
            <div className="preview-actions">
              <Dialog.Close className="admin-button admin-button-quiet">Keep editing</Dialog.Close>
              <button
                type="button"
                className="admin-button admin-button-primary"
                data-keycap
                onClick={() => {
                  onClose();
                  onPublish();
                }}
              >
                {doc.liveSlug ? "Publish changes…" : "Publish…"}
              </button>
            </div>
          </header>
          <div className="preview-body" data-tab={tab}>
            {tab === "page" ? (
              tree ? (
                <div className="preview-device" data-device={device}>
                  <Frame key={device} width={size.width} height={size.height}>
                    <Article meta={meta} tree={tree} doc={{ ...doc, body }} />
                  </Frame>
                </div>
              ) : (
                <p className="palette-empty">Rendering…</p>
              )
            ) : tab === "lists" ? (
              <Lists meta={meta} doc={doc} />
            ) : (
              <Shares meta={meta} />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
