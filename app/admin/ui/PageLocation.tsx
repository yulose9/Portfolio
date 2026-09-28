"use client";
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ancestors, canParent } from "../../../cms/page-tree";
import { api, type PostSummary } from "./api";
import AdminSelect from "./AdminSelect";
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
    if (!(await beforeSave())) {
      setError("Save this page before moving it.");
      return;
    }
    setMoving(true);
    setError("");
    try {
      const current = pages.find((p) => p.id === id);
      await api.movePage(id, parent || null, current?.parentId ?? null);
      setPages((p) =>
        p.map((row) =>
          row.id === id ? { ...row, parentId: parent || null } : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move page.");
    } finally {
      setMoving(false);
    }
  };
  return (
    <div className="page-location">
      <nav aria-label="Page breadcrumbs">
        {ancestors(pages, id).map((p) => (
          <button key={p.id} type="button" onClick={() => void go(p.id)}>
            {p.title || "Untitled"} /
          </button>
        ))}
        <span>{pages.find((p) => p.id === id)?.title || "Current page"}</span>
      </nav>
      <details>
        <summary>Move page</summary>
        <div className="page-move">
          <AdminSelect
            label="Parent page"
            value={parent}
            onValueChange={setParent}
            options={[
              { value: "", label: "Top level" },
              ...pages
                .filter((p) => canParent(pages, id, p.id))
                .map((p) => ({ value: p.id, label: p.title || "Untitled" })),
            ]}
          />
          <button
            type="button"
            className="admin-button"
            disabled={moving}
            onClick={() => void move()}
          >
            Move
          </button>
        </div>
      </details>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
