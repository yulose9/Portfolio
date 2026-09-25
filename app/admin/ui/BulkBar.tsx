"use client";

import { ArrowUUpLeft, CalendarBlank, Check, PaperPlaneTilt, PushPin, PushPinSlash, Trash, X } from "@phosphor-icons/react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useState } from "react";

import { toast } from "../../lib/toast";
import { api, ApiError, type BulkAction, type PostSummary } from "./api";
import { exactTime } from "./bits";
import DateTimePicker from "./DateTimePicker";

/*
 * What you can do to the checked posts, in a bar that rises from the bottom
 * when the first one is checked and sinks when the last one isn't (or on
 * Esc). One request per action, and publishing many is one commit, so the
 * site rebuilds once however many go out.
 */

const I = { size: 15, "aria-hidden": true } as const;

const DONE: Record<BulkAction, (n: number) => string> = {
  publish: (n) => `Published ${n}`,
  unpublish: (n) => `Unpublished ${n}`,
  schedule: (n) => `Scheduled ${n}`,
  trash: (n) => `Moved ${n} to Trash`,
  restore: (n) => `Restored ${n}`,
  destroy: (n) => `Deleted ${n} forever`,
  pin: (n) => `Pinned ${n}`,
  unpin: (n) => `Unpinned ${n}`,
};

const plural = (n: number) => (n === 1 ? "post" : "posts");

function tomorrowMorning() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function Checkbox({ checked, mixed, onToggle, label }: { checked: boolean; mixed?: boolean; onToggle: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      className="check"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
    >
      <span className="check-box" aria-hidden="true">
        <Check size={11} weight="bold" className="check-mark" data-on={(checked && !mixed) || undefined} />
        <span className="check-dash" data-on={mixed || undefined} />
      </span>
    </button>
  );
}

export default function BulkBar({
  selected,
  inTrash,
  total,
  onSelectAll,
  onClear,
  onDone,
}: {
  selected: PostSummary[];
  inTrash: boolean;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [at, setAt] = useState<Date>(tomorrowMorning);
  const [confirm, setConfirm] = useState(false);
  const n = selected.length;
  // Keep the last count on screen while the bar sinks away.
  const [shown, setShown] = useState(n);
  if (n && n !== shown) setShown(n);

  const run = async (action: BulkAction, ids = selected.map((p) => p.id), when?: Date) => {
    if (!ids.length) return;
    setBusy(action);
    try {
      const r = await api.bulk(action, ids, when?.toISOString());
      const ok = action === "destroy" ? (r.deleted?.length ?? 0) : r.posts.length;
      const failed = r.failed;
      if (ok) {
        const t = toast.add({
          type: failed.length ? "warning" : "success",
          title: `${DONE[action](ok)} ${plural(ok)}`,
          description: failed.length
            ? `${failed.length} couldn’t: ${failed[0].error}`
            : action === "publish"
              ? "One rebuild for all of them, in about 3 minutes."
              : action === "schedule" && when
                ? `Going live ${exactTime(when.toISOString())}.`
                : action === "trash"
                  ? "Kept for 60 days."
                  : undefined,
          timeout: 6000,
          ...(action === "trash"
            ? {
                actionProps: {
                  children: "Undo",
                  onClick: () => {
                    toast.close(t);
                    void api.bulk("restore", ids).then(onDone);
                  },
                },
              }
            : {}),
        });
      } else if (failed.length) {
        toast.add({ type: "error", title: `Couldn’t ${action} ${failed.length === 1 ? "it" : "them"}`, description: failed[0].error });
      }
      onClear();
      onDone();
    } catch (error) {
      toast.add({ type: "error", title: `Couldn’t ${action} those`, description: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  // Only posts that aren't live yet can be scheduled; a live post's edits go out now.
  const schedulable = selected.filter((p) => !p.liveSlug);
  const publishable = selected.filter((p) => p.status !== "published" || p.dirty);
  const live = selected.filter((p) => p.status !== "draft");
  const allPinned = n > 0 && selected.every((p) => p.pinned);

  return (
    <>
      <div className="bulk-bar" data-open={n > 0 || undefined} inert={n === 0} role="toolbar" aria-label="Selected posts">
        <button type="button" className="bulk-close" onClick={onClear} aria-label="Clear selection" title="Clear  Esc">
          <X size={14} weight="bold" />
        </button>
        <span className="bulk-count" aria-live="polite">
          <b>{shown}</b> selected
        </span>
        {shown < total ? (
          <button type="button" className="bulk-link" onClick={onSelectAll}>
            Select all {total}
          </button>
        ) : null}
        <span className="bulk-sep" aria-hidden="true" />
        {inTrash ? (
          <>
            <button type="button" className="bulk-action" onClick={() => void run("restore")} disabled={busy !== null}>
              <ArrowUUpLeft {...I} />
              Restore
            </button>
            <button type="button" className="bulk-action" data-danger="" onClick={() => setConfirm(true)} disabled={busy !== null}>
              <Trash {...I} />
              Delete forever
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="bulk-action"
              onClick={() => void run("publish", publishable.map((p) => p.id))}
              disabled={busy !== null || !publishable.length}
              title={publishable.length ? `Publish ${publishable.length} ${plural(publishable.length)} in one commit` : "Everything selected is already live"}
            >
              <PaperPlaneTilt {...I} />
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
            <DateTimePicker
              value={at}
              min={new Date()}
              onChange={setAt}
              className="bulk-action"
              label="Schedule the selected drafts"
              footer={(close) => (
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  data-keycap
                  disabled={!schedulable.length}
                  onClick={() => {
                    close();
                    void run("schedule", schedulable.map((p) => p.id), at);
                  }}
                >
                  {schedulable.length ? `Schedule ${schedulable.length} ${plural(schedulable.length)}` : "Live posts can’t be scheduled"}
                </button>
              )}
            >
              <CalendarBlank {...I} />
              Schedule
            </DateTimePicker>
            <button type="button" className="bulk-action" onClick={() => void run("unpublish", live.map((p) => p.id))} disabled={busy !== null || !live.length} title={live.length ? undefined : "None of these are live or scheduled"}>
              <ArrowUUpLeft {...I} />
              Unpublish
            </button>
            <button type="button" className="bulk-action bulk-icon" onClick={() => void run(allPinned ? "unpin" : "pin")} disabled={busy !== null} aria-label={allPinned ? "Unpin" : "Pin to top"} title={allPinned ? "Unpin" : "Pin to top"}>
              {allPinned ? <PushPinSlash {...I} /> : <PushPin {...I} />}
            </button>
            <button type="button" className="bulk-action bulk-icon" data-danger="" onClick={() => void run("trash")} disabled={busy !== null} aria-label="Move to Trash" title="Move to Trash">
              <Trash {...I} />
            </button>
          </>
        )}
      </div>

      <AlertDialog.Root open={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="sheet-backdrop" data-variant="center" />
          <AlertDialog.Popup className="sheet" data-variant="center">
            <div className="sheet-header">
              <div>
                <AlertDialog.Title className="sheet-title">
                  Delete {n} {plural(n)} forever?
                </AlertDialog.Title>
                <AlertDialog.Description className="sheet-description">They and their whole history are deleted. This can’t be undone.</AlertDialog.Description>
              </div>
            </div>
            <div className="sheet-body">
              <div className="publish-actions">
                <AlertDialog.Close className="admin-button admin-button-quiet">Keep them</AlertDialog.Close>
                <button
                  type="button"
                  className="admin-button admin-button-danger"
                  data-confirming=""
                  disabled={busy !== null}
                  onClick={() => void run("destroy").then(() => setConfirm(false))}
                >
                  {busy === "destroy" ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
