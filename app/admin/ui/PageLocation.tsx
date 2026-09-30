"use client";
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ancestors, canParent } from "../../../cms/page-tree";
import { api, type PostSummary } from "./api";
import Sheet from "./Sheet";
import Folders from "./Folders";
import {
  FolderSimple,
  FolderOpen,
  ArrowRight,
  Check,
  CaretRight,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { recordRecentPage } from "./recent-pages";
export default function PageLocation({
  id,
  editor,
  beforeSave,
}: {
  id: string;
  editor: Editor | null;
  beforeSave: () => Promise<boolean>;
}) {
  const [pages, setPages] = useState<PostSummary[]>([]),
    [error, setError] = useState(""),
    [moving, setMoving] = useState(false),
    [parent, setParent] = useState("");
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    void api
      .list()
      .then((r) => {
        if (live) {
          setPages(r.posts);
          setParent(r.posts.find((p) => p.id === id)?.parentId ?? "");
        }
      })
      .catch(() => {
        if (live) setError("Page locations could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    if (!editor) return;
    recordRecentPage(id);
    const key = `writing-position:${id}`;
    const remember = () => {
      let blockId = "";
      const selection = editor.state.selection;
      for (let d = selection.$from.depth; d > 0; d--)
        if (selection.$from.node(d).attrs.blockId) {
          blockId = selection.$from.node(d).attrs.blockId;
          break;
        }
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({ blockId, scroll: window.scrollY }),
        );
      } catch {
        /* optional view preference */
      }
    };
    let frame = 0;
    try {
      const old = JSON.parse(sessionStorage.getItem(key) || "null");
      if (old && !new URLSearchParams(location.search).has("block")) {
        frame = requestAnimationFrame(() => {
          if (editor.isDestroyed) return;
          if (typeof old.blockId === "string")
            editor.state.doc.descendants((node, pos) => {
              if (node.attrs.blockId === old.blockId) {
                editor.commands.setTextSelection(
                  Math.min(pos + 1, editor.state.doc.content.size),
                );
                return false;
              }
            });
          window.scrollTo({
            top: Math.max(0, Number(old.scroll) || 0),
            behavior: "instant",
          });
        });
      }
    } catch {
      /* optional view preference */
    }
    editor.on("selectionUpdate", remember);
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", remember);
      window.removeEventListener("scroll", remember);
    };
  }, [editor, id]);
  const go = async (target: string) => {
    if (await beforeSave()) window.location.assign(`/admin?post=${target}`);
    else setError("Save or recover this page before navigating away.");
  };
  const move = async () => {
    if (moving) return;
    setMoving(true);
    setError("");
    try {
      if (!(await beforeSave()))
        throw new Error("Save or recover this page before moving it.");
      const current = pages.find((p) => p.id === id);
      await api.movePage(id, parent || null, current?.parentId ?? null);
      setPages((p) =>
        p.map((row) =>
          row.id === id ? { ...row, parentId: parent || null } : row,
        ),
      );
      setOpen(false);
      setMessage(
        `Moved to ${parent ? pages.find((p) => p.id === parent)?.title || "page" : "All writing"}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move page.");
    } finally {
      setMoving(false);
    }
  };
  const current = pages.find((p) => p.id === id),
    currentParent = current?.parentId ?? "";
  const destinations = pages.filter(
    (p) =>
      canParent(pages, id, p.id) &&
      p.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="page-location">
      <nav aria-label="Page breadcrumbs">
        {ancestors(pages, id).map((p) => (
          <button key={p.id} type="button" onClick={() => void go(p.id)}>
            {p.title || "Untitled"}
            <CaretRight size={12} aria-hidden />
          </button>
        ))}
        <span title={current?.title}>{current?.title || "Current page"}</span>
      </nav>
      <button
        type="button"
        className="admin-button admin-button-quiet page-move-trigger"
        disabled={!current}
        onClick={() => {
          setParent(currentParent);
          setQuery("");
          setError("");
          setOpen(true);
        }}
      >
        <FolderSimple size={15} />
        Move page
      </button>
      {!open && error ? <p role="alert">{error}</p> : null}
      {message ? (
        <p className="page-location-status" role="status">
          {message}
        </p>
      ) : null}
      <Sheet
        open={open}
        onClose={() => {
          if (!moving) setOpen(false);
        }}
        title="Move page"
        description="Choose where this page belongs. Its subpages move with it."
        variant="center"
        className="page-move-dialog"
      >
        <details className="folder-disclosure"><summary>Organize in a folder</summary>{open?<Folders pages={pages} currentId={id} beforeMove={beforeSave}/>:null}</details>
        <label className="picker-search">
          <MagnifyingGlass size={16} />
          <input
            type="search"
            aria-label="Find destination"
            placeholder="Find a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={moving}
          />
        </label>
        <div
          className="page-destinations"
          role="group"
          aria-label="Destination"
          data-lenis-prevent
        >
          {[{ id: "", title: "All writing" }, ...destinations].map((p) => (
            <button
              key={p.id}
              type="button"
              className="page-destination"
              aria-pressed={parent === p.id}
              disabled={moving}
              onClick={() => setParent(p.id)}
            >
              {p.id ? <FolderSimple size={18} /> : <FolderOpen size={18} />}
              <span>
                <strong>{p.title || "Untitled"}</strong>
                <small>
                  {p.id
                    ? ancestors(pages, p.id)
                        .map((a) => a.title || "Untitled")
                        .join(" / ") || "All writing"
                    : "Top level"}
                  {p.id === currentParent ? " · Current location" : ""}
                </small>
              </span>
              {parent === p.id ? <Check size={16} /> : null}
            </button>
          ))}
          {!destinations.length && query ? (
            <p className="field-help">
              No matching pages. You can still move to All writing.
            </p>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        <div className="picker-footer">
          <button
            type="button"
            className="admin-button admin-button-quiet"
            disabled={moving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-button admin-button-primary"
            disabled={moving || parent === currentParent}
            onClick={() => void move()}
          >
            {moving ? "Moving…" : "Move here"}
            <ArrowRight size={14} />
          </button>
        </div>
      </Sheet>
    </div>
  );
}
