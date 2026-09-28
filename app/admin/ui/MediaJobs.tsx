"use client";
import { useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { ApiError } from "./api";
import { uploadMedia, type Uploaded } from "./media";
import {
  MEDIA_JOBS_EVENT,
  mediaJobs,
  pendingMediaLabel,
  removeMediaJob,
  saveMediaJob,
  type MediaJob,
} from "./media-journal";
import { beginPendingWork } from "./session";

const running = new Set<string>();
export function uploadedNode(up: Uploaded, name: string, blockId?: string) {
  const attrs = { blockId, src: up.src };
  if (up.kind === "image")
    return {
      type: "image",
      attrs: {
        ...attrs,
        alt: name.replace(/\.[^.]+$/, ""),
        ...(up.width
          ? {
              width: Math.min(up.width, 880),
              height: Math.round(
                (up.height * Math.min(up.width, 880)) / up.width,
              ),
            }
          : {}),
      },
    };
  return {
    type: "media",
    attrs: {
      ...attrs,
      kind: up.kind,
      ...(up.kind === "video" ? { poster: up.poster, loop: up.loop } : {}),
      caption: "",
    },
  };
}
export default function MediaJobs({
  documentId,
  editor,
  beforeSave,
  enabled = true,
}: {
  documentId: string;
  editor: Editor | null;
  beforeSave: () => Promise<boolean>;
  enabled?: boolean;
}) {
  const [jobs, setJobs] = useState<MediaJob[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [progress, setProgress] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    let live = true;
    const load = () => {
      void mediaJobs(documentId)
        .then((j) => {
          if (live) setJobs(j);
        })
        .catch(() => {
          if (live)
            setError(
              "Upload recovery is unavailable in this browser. Keep this page open or choose the file again.",
            );
        });
    };
    load();
    window.addEventListener(MEDIA_JOBS_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(MEDIA_JOBS_EVENT, load);
    };
  }, [documentId]);
  const attach = async (job: MediaJob) => {
    if (!editor || editor.isDestroyed || !job.result) return;
    let pos: number | undefined,
      size = 0,
      already = false;
    editor.state.doc.descendants((node, p) => {
      if (node.attrs.blockId === job.blockId) {
        if (node.attrs.src === job.result?.src) already = true;
        if (
          node.type.name === "paragraph" &&
          node.textContent === pendingMediaLabel(job.name)
        ) {
          pos = p;
          size = node.nodeSize;
        }
      }
    });
    if (!already) {
      if (pos === undefined) {
        setError(
          "The original placeholder changed or was removed. Copy the completed asset address, or insert it at your cursor.",
        );
        return;
      }
      editor
        .chain()
        .insertContentAt(
          { from: pos, to: pos + size },
          uploadedNode(job.result, job.name, job.blockId),
        )
        .run();
    }
    if (await beforeSave()) await removeMediaJob(job.id);
    else
      setError(
        "The media is uploaded, but the page has not saved. The completed job is retained for recovery.",
      );
  };
  const run = async (job: MediaJob) => {
    if (!enabled || busy || running.has(job.id)) return;
    const work = async () => {
      running.add(job.id);
      setBusy(job.id);
      setError("");
      const finish = beginPendingWork();
      const abort = new AbortController();
      controller.current = abort;
      try {
        const fresh = (await mediaJobs(documentId)).find(
          (j) => j.id === job.id,
        );
        if (!fresh || fresh.state === "cancelled") return;
        job = fresh;
        if (!job.result) {
          if (!job.file)
            throw new Error(
              "Choose this file again; its local copy is unavailable.",
            );
          const file = job.file;
          job = {
            ...job,
            state: "uploading",
            attempts: job.attempts + 1,
            error: undefined,
            uploadYear: job.uploadYear ?? new Date().getUTCFullYear(),
          };
          await saveMediaJob(job);
          let result: Uploaded | undefined;
          for (let attempt = 0; attempt < 3; attempt++) {
            abort.signal.throwIfAborted();
            try {
              result = await uploadMedia(
                new File([file], job.name, { type: job.mime }),
                (fraction, label) => {
                  abort.signal.throwIfAborted();
                  setProgress(`${label} · ${Math.round(fraction * 100)}%`);
                },
                job.id.replaceAll("-", "").slice(0, 24),
                { signal: abort.signal, year: job.uploadYear },
              );
              break;
            } catch (error) {
              if (
                !(error instanceof ApiError) ||
                ![0, 429, 500, 502, 503, 504].includes(error.status) ||
                attempt === 2 ||
                abort.signal.aborted
              )
                throw error;
              setProgress("Connection interrupted · retrying…");
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * 2 ** attempt),
              );
            }
          }
          if (!result) throw new Error("Upload did not complete.");
          abort.signal.throwIfAborted();
          job = { ...job, state: "complete", result, file: undefined };
          await saveMediaJob(job);
        }
        await attach(job);
      } catch (e) {
        const message = abort.signal.aborted
          ? "Paused. Your local file is retained; retry when ready."
          : e instanceof Error
            ? e.message
            : "Upload failed";
        if (!job.result)
          await saveMediaJob({
            ...job,
            state:
              e instanceof ApiError && [401, 403].includes(e.status)
                ? "auth-paused"
                : "failed",
            error: message,
          }).catch(() => {});
        setError(message);
      } finally {
        finish();
        running.delete(job.id);
        controller.current = null;
        setBusy(null);
        setProgress("");
      }
    };
    if (navigator.locks)
      await navigator.locks.request(
        `writing-upload:${job.id}`,
        { ifAvailable: true },
        async (lock) => {
          if (lock) await work();
          else setError("This upload is running in another tab.");
        },
      );
    else await work();
  };
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (!enabled || busy || !editor || !navigator.locks) return;
    const job = jobs.find((j) => j.state === "queued");
    if (job) {
      let present = false;
      editor.state.doc.descendants((n) => {
        if (n.attrs.blockId === job.blockId) present = true;
      });
      if (present) void runRef.current(job);
    }
  }, [jobs, busy, editor, enabled]);
  if (!jobs.length && !error) return null;
  return (
    <section className="media-jobs" aria-label="Media uploads">
      <h2>Media uploads</h2>
      <p>
        Files stay on this browser until uploaded. Closing the page pauses work;
        resume here after signing in.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {jobs.map((job) => (
        <div className="media-job" key={job.id}>
          <span>
            <strong>{job.name}</strong>
            <small aria-live="polite">
              {busy === job.id
                ? progress
                : job.result
                  ? "Uploaded · ready to attach"
                  : job.state === "uploading"
                    ? "Interrupted · resume upload"
                    : job.state}
              {job.error ? ` · ${job.error}` : ""}
            </small>
          </span>
          <button
            type="button"
            className="admin-button"
            disabled={!!busy || !enabled}
            onClick={() => void run(job)}
          >
            {job.result ? "Attach / finish" : job.attempts ? "Retry" : "Upload"}
          </button>
          {busy === job.id ? (
            <button
              type="button"
              className="admin-button"
              onClick={() => controller.current?.abort()}
            >
              Pause upload
            </button>
          ) : null}
          {job.result ? (
            <button
              type="button"
              className="admin-button"
              disabled={!!busy || !enabled}
              onClick={() => {
                if (editor && job.result) {
                  editor
                    .chain()
                    .focus()
                    .insertContent(uploadedNode(job.result, job.name))
                    .run();
                  void beforeSave()
                    .then(async (ok) => {
                      if (ok) await removeMediaJob(job.id);
                    })
                    .catch(() =>
                      setError(
                        "The local job could not be cleared. Your uploaded asset remains available.",
                      ),
                    );
                }
              }}
            >
              Insert at cursor
            </button>
          ) : null}
          {job.result ? (
            <a href={job.result.src} target="_blank" rel="noreferrer">
              Open asset
            </a>
          ) : null}
          <button
            type="button"
            className="admin-button"
            disabled={!!busy}
            onClick={() =>
              void removeMediaJob(job.id).catch(() =>
                setError("Could not remove the local job."),
              )
            }
          >
            Discard local job
          </button>
        </div>
      ))}
    </section>
  );
}
