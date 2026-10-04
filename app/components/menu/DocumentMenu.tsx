"use client";

import {
  ArrowSquareOut,
  ArrowUp,
  BookOpenText,
  Code,
  Copy,
  Cursor,
  DownloadSimple,
  EnvelopeSimple,
  Hash,
  ImageSquare,
  LinkSimple,
  MagnifyingGlass,
  MarkdownLogo,
  Paragraph,
  Printer,
  Quotes,
  Rows,
  SpeakerHigh,
  SpeakerSlash,
  Table,
  ThreadsLogo,
  XLogo,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { copy, openEmail, openUrl, searchWeb } from "./actions";
import { peersHidden, setPeersHidden } from "../PeerCursors";
import { snippet, toast } from "../../lib/toast";

const I = 15;
const clip = (s: string, n = 32) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const SINGLE_WORD = /^[\p{L}'’-]{2,}$/u;
const READING_TOAST = "document-read-aloud";

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="menu-item"
      data-menu-item=""
      onClick={onClick}
    >
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
const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="menu-label" aria-hidden="true">
    {children}
  </div>
);

type Target =
  | { kind: "selection"; text: string }
  | { kind: "row"; key: string; details: string; tr: HTMLTableRowElement; table: HTMLTableElement | null }
  | { kind: "table"; table: HTMLTableElement }
  | { kind: "heading"; id: string; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; code: string; isBlock: boolean; lang?: string }
  | { kind: "link"; href: string; text: string }
  | { kind: "list-item"; text: string }
  | { kind: "image"; img: HTMLImageElement }
  | { kind: "none" };

function tableRows(table: HTMLTableElement): string[][] {
  return [...table.rows].map((r) =>
    [...r.cells].map((c) => c.innerText.trim().replace(/\s+/g, " "))
  );
}

function tableMarkdown(table: HTMLTableElement): string {
  const rows = tableRows(table);
  if (!rows.length) return "";
  const line = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
  return [line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n");
}

function tableTsv(table: HTMLTableElement): string {
  return tableRows(table)
    .map((r) => r.join("\t"))
    .join("\n");
}

async function copyImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    let png = blob;
    if (blob.type !== "image/png") {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      png = await new Promise<Blob>((r, j) =>
        canvas.toBlob((b) => (b ? r(b) : j(new Error("encode"))), "image/png")
      );
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    toast.add({
      type: "success",
      title: "Image copied",
      description: img.alt ? snippet(img.alt, 40) : "Copied as PNG to clipboard.",
      data: { image: src },
    });
  } catch {
    toast.add({
      type: "error",
      title: "Couldn’t copy the image",
      description: "Try “Copy image address” instead.",
    });
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

/** Text fragment URL: opens and scrolls directly to these highlighted words */
function fragmentUrl(url: string, text: string) {
  const words = text.replace(/\s+/g, " ").trim();
  const frag =
    words.length > 80
      ? `${encodeURIComponent(words.slice(0, 40).trim())},${encodeURIComponent(words.slice(-40).trim())}`
      : encodeURIComponent(words);
  return `${url}#:~:text=${frag}`;
}

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export default function DocumentMenu({
  children,
  title,
  url,
}: {
  children: ReactNode;
  title: string;
  url: string;
}) {
  const [target, setTarget] = useState<Target>({ kind: "none" });
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [hidePeers, setHidePeers] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = (restore = false) => {
    setAt(null);
    if (restore) returnTo.current?.focus({ preventScroll: true });
  };

  const stopReading = () => {
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeaking(false);
    toast.close(READING_TOAST);
  };

  const readAloud = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (synth.speaking) return stopReading();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en";
    utterance.rate = 1;
    utterance.onend = utterance.onerror = () => {
      setSpeaking(false);
      toast.close(READING_TOAST);
    };
    synth.speak(utterance);
    setSpeaking(true);
    toast.add({
      id: READING_TOAST,
      type: "info",
      title: "Reading paragraph aloud",
      description: snippet(text, 44),
      timeout: 0,
      actionProps: { children: "Stop", onClick: stopReading },
    });
  };

  // Clean up speech synthesis when component unmounts or page navigates
  useEffect(() => {
    return () => {
      if (canSpeak()) window.speechSynthesis.cancel();
      toast.close(READING_TOAST);
    };
  }, []);

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
      const items = [
        ...(popup.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]") ?? []),
      ];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const last = items.length - 1;
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "Tab") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[i < 0 || i === last ? 0 : i + 1]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[i <= 0 ? last : i - 1]?.focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        items[e.key === "Home" ? 0 : last]?.focus();
      } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
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
    if (!window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches) return;
    e.preventDefault();
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAt({ x: e.clientX, y: e.clientY });
    setHidePeers(peersHidden());
    setSpeaking(canSpeak() && window.speechSynthesis.speaking);

    const el = e.target as Element;
    const text = window.getSelection()?.toString().trim() ?? "";
    if (text) return setTarget({ kind: "selection", text });

    // 1. Table row check: right-clicking any row inside the cookies table
    const tr = el.closest<HTMLTableRowElement>("tr");
    if (tr && tr.closest("tbody")) {
      const cells = [...tr.cells].map((c) => c.innerText.trim().replace(/\s+/g, " "));
      const key = cells[0] || "";
      const details = cells.join(" · ");
      const table = tr.closest<HTMLTableElement>("table");
      return setTarget({ kind: "row", key, details, tr, table });
    }

    // 2. Table outside body (e.g. table header or container)
    const table = el.closest<HTMLTableElement>("table");
    if (table) return setTarget({ kind: "table", table });

    // 3. Image check
    const img = el.closest("img");
    if (img) return setTarget({ kind: "image", img: img as HTMLImageElement });

    // 4. Code block or inline code chip
    const pre = el.closest<HTMLElement>("pre");
    if (pre) {
      return setTarget({
        kind: "code",
        code: pre.innerText.replace(/\n$/, ""),
        isBlock: true,
        lang: pre.dataset.language,
      });
    }
    const code = el.closest<HTMLElement>("code");
    if (code && !code.closest("pre")) {
      return setTarget({
        kind: "code",
        code: code.innerText.trim(),
        isBlock: false,
      });
    }

    // 5. Link check
    const link = el.closest<HTMLAnchorElement>("a[href]");
    if (link && !link.classList.contains("heading-anchor")) {
      return setTarget({
        kind: "link",
        href: link.href,
        text: link.textContent?.trim() ?? "",
      });
    }

    // 6. Heading check
    const heading = el.closest<HTMLElement>("h1[id], h2[id], h3[id], h4[id]");
    if (heading) {
      return setTarget({
        kind: "heading",
        id: heading.id,
        text: heading.innerText.replace(/#$/, "").trim(),
      });
    }

    // 7. List item check
    const li = el.closest<HTMLLIElement>("li");
    if (li && !li.closest("nav") && !li.closest(".breadcrumbs")) {
      return setTarget({ kind: "list-item", text: li.innerText.trim() });
    }

    // 8. Paragraph check
    const p = el.closest<HTMLParagraphElement>("p");
    if (p) {
      return setTarget({ kind: "paragraph", text: p.innerText.trim() });
    }

    setTarget({ kind: "none" });
  };

  const t = target;
  const word = t.kind === "selection" && SINGLE_WORD.test(t.text) ? t.text : "";
  const share = (text: string) => ({
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    threads: `https://www.threads.com/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`,
  });

  const menu = (
    <div
      ref={popup}
      role="menu"
      aria-label={`${title} context menu`}
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
          <MenuItem
            icon={<Quotes size={I} />}
            onClick={() =>
              void copy(`“${t.text}”\n— ${title}, ${url}`, "Quote copied with its link")
            }
          >
            Copy as quote
          </MenuItem>
          <MenuItem
            icon={<LinkSimple size={I} />}
            onClick={() =>
              void copy(fragmentUrl(url, t.text), "Link to this passage copied")
            }
          >
            Copy link to this passage
          </MenuItem>
          <MenuItem
            icon={<XLogo size={I} />}
            onClick={() => openUrl(share(`“${clip(t.text, 200)}”`).x, "X")}
          >
            Share quote on X
          </MenuItem>
          <MenuItem
            icon={<ThreadsLogo size={I} />}
            onClick={() => openUrl(share(`“${clip(t.text, 400)}”`).threads, "Threads")}
          >
            Share quote on Threads
          </MenuItem>
          {word ? (
            <MenuItem
              icon={<BookOpenText size={I} />}
              onClick={() => searchWeb(`define ${word}`, `Looking up “${word}”`)}
            >
              Define “{word}”
            </MenuItem>
          ) : (
            <MenuItem
              icon={<MagnifyingGlass size={I} />}
              onClick={() => searchWeb(t.text)}
            >
              Search the web for “{clip(t.text, 18)}”
            </MenuItem>
          )}
          <MenuItem
            icon={<EnvelopeSimple size={I} />}
            onClick={() =>
              openEmail(
                `Regarding ${title}`,
                `> ${t.text}\n\nHi John,\n\nI have a question about this part of the ${title.toLowerCase()}:\n`
              )
            }
          >
            Quote in an email
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "row" ? (
        <>
          <MenuLabel>Row: {clip(t.key, 28)}</MenuLabel>
          <MenuItem
            icon={<Copy size={I} />}
            onClick={() => void copy(t.key, "Cookie key copied", { description: t.key })}
          >
            Copy cookie name
          </MenuItem>
          <MenuItem
            icon={<Rows size={I} />}
            onClick={() => void copy(t.details, "Row details copied", { description: t.details })}
          >
            Copy row details
          </MenuItem>
          {t.table ? (
            <>
              <MenuItem
                icon={<MarkdownLogo size={I} />}
                onClick={() =>
                  void copy(tableMarkdown(t.table!), "Table copied as Markdown")
                }
              >
                Copy table as Markdown
              </MenuItem>
              <MenuItem
                icon={<Table size={I} />}
                onClick={() =>
                  void copy(tableTsv(t.table!), "Table copied for a spreadsheet")
                }
              >
                Copy table for spreadsheet
              </MenuItem>
            </>
          ) : null}
          <MenuSeparator />
        </>
      ) : t.kind === "table" ? (
        <>
          <MenuLabel>Table</MenuLabel>
          <MenuItem
            icon={<MarkdownLogo size={I} />}
            onClick={() =>
              void copy(tableMarkdown(t.table), "Table copied as Markdown")
            }
          >
            Copy table as Markdown
          </MenuItem>
          <MenuItem
            icon={<Table size={I} />}
            onClick={() =>
              void copy(tableTsv(t.table), "Table copied for a spreadsheet")
            }
          >
            Copy table for spreadsheet
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "heading" ? (
        <>
          <MenuLabel>{clip(t.text, 34)}</MenuLabel>
          <MenuItem
            icon={<Hash size={I} />}
            onClick={() =>
              void copy(`${url}#${t.id}`, "Link to section copied", {
                description: t.text,
              })
            }
          >
            Copy link to section
          </MenuItem>
          <MenuItem
            icon={<Copy size={I} />}
            onClick={() => void copy(t.text, "Heading copied")}
          >
            Copy heading
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "paragraph" ? (
        <>
          <MenuLabel>Paragraph</MenuLabel>
          <MenuItem
            icon={<Paragraph size={I} />}
            onClick={() => void copy(t.text, "Paragraph copied")}
          >
            Copy this paragraph
          </MenuItem>
          {canSpeak() ? (
            <MenuItem
              icon={speaking ? <SpeakerSlash size={I} /> : <SpeakerHigh size={I} />}
              onClick={() => (speaking ? stopReading() : readAloud(t.text))}
            >
              {speaking ? "Stop reading" : "Read paragraph aloud"}
            </MenuItem>
          ) : null}
          <MenuItem
            icon={<EnvelopeSimple size={I} />}
            onClick={() =>
              openEmail(
                `Regarding ${title}`,
                `> ${t.text}\n\nHi John,\n\nI have a question about this passage:\n`
              )
            }
          >
            Quote in an email
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "code" ? (
        <>
          <MenuLabel>Code{t.lang ? ` · ${t.lang}` : ""}</MenuLabel>
          <MenuItem
            icon={<Code size={I} />}
            onClick={() => void copy(t.code, "Code copied")}
          >
            Copy code
          </MenuItem>
          <MenuItem
            icon={<MarkdownLogo size={I} />}
            onClick={() =>
              void copy(
                t.isBlock ? `\`\`\`${t.lang ?? ""}\n${t.code}\n\`\`\`` : `\`${t.code}\``,
                "Copied as Markdown"
              )
            }
          >
            Copy as Markdown
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "list-item" ? (
        <>
          <MenuLabel>List Item</MenuLabel>
          <MenuItem
            icon={<Copy size={I} />}
            onClick={() => void copy(t.text, "Item copied")}
          >
            Copy bullet point
          </MenuItem>
          <MenuSeparator />
        </>
      ) : t.kind === "image" ? (
        <>
          <MenuLabel>Image</MenuLabel>
          <MenuItem icon={<ImageSquare size={I} />} onClick={() => t.img.click()}>
            View larger
          </MenuItem>
          <MenuItem
            icon={<ArrowSquareOut size={I} />}
            onClick={() => openUrl(t.img.currentSrc || t.img.src, "the image")}
          >
            Open image in new tab
          </MenuItem>
          <MenuItem icon={<Copy size={I} />} onClick={() => void copyImage(t.img)}>
            Copy image
          </MenuItem>
          <MenuItem
            icon={<LinkSimple size={I} />}
            onClick={() => {
              const src = new URL(t.img.src, location.href).toString();
              void copy(src, "Image address copied", {
                image: src,
                description: src.split("/").pop(),
              });
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
            <MenuItem
              icon={<Rows size={I} />}
              onClick={() => void copy(t.img.alt, "Description copied")}
            >
              Copy description
            </MenuItem>
          ) : null}
          <MenuSeparator />
        </>
      ) : t.kind === "link" ? (
        <>
          <MenuLabel>{clip(t.text || t.href, 32)}</MenuLabel>
          <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => (location.href = t.href)}>
            Open link
          </MenuItem>
          <MenuItem icon={<ArrowSquareOut size={I} />} onClick={() => openUrl(t.href)}>
            Open link in new tab
          </MenuItem>
          <MenuItem
            icon={<LinkSimple size={I} />}
            onClick={() => void copy(t.href, "Link address copied")}
          >
            Copy link address
          </MenuItem>
          <MenuSeparator />
        </>
      ) : null}

      <MenuLabel>{clip(title, 34)}</MenuLabel>
      <MenuItem
        icon={<LinkSimple size={I} />}
        onClick={() => void copy(url, "Page link copied", { description: url })}
      >
        Copy link to page
      </MenuItem>
      <MenuItem icon={<Printer size={I} />} onClick={() => window.print()}>
        Print or save as PDF
      </MenuItem>
      <MenuItem
        icon={<EnvelopeSimple size={I} />}
        onClick={() =>
          openEmail(
            `Inquiry regarding ${title}`,
            `Hi John,\n\nI am writing regarding the ${title} on ${url}.\n\n`
          )
        }
      >
        Email regarding this policy
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        icon={<Cursor size={I} />}
        onClick={() => setPeersHidden(!hidePeers)}
      >
        {hidePeers ? "Show other visitors’ cursors" : "Hide other visitors’ cursors"}
      </MenuItem>
      <MenuItem
        icon={<ArrowUp size={I} />}
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          })
        }
      >
        Back to top
      </MenuItem>
    </div>
  );

  return (
    <div className="document-menu-area w-full" onContextMenu={read}>
      {children}
      {at ? createPortal(menu, document.body) : null}
    </div>
  );
}
