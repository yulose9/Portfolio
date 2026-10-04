"use client";

import {
  ArrowSquareOut,
  ArrowUp,
  Code,
  Copy,
  DownloadSimple,
  FacebookLogo,
  Hash,
  ImageSquare,
  LinkSimple,
  LinkedinLogo,
  MagnifyingGlass,
  MarkdownLogo,
  Pause,
  Play,
  Printer,
  Quotes,
  Rows,
  Table,
  Tag as TagIcon,
  ThreadsLogo,
  XLogo,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { copy, openUrl, searchWeb } from "../menu/actions";
import { snippet, toast } from "../../lib/toast";

/*
 * Right-click anywhere in an article and the menu fits what's under the
 * pointer, then always offers the article itself:
 *
 *   selected words  copy, copy as a quote with the link, a link that
 *                   scrolls to and highlights exactly those words, share
 *                   the quote on X or Threads, search the web
 *   a heading       copy a link to that section
 *   an image        open it large, copy it, copy its address, download,
 *                   copy its alt text
 *   code            copy the code, or as a Markdown block
 *   a link          open, open in a new tab, copy the address
 *   video / audio   play or pause, download
 *   an embed        open the original post
 *   a table         copy as Markdown, or as tab-separated values
 *   a tag           every post with that tag
 *
 * Off on touch, where a long press belongs to the system's own selection.
 *
 * It's a small menu of its own rather than the Base UI one the home page
 * uses: an article should load light, and this needs none of a full menu
 * system's machinery. It keeps the same material (.menu-popup), grows from
 * the pointer, and does arrow keys, Enter, Escape and click-away.
 */

function MenuItem({ icon, children, onClick }: { icon?: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className="menu-item" data-menu-item="" onClick={onClick}>
      {icon ? (
        <span className="menu-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
const MenuSeparator = () => <div role="separator" className="menu-separator" />;
// Visual context only: inside role="menu" only items belong, so the label is
// hidden from assistive tech and the menu carries its own name instead.
const MenuLabel = ({ children }: { children: ReactNode }) => <div className="menu-label" aria-hidden="true">{children}</div>;

type Target =
  | { kind: "selection"; text: string }
  | { kind: "heading"; id: string; text: string }
  | { kind: "image"; img: HTMLImageElement }
  | { kind: "code"; pre: HTMLElement }
  | { kind: "link"; href: string; text: string }
  | { kind: "media"; el: HTMLMediaElement }
  | { kind: "embed"; href: string }
  | { kind: "table"; table: HTMLTableElement }
  | { kind: "tag"; href: string; name: string }
  | { kind: "none" };

const I = 15;
const clip = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function tableRows(table: HTMLTableElement): string[][] {
  return [...table.rows].map((r) => [...r.cells].map((c) => c.innerText.trim().replace(/\s+/g, " ")));
}
function tableMarkdown(table: HTMLTableElement): string {
  const rows = tableRows(table);
  if (!rows.length) return "";
  const line = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
  return [line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n");
}

async function copyImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    // Clipboards take PNG everywhere; convert anything else through a canvas.
    let png = blob;
    if (blob.type !== "image/png") {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      png = await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("encode"))), "image/png"));
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    toast.add({
      type: "success",
      title: "Image copied",
      description: img.alt ? snippet(img.alt, 42) : "Copied as PNG to clipboard.",
      data: { image: src },
    });
  } catch {
    toast.add({ type: "error", title: "Couldn’t copy the image", description: "Try “Copy image address” instead." });
  }
}

function download(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = href.split("/").pop() ?? "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** A text-fragment link: opening it scrolls to and highlights exactly these words. */
function fragmentUrl(url: string, text: string) {
  const words = text.replace(/\s+/g, " ").trim();
  const frag =
    words.length > 80
      ? `${encodeURIComponent(words.slice(0, 40).trim())},${encodeURIComponent(words.slice(-40).trim())}`
      : encodeURIComponent(words);
  return `${url}#:~:text=${frag}`;
}

export default function ArticleMenu({ children, title, url, markdownUrl }: { children: ReactNode; title: string; url: string; markdownUrl: string }) {
  const [target, setTarget] = useState<Target>({ kind: "none" });
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  // Where focus was when the menu opened, so Escape can put it back.
  const returnTo = useRef<HTMLElement | null>(null);

  const close = (restore = false) => {
    setAt(null);
    if (restore) returnTo.current?.focus({ preventScroll: true });
  };

  // Keep it on screen, then focus it so the arrow keys work at once.
  useLayoutEffect(() => {
    const el = popup.current;
    if (!at || !el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(at.x, window.innerWidth - r.width - 8);
    const y = at.y + r.height > window.innerHeight - 8 ? Math.max(8, at.y - r.height) : at.y;
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${y}px`;
    el.style.transformOrigin = `${at.x - x}px ${y < at.y ? r.height : 0}px`;
    el.focus();
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const away = (e: Event) => {
      if (popup.current && !popup.current.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => {
      const items = [...(popup.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]") ?? [])];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const last = items.length - 1;
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "Tab") {
        // A menu is one stop: Tab leaves it, and leaving closes it.
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[i < 0 || i === last ? 0 : i + 1]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        // From nothing focused, Up goes to the last item, not the one before it.
        items[i <= 0 ? last : i - 1]?.focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        items[e.key === "Home" ? 0 : last]?.focus();
      } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Typeahead: the next item whose label starts with that letter.
        const ch = e.key.toLowerCase();
        const order = [...items.slice(i + 1), ...items.slice(0, i + 1)];
        order.find((it) => it.textContent?.trim().toLowerCase().startsWith(ch))?.focus();
      }
    };
    const onScroll = () => close();
    const onBlur = () => close();
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", key);
    };
  }, [at]);

  const read = (e: React.MouseEvent) => {
    // Touch keeps the system's own long-press behaviour.
    if (!window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches) return;
    e.preventDefault();
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAt({ x: e.clientX, y: e.clientY });
    const el = e.target as Element;
    const text = window.getSelection()?.toString().trim() ?? "";
    if (text) return setTarget({ kind: "selection", text });
    const img = el.closest("img");
    if (img && img.closest(".article")) return setTarget({ kind: "image", img: img as HTMLImageElement });
    const media = el.closest("video, .voice")?.closest("figure")?.querySelector<HTMLMediaElement>("video, audio");
    if (media) return setTarget({ kind: "media", el: media });
    const tag = el.closest<HTMLAnchorElement>("a.tag");
    if (tag) return setTarget({ kind: "tag", href: tag.href, name: tag.textContent?.trim() ?? "" });
    const link = el.closest<HTMLAnchorElement>("a[href]");
    if (link && !link.classList.contains("heading-anchor")) return setTarget({ kind: "link", href: link.href, text: link.textContent?.trim() ?? "" });
    const pre = el.closest<HTMLElement>("pre");
    if (pre) return setTarget({ kind: "code", pre });
    const table = el.closest("table");
    if (table) return setTarget({ kind: "table", table: table as HTMLTableElement });
    const embed = el.closest(".embed");
    if (embed) {
      const href = embed.querySelector<HTMLAnchorElement>("a[href*='x.com'], a[href*='threads'], a[href*='twitter.com']")?.href ?? embed.querySelector("iframe")?.src ?? "";
      if (href) return setTarget({ kind: "embed", href });
    }
    const heading = el.closest<HTMLElement>(".article-body h2[id], .article-body h3[id], .article-body h4[id]");
    if (heading) return setTarget({ kind: "heading", id: heading.id, text: heading.innerText.replace(/#$/, "").trim() });
    setTarget({ kind: "none" });
  };

  const t = target;
  const share = (text: string) => ({
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    threads: `https://www.threads.com/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`,
  });

  const menu = (
          <div
            ref={popup}
            role="menu"
            aria-label="Article"
            tabIndex={-1}
            className="menu-popup article-menu"
            onClick={(e) => {
              if ((e.target as Element).closest("[data-menu-item]")) close(true);
            }}
          >
            {t.kind === "selection" ? (
              <>
                <MenuLabel>“{clip(t.text, 34)}”</MenuLabel>
                <MenuItem icon={<Copy size={I} />} onClick={() => void copy(t.text, "Copied")}>
                  Copy
                </MenuItem>
                <MenuItem icon={<Quotes size={I} />} onClick={() => void copy(`“${t.text}”\n— ${title}, ${url}`, "Quote copied with its link")}>
                  Copy as quote
                </MenuItem>
                <MenuItem icon={<LinkSimple size={I} />} onClick={() => void copy(fragmentUrl(url, t.text), "Link to this passage copied")}>
                  Copy link to this passage
                </MenuItem>
                <MenuItem icon={<XLogo size={I} />} onClick={() => openUrl(share(`“${clip(t.text, 200)}”`).x, "X")}>
                  Share quote on X
                </MenuItem>
                <MenuItem icon={<ThreadsLogo size={I} />} onClick={() => openUrl(share(`“${clip(t.text, 400)}”`).threads, "Threads")}>
                  Share quote on Threads
                </MenuItem>
                <MenuItem icon={<MagnifyingGlass size={I} />} onClick={() => searchWeb(t.text)}>
                  Search the web for “{clip(t.text, 18)}”
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "heading" ? (
              <>
                <MenuLabel>{clip(t.text, 34)}</MenuLabel>
                <MenuItem icon={<Hash size={I} />} onClick={() => void copy(`${url}#${t.id}`, "Link to this section copied")}>
                  Copy link to this section
                </MenuItem>
                <MenuItem icon={<Copy size={I} />} onClick={() => void copy(t.text, "Heading copied")}>
                  Copy heading
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "image" ? (
              <>
                <MenuLabel>Image</MenuLabel>
                <MenuItem icon={<ImageSquare size={I} />} onClick={() => t.img.click()}>
                  View larger
                </MenuItem>
                <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => openUrl(t.img.currentSrc || t.img.src, "the image")}>
                  Open image in new tab
                </MenuItem>
                <MenuItem icon={<Copy size={I} />} onClick={() => void copyImage(t.img)}>
                  Copy image
                </MenuItem>
                <MenuItem
                  icon={<LinkSimple size={I} />}
                  onClick={() => {
                    const src = new URL(t.img.src, location.href).toString();
                    void copy(src, "Image address copied", { image: src, description: src.split("/").pop() });
                  }}
                >
                  Copy image address
                </MenuItem>
                <MenuItem
                  icon={<DownloadSimple size={I} />}
                  onClick={() => {
                    download(t.img.src);
                    toast.add({
                      type: "info",
                      title: "Downloading image",
                      description: t.img.src.split("/").pop(),
                      data: { image: t.img.currentSrc || t.img.src },
                    });
                  }}
                >
                  Download image
                </MenuItem>
                {t.img.alt ? (
                  <MenuItem icon={<Rows size={I} />} onClick={() => void copy(t.img.alt, "Description copied")}>
                    Copy description
                  </MenuItem>
                ) : null}
                <MenuSeparator />
              </>
            ) : t.kind === "code" ? (
              <>
                <MenuLabel>Code{t.pre.dataset.language ? ` · ${t.pre.dataset.language}` : ""}</MenuLabel>
                <MenuItem icon={<Code size={I} />} onClick={() => void copy(t.pre.innerText.replace(/\n$/, ""), "Code copied")}>
                  Copy code
                </MenuItem>
                <MenuItem
                  icon={<MarkdownLogo size={I} />}
                  onClick={() => void copy(`\`\`\`${t.pre.dataset.language ?? ""}\n${t.pre.innerText.replace(/\n$/, "")}\n\`\`\``, "Copied as a Markdown code block")}
                >
                  Copy as Markdown
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "link" ? (
              <>
                <MenuLabel>{clip(t.text || t.href, 34)}</MenuLabel>
                <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => (location.href = t.href)}>
                  Open link
                </MenuItem>
                <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => openUrl(t.href)}>
                  Open in new tab
                </MenuItem>
                <MenuItem icon={<LinkSimple size={I} />} onClick={() => void copy(t.href, "Link address copied")}>
                  Copy link address
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "media" ? (
              <>
                <MenuLabel>{t.el.tagName === "AUDIO" ? "Audio" : "Video"}</MenuLabel>
                <MenuItem icon={t.el.paused ? <Play size={I} /> : <Pause size={I} />} onClick={() => (t.el.paused ? void t.el.play() : t.el.pause())}>
                  {t.el.paused ? "Play" : "Pause"}
                </MenuItem>
                <MenuItem icon={<DownloadSimple size={I} />} onClick={() => download(t.el.currentSrc || t.el.src)}>
                  Download
                </MenuItem>
                <MenuItem icon={<LinkSimple size={I} />} onClick={() => void copy(new URL(t.el.currentSrc || t.el.src, location.href).toString(), "Address copied")}>
                  Copy address
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "embed" ? (
              <>
                <MenuLabel>Embedded post</MenuLabel>
                <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => openUrl(t.href)}>
                  Open original
                </MenuItem>
                <MenuItem icon={<LinkSimple size={I} />} onClick={() => void copy(t.href, "Link copied")}>
                  Copy link
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "table" ? (
              <>
                <MenuLabel>Table</MenuLabel>
                <MenuItem icon={<MarkdownLogo size={I} />} onClick={() => void copy(tableMarkdown(t.table), "Table copied as Markdown")}>
                  Copy as Markdown
                </MenuItem>
                <MenuItem icon={<Table size={I} />} onClick={() => void copy(tableRows(t.table).map((r) => r.join("\t")).join("\n"), "Table copied for a spreadsheet")}>
                  Copy for a spreadsheet
                </MenuItem>
                <MenuSeparator />
              </>
            ) : t.kind === "tag" ? (
              <>
                <MenuLabel>{t.name}</MenuLabel>
                <MenuItem icon={<TagIcon size={I} />} onClick={() => (location.href = t.href)}>
                  Everything tagged {t.name}
                </MenuItem>
                <MenuSeparator />
              </>
            ) : null}

            <MenuLabel>{clip(title, 34)}</MenuLabel>
            <MenuItem icon={<LinkSimple size={I} />} onClick={() => void copy(url, "Link copied")}>
              Copy link to this article
            </MenuItem>
            <MenuItem icon={<MarkdownLogo size={I} />} onClick={() => void fetch(markdownUrl).then((r) => r.text()).then((md) => copy(md, "Article copied as Markdown"))}>
              Copy as Markdown
            </MenuItem>
            <MenuItem icon={<XLogo size={I} />} onClick={() => openUrl(share(title).x, "X")}>
              Share on X
            </MenuItem>
            <MenuItem icon={<ThreadsLogo size={I} />} onClick={() => openUrl(share(title).threads, "Threads")}>
              Share on Threads
            </MenuItem>
            <MenuItem icon={<LinkedinLogo size={I} />} onClick={() => openUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "LinkedIn")}>
              Share on LinkedIn
            </MenuItem>
            <MenuItem icon={<FacebookLogo size={I} />} onClick={() => openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "Facebook")}>
              Share on Facebook
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Printer size={I} />} onClick={() => window.print()}>
              Print or save as PDF
            </MenuItem>
            <MenuItem icon={<ArrowUp size={I} />} onClick={() =>
              window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
            }>
              Back to top
            </MenuItem>
          </div>
  );

  return (
    <div className="article-menu-area" onContextMenu={read}>
      {children}
      {at ? createPortal(menu, document.body) : null}
    </div>
  );
}
