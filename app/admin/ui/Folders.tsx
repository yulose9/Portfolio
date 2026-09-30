"use client";
import { useEffect, useState } from "react";
import {
  FolderSimple,
  Plus,
  Trash,
  PencilSimple,
  DotsSixVertical,
} from "@phosphor-icons/react";
import { api, type PostSummary } from "./api";
import type { Folders as Value, FolderAction } from "../../../cms/folders";
import AdminSelect from "./AdminSelect";
export default function Folders({
  pages,
  currentId,
  beforeMove,
}: {
  pages: PostSummary[];
  currentId?: string;
  beforeMove?: () => Promise<boolean>;
}) {
  const [state, setState] = useState<{
      value: Value;
      base: string | null;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [active, setActive] = useState<string | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    api
      .folders()
      .then((r) => {
        if (live) setState(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  const act = async (action: FolderAction) => {
    if (!state || busy) return;
    setBusy(true);
    setError("");
    try {
      if (beforeMove && !(await beforeMove()))
        throw new Error("Save or recover your page first.");
      setState(await api.changeFolder(action, state.base));
      setName("");
      setEditing(null);
      if (action.type === "remove") setActive(null);
      setMessage(
        action.type === "move" ? "Page folder updated." : "Folders updated.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update folders.");
    } finally {
      setBusy(false);
    }
  };
  const drop = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("application/x-writing-page");
    if (pages.some((p) => p.id === pageId))
      void act({ type: "move", pageId, folderId: id });
  };
  return (
    <section className="folder-workspace" aria-label="Folders">
      <p className="field-help">
        Folders organize your workspace without changing page links. Removing a
        folder keeps its pages.
      </p>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="admin-button"
            onClick={() =>
              void api
                .folders()
                .then((r) => {
                  setState(r);
                  setError("");
                })
                .catch((e) => setError(e.message))
            }
          >
            Refresh folders
          </button>
        </p>
      ) : null}
      <form
        className="folder-create"
        onSubmit={(e) => {
          e.preventDefault();
          void act(
            editing
              ? { type: "rename", id: editing, name }
              : { type: "create", id: crypto.randomUUID(), name },
          );
        }}
      >
        <input
          aria-label="Folder name"
          placeholder={editing ? "Rename folder" : "New folder"}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="admin-button"
          disabled={busy || !state || !name.trim()}
        >
          <Plus size={14} />
          {editing ? "Save" : "Create"}
        </button>
        {editing ? (
          <button
            type="button"
            className="admin-button"
            onClick={() => {
              setEditing(null);
              setName("");
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>
      {currentId && state ? (
        <AdminSelect
          label="This page’s folder"
          value={state.value.assignments[currentId] ?? ""}
          onValueChange={(id) =>
            void act({ type: "move", pageId: currentId, folderId: id || null })
          }
          options={[
            { value: "", label: "Unfiled" },
            ...state.value.folders.map((f) => ({ value: f.id, label: f.name })),
          ]}
          disabled={busy}
        />
      ) : null}
      <div className="folder-rows">
        <button
          className="folder-row"
          aria-pressed={!active}
          onClick={() => setActive(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, null)}
        >
          <FolderSimple size={16} />
          Unfiled
        </button>
        {state?.value.folders.map((f) => (
          <div
            className="folder-row"
            key={f.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, f.id)}
          >
            <button
              aria-pressed={active === f.id}
              onClick={() => setActive(f.id)}
            >
              <FolderSimple size={16} />
              {f.name}
            </button>
            <button
              className="admin-icon-button"
              aria-label={`Rename ${f.name}`}
              onClick={() => {
                setEditing(f.id);
                setName(f.name);
              }}
            >
              <PencilSimple size={14} />
            </button>
            <button
              className="admin-icon-button"
              disabled={busy}
              aria-label={`Delete folder ${f.name}`}
              onClick={() => void act({ type: "remove", id: f.id })}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>
      {!currentId && state ? (
        <div className="folder-pages">
          {pages
            .filter(
              (p) =>
                !p.trashedAt &&
                (state.value.assignments[p.id] ?? null) === active,
            )
            .map((p) => (
              <div
                key={p.id}
                className="folder-page"
                draggable={!busy}
                onDragStart={(e) =>
                  e.dataTransfer.setData("application/x-writing-page", p.id)
                }
              >
                <DotsSixVertical size={15} />
                <span>{p.title || "Untitled"}</span>
                <AdminSelect
                  label={`Folder for ${p.title || "Untitled"}`}
                  value={active ?? ""}
                  onValueChange={(id) =>
                    void act({
                      type: "move",
                      pageId: p.id,
                      folderId: id || null,
                    })
                  }
                  options={[
                    { value: "", label: "Unfiled" },
                    ...state.value.folders.map((f) => ({
                      value: f.id,
                      label: f.name,
                    })),
                  ]}
                  disabled={busy}
                />
              </div>
            ))}
        </div>
      ) : null}
      <p role="status" className="field-help">
        {message}
      </p>
    </section>
  );
}
