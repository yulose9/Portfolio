"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { SelectionBookmark } from "@tiptap/pm/state";
import { api, type Draft } from "./api";
import type { ResearchItem } from "../../../cms/research";
import Sheet from "./Sheet";
import { PageView } from "./PreviewSheet";
import { selectionMarkdown, currentBlock } from "./commands";
import { toast } from "../../lib/toast";
import { usePulse } from "./live";
import { useResearchForm } from "./use-research-form";

export const PEEK_EVENT = "writing:peek";
type Refs = Awaited<ReturnType<typeof api.references>>;
type EditItem = Partial<ResearchItem> &
  Pick<ResearchItem, "id" | "kind" | "title" | "body">;

/** Page references and private research share a panel, never a publication payload. */
export default function ResearchPanel({
  open,
  onClose,
  doc,
  editor,
  beforeSave,
}: {
  open: boolean;
  onClose: () => void;
  doc: Draft;
  editor: Editor | null;
  beforeSave: () => Promise<boolean>;
}) {
  const [tab, setTab] = useState<"links" | "library" | "review">("links");
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useResearchForm<EditItem>(`research-form:${doc.id}`);
  const [peek, setPeekId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Draft | null>(null);
  const [previewError, setPreviewError] = useState("");
  const setPeek = useCallback((id: string | null) => {
    setPeekId(id);
    setPreview(null);
    setPreviewError("");
  }, []);
  const [hasSelection, setHasSelection] = useState(false);
  const [filter, setFilter] = useState("");
  const [published, setPublished] = useState<Awaited<
    ReturnType<typeof api.publishedSource>
  > | null>(null);
  const bookmark = useRef<SelectionBookmark | null>(null);
  const selection = useRef({
    body: "",
    blockId: undefined as string | undefined,
  });
  const extraction = useRef<{ body: string; requestId: string } | null>(null);
  useEffect(() => {
    if (!editor) return;
    const capture = () => {
      bookmark.current = editor.state.selection.getBookmark();
      selection.current = {
        body: editor.state.selection.empty ? "" : selectionMarkdown(editor),
        blockId: currentBlock(editor)?.node.attrs.blockId,
      };
      setHasSelection(!editor.state.selection.empty);
    };
    const update = () => {
      if (editor.isFocused) capture();
    };
    const map = ({
      transaction,
    }: {
      transaction: import("@tiptap/pm/state").Transaction;
    }) => {
      bookmark.current = bookmark.current?.map(transaction.mapping) ?? null;
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", map);
    editor.on("focus",capture);
    editor.on("update",update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", map);
      editor.off("focus",capture);
      editor.off("update",update);
    };
  }, [editor]);
  const refresh = useCallback(async () => {
    try {
      const [r, library] = await Promise.all([
        api.references(doc.id),
        api.research(),
      ]);
      setError("");
      setRefs(r);
      setItems(library.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load research.");
    }
  }, [doc.id]);
  useEffect(() => {
    let alive = true;
    if (open)
      void Promise.all([api.references(doc.id), api.research()])
        .then(([r, library]) => {
          if (alive) {
            setRefs(r);
            setItems(library.items);
            setError("");
          }
        })
        .catch((e) => {
          if (alive)
            setError(
              e instanceof Error ? e.message : "Could not load research.",
            );
        });
    return () => {
      alive = false;
    };
  }, [open, doc.id]);
  usePulse(() => {
    if (open) void refresh();
  });
  useEffect(() => {
    const listener = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (/^[a-z0-9]{12}$/.test(id)) setPeek(id);
    };
    window.addEventListener(PEEK_EVENT, listener);
    return () => window.removeEventListener(PEEK_EVENT, listener);
  }, [setPeek]);
  useEffect(() => {
    let alive = true;
    if (peek)
      void api
        .get(peek)
        .then(({ post }) => {
          if (alive) {
            setPreviewError("");
            if (post.trashedAt) {
              setPreview(null);
              setPreviewError("This page is in Trash.");
            } else setPreview(post);
          }
        })
        .catch((e) => {
          if (alive) {
            setPreview(null);
            setPreviewError(e.message);
          }
        });
    return () => {
      alive = false;
    };
  }, [peek]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete that action.",
      );
    } finally {
      setBusy(false);
    }
  };
  const make = (kind: ResearchItem["kind"]) =>
    setEdit({
      id: crypto.randomUUID(),
      kind,
      title: kind === "template" ? doc.title : "",
      body:
        kind === "template"
          ? (editor?.getMarkdown() ?? doc.body)
          : selection.current.body,
      pageId: doc.id,
      blockId:
        kind === "review" || kind === "excerpt"
          ? selection.current.blockId
          : undefined,
      sourceUpdatedAt: doc.updatedAt,
    });
  const insert = (item: ResearchItem) => {
    if (!editor) return;
    try {
      const chosen = bookmark.current?.resolve(editor.state.doc);
      if (chosen) editor.view.dispatch(editor.state.tr.setSelection(chosen));
    } catch {
      /* insert at current selection if its old parent was removed */
    }
    // Insertion is a value snapshot. No live private document is resolved by the reader.
    editor
      .chain()
      .focus()
      .insertContent(item.body, { contentType: "markdown" } as never)
      .run();
    onClose();
    toast.add({
      type: "success",
      title: "Inserted a copy",
      description: "Later source edits won’t change this page.",
    });
  };
  const jump = (blockId?: string) => {
    if (!editor || !blockId) return;
    let pos: number | undefined;
    editor.state.doc.descendants((n, p) => {
      if (n.attrs.blockId === blockId) {
        pos = p;
        return false;
      }
    });
    if (pos === undefined) {
      setError("This block was removed. The note is still available.");
      return;
    }
    onClose();
    editor
      .chain()
      .focus()
      .setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))
      .scrollIntoView()
      .run();
  };
  const extract = () =>
    run(async () => {
      if (!editor || !selection.current.body)
        throw new Error("Select the blocks you want to extract first.");
      if (!(await beforeSave()))
        throw new Error("Save this page before extracting blocks.");
      const range = bookmark.current?.resolve(editor.state.doc);
      if (!range || range.empty)
        throw new Error("The selection changed. Select the blocks again.");
      const original = editor.state.doc;
      const body = selectionMarkdown(editor, range);
      if (body !== selection.current.body)
        throw new Error("The selected text changed. Select the blocks again before extracting.");
      if (extraction.current?.body !== body)
        extraction.current = { body, requestId: crypto.randomUUID() };
      const { post } = await api.create({
        title: body.replace(/[#*_]/g, "").slice(0, 80),
        body,
        parentId: doc.id,
        requestId: extraction.current.requestId,
      });
      // A slow request must never delete new edits. The child is retained as a safe copy.
      if (!editor.state.doc.eq(original)) {
        setPeek(post.id);
        throw new Error(
          "A child draft was created. The source changed, so its text was kept.",
        );
      }
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: range.from, to: range.to },
          {
            type: "paragraph",
            content: [
              {
                type: "mention",
                attrs: { kind: "page", id: post.id, label: post.title },
              },
            ],
          },
        )
        .run();
      if (!(await beforeSave()))
        throw new Error(
          "The child draft exists. The source replacement is waiting to save; your local recovery copy is retained.",
        );
      extraction.current = null;
      await refresh();
      setPeek(post.id);
    });
  const copyLink = () =>
    run(async () => {
      if (!(await beforeSave()))
        throw new Error("Save the page before copying a block link.");
      const id = selection.current.blockId;
      if (!id) throw new Error("Place the cursor in a block first.");
      await navigator.clipboard.writeText(
        `${location.origin}/admin?post=${doc.id}&block=${encodeURIComponent(id)}`,
      );
      toast.add({ type: "success", title: "Private block link copied" });
    });
  const library = items
    .filter((i) =>
      tab === "review"
        ? i.kind === "review" && i.pageId === doc.id
        : ["template", "capture", "excerpt"].includes(i.kind),
    )
    .filter((i) =>
      `${i.title} ${i.body}`.toLowerCase().includes(filter.toLowerCase()),
    );
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Research"
        description="Private references and reusable writing material."
      >
        <div className="research-panel">
          <div className="research-tabs" aria-label="Research sections">
            {(["links", "library", "review"] as const).map((t) => (
              <button
                type="button"
                className="admin-button"
                aria-pressed={tab === t}
                key={t}
                onClick={() => setTab(t)}
              >
                {t === "links"
                  ? "References"
                  : t === "library"
                    ? "Library"
                    : "Review notes"}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="research-error">
              {error}{" "}
              <button type="button" onClick={() => void refresh()}>
                Retry loading
              </button>
            </p>
          ) : null}
          {tab === "links" ? (
            <>
              <div className="research-actions">
                <button
                  type="button"
                  className="admin-button"
                  disabled={busy}
                  onClick={copyLink}
                >
                  Copy block link
                </button>
                <button
                  type="button"
                  className="admin-button"
                  disabled={busy}
                  onClick={extract}
                >
                  Extract selection to child page
                </button>
              </div>
              {doc.liveSlug ? (
                <button
                  type="button"
                  className="admin-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!(await beforeSave()))
                        throw new Error("Save your draft before comparing.");
                      setPublished(await api.publishedSource(doc.id));
                    })
                  }
                >
                  Compare published source
                </button>
              ) : null}
              {published ? (
                <section className="research-form">
                  <h3>Review the GitHub version</h3>
                  <p className="research-help">
                    Choose explicitly before publishing. A revision of the
                    current draft is kept with either choice.
                  </p>
                  <details open>
                    <summary>Published Markdown</summary>
                    <pre className="research-compare">
                      {published.post?.body ?? "The file is missing."}
                    </pre>
                  </details>
                  <details>
                    <summary>Current draft</summary>
                    <pre className="research-compare">
                      {editor?.getMarkdown() ?? doc.body}
                    </pre>
                  </details>
                  <div className="research-actions">
                    {(["keep", "import"] as const).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className="admin-button"
                        disabled={
                          busy || (choice === "import" && !published.post)
                        }
                        onClick={() =>
                          void run(async () => {
                            await api.reconcileSource(doc.id, {
                              base: published.base,
                              fingerprint: published.fingerprint,
                              choice,
                            });
                            window.location.reload();
                          })
                        }
                      >
                        {choice === "keep"
                          ? "Keep draft for next publish"
                          : "Import published version"}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => setPublished(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              ) : null}
              <p className="research-help">
                Block links open this private editor. Extraction creates the
                child first, then replaces the selected content with a page
                mention.
              </p>
              {!refs && !error ? (
                <p role="status">Loading references…</p>
              ) : null}
              {(["incoming", "outgoing"] as const).map((direction) => (
                <section key={direction}>
                  <h3>
                    {direction === "incoming"
                      ? "Pages linking here"
                      : "Referenced pages"}
                  </h3>
                  {!refs?.[direction].length ? (
                    <p className="research-help">
                      {direction === "incoming"
                        ? "Mention this page with @ from another draft to connect your notes."
                        : "Use @ to reference a page while writing."}
                    </p>
                  ) : (
                    refs[direction].map((r, i) => (
                      <button
                        className="research-row"
                        type="button"
                        key={`${r.id}:${i}`}
                        onClick={() => setPeek(r.id)}
                      >
                        <strong>{r.title || "Untitled"}</strong>
                        <span>{r.snippet || "Page reference"}</span>
                      </button>
                    ))
                  )}
                </section>
              ))}
            </>
          ) : (
            <>
              <div className="research-actions">
                {(tab === "review"
                  ? ["review"]
                  : ["capture", "excerpt", "template"]
                ).map((kind) => (
                  <button
                    className="admin-button"
                    type="button"
                    key={kind}
                    onClick={() => make(kind as ResearchItem["kind"])}
                  >
                    {kind === "review"
                      ? "Add note to this block"
                      : kind === "template"
                        ? "Save page as template"
                        : kind === "excerpt"
                          ? "Save selected excerpt"
                          : "Capture a source"}
                  </button>
                ))}
              </div>
              <label className="research-field">
                Find in {tab === "review" ? "notes" : "library"}
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  type="search"
                />
              </label>
              {edit ? (
                <form
                  className="research-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api.saveResearch(edit);
                      setEdit(null);
                      await refresh();
                    });
                  }}
                >
                  <h3>
                    {edit.kind === "review"
                      ? "Private review note"
                      : `Edit ${edit.kind}`}
                  </h3>
                  <label>
                    Title
                    <input
                      required
                      maxLength={200}
                      value={edit.title}
                      onChange={(e) =>
                        setEdit({ ...edit, title: e.target.value })
                      }
                    />
                  </label>
                  {edit.kind === "capture" ? (
                    <label>
                      Source address
                      <input
                        type="url"
                        value={edit.url ?? ""}
                        onChange={(e) =>
                          setEdit({ ...edit, url: e.target.value })
                        }
                      />
                    </label>
                  ) : null}
                  <label>
                    {edit.kind === "review" ? "Note" : "Content (Markdown)"}
                    <textarea
                      rows={7}
                      maxLength={100000}
                      value={edit.body}
                      onChange={(e) =>
                        setEdit({ ...edit, body: e.target.value })
                      }
                    />
                  </label>
                  <div className="research-actions">
                    <button
                      type="submit"
                      className="admin-button admin-button-primary"
                      disabled={busy}
                    >
                      Save {edit.kind === "review" ? "note" : edit.kind}
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => setEdit(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
              {!library.length ? (
                <p className="research-help">
                  {tab === "review"
                    ? "Keep editorial notes here. They never appear in the published article."
                    : "Save useful sources, selections, or a whole page template to reuse later."}
                </p>
              ) : (
                library.map((item) => (
                  <article
                    key={item.id}
                    className="research-item"
                    data-resolved={item.resolved || undefined}
                  >
                    <div className="research-item-heading">
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind}
                        {item.resolved ? " · Resolved" : ""}
                      </span>
                    </div>
                    <p>{item.body.slice(0, 240) || "No content yet"}</p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open source
                      </a>
                    ) : null}
                    <div className="research-actions">
                      <button
                        className="admin-button"
                        type="button"
                        onClick={() => setEdit(item)}
                      >
                        Edit
                      </button>
                      {item.kind === "review" ? (
                        <>
                          <button
                            className="admin-button"
                            type="button"
                            onClick={() => jump(item.blockId)}
                          >
                            Go to block
                          </button>
                          <button
                            className="admin-button"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await api.saveResearch({
                                  ...item,
                                  resolved: !item.resolved,
                                });
                                await refresh();
                              })
                            }
                          >
                            {item.resolved ? "Reopen" : "Resolve"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="admin-button"
                            type="button"
                            onClick={() => insert(item)}
                            disabled={!item.body}
                          >
                            Insert a copy
                          </button>
                          {item.kind === "template" ? (
                            <button
                              className="admin-button"
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const { post } = await api.create({
                                    title: item.title,
                                    body: item.body,
                                  });
                                  setPeek(post.id);
                                })
                              }
                            >
                              New draft from template
                            </button>
                          ) : null}
                          {item.pageId ? (
                            <button
                              className="admin-button"
                              type="button"
                              onClick={() => setPeek(item.pageId!)}
                            >
                              View original
                            </button>
                          ) : null}
                          {item.kind === "excerpt" ? (
                            <button
                              className="admin-button"
                              type="button"
                              disabled={!hasSelection}
                              onClick={() =>
                                setEdit({
                                  ...item,
                                  body: selection.current.body,
                                  pageId: doc.id,
                                  blockId: selection.current.blockId,
                                  sourceUpdatedAt: doc.updatedAt,
                                })
                              }
                            >
                              Update from selection
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </article>
                ))
              )}
            </>
          )}
        </div>
      </Sheet>
      <Sheet
        open={!!peek}
        onClose={() => setPeek(null)}
        title={preview?.id === peek ? preview.title : "Page preview"}
        description="Private preview · Your writing position is preserved."
      >
        {previewError ? (
          <p role="alert">{previewError}</p>
        ) : preview?.id === peek ? (
          <>
            <div className="research-actions">
              <a
                className="admin-button"
                href={`/admin?post=${preview.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open editor in new tab
              </a>
              <button
                className="admin-button"
                type="button"
                onClick={() => setPeek(null)}
              >
                Return to writing
              </button>
            </div>
            <PageView meta={preview} body={preview.body} doc={preview} />
          </>
        ) : (
          <p role="status">Loading page…</p>
        )}
      </Sheet>
    </>
  );
}
