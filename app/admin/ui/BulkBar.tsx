"use client";

import {
  ArrowSquareOut,
  ArrowUUpLeft,
  CalendarBlank,
  Check,
  CopySimple,
  LinkSimple,
  NotePencil,
  PaperPlaneTilt,
  PushPin,
  PushPinSlash,
  SelectionSlash,
  Trash,
  X,
} from "@phosphor-icons/react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useState } from "react";

import { copy } from "../../components/menu/actions";
import { toast } from "../../lib/toast";
import { api, ApiError, type BulkAction, type PostSummary } from "./api";
import { exactTime } from "./bits";
import DateTimePicker from "./DateTimePicker";
import { keys } from "./menu";
import type { Command } from "./registry";

/*
 * What you can do to the checked posts. One set of actions, offered three
 * ways: the bar that rises from the bottom, the ⌘K palette (under
 * "Selected"), and the right-click menu of any checked row. One request per
 * action, and publishing many is one commit, so the site rebuilds once
 * however many go out.
 */

const I = { size: 15, "aria-hidden": true } as const;
const CI = { size: 16, "aria-hidden": true } as const;
const SITE = "https://nazarene.dev";

const plural = (n: number) => (n === 1 ? "post" : "posts");

const DONE: Record<BulkAction, (n: number) => string> = {
  publish: (n) => `Published ${n} ${plural(n)}`,
  unpublish: (n) => `Unpublished ${n} ${plural(n)}`,
  schedule: (n) => `Scheduled ${n} ${plural(n)}`,
  trash: (n) => `Moved ${n} ${plural(n)} to Trash`,
  restore: (n) => `Restored ${n} ${plural(n)}`,
  destroy: (n) => `Deleted ${n} ${plural(n)} forever`,
  pin: (n) => `Pinned ${n} ${plural(n)}`,
  unpin: (n) => `Unpinned ${n} ${plural(n)}`,
};

/** The verb, as a person would say it after "Couldn’t". */
const VERB: Record<BulkAction, string> = {
  publish: "publish",
  unpublish: "unpublish",
  schedule: "schedule",
  trash: "move to Trash",
  restore: "restore",
  destroy: "delete forever",
  pin: "pin",
  unpin: "unpin",
};

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

export type Bulk = ReturnType<typeof useBulk>;

/**
 * The selection's actions and their state. `commands` is what the palette
 * and a checked row's menu list; the bar renders the same actions as buttons.
 */
export function useBulk({
  selected,
  inTrash,
  onClear,
  onDone,
  onOpen,
}: {
  selected: PostSummary[];
  inTrash: boolean;
  onClear: () => void;
  onDone: () => void;
  onOpen: (id: string) => void;
}) {
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [at, setAt] = useState<Date>(tomorrowMorning);
  const [confirming, setConfirming] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const n = selected.length;

  const title = (id: string) => selected.find((p) => p.id === id)?.title.trim() || "Untitled";

  const run = async (action: BulkAction, ids = selected.map((p) => p.id), when?: Date) => {
    if (!ids.length) return;
    setBusy(action);
    try {
      const r = await api.bulk(action, ids, when?.toISOString());
      const ok = action === "destroy" ? (r.deleted?.length ?? 0) : r.posts.length;
      const failed = r.failed;
      const why = failed.length ? `${failed.length} couldn’t ${VERB[action]}. “${title(failed[0].id)}”: ${failed[0].error}` : undefined;
      if (ok) {
        const t = toast.add({
          type: failed.length ? "warning" : "success",
          title: DONE[action](ok),
          description:
            why ??
            (action === "publish"
              ? "One rebuild for all of them, in about 3 minutes."
              : action === "unpublish"
                ? "They leave the site in about 3 minutes."
                : action === "schedule" && when
                  ? `Going live ${exactTime(when.toISOString())}.`
                  : action === "trash"
                    ? "Kept for 60 days."
                    : undefined),
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
        toast.add({ type: "error", title: `Couldn’t ${VERB[action]} ${failed.length === 1 ? "it" : "them"}`, description: `“${title(failed[0].id)}”: ${failed[0].error}` });
      }
      onClear();
      onDone();
    } catch (error) {
      toast.add({ type: "error", title: `Couldn’t ${VERB[action]} ${n === 1 ? "it" : "them"}`, description: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  // Only posts that aren't live yet can be scheduled; a live post's edits go out now.
  const schedulable = selected.filter((p) => !p.liveSlug);
  const publishable = selected.filter((p) => p.status !== "published" || p.dirty);
  const live = selected.filter((p) => p.status !== "draft");
  const allPinned = n > 0 && selected.every((p) => p.pinned);
  const one = n === 1 ? selected[0] : null;
  const count = n === 1 ? "" : ` ${n}`;
  const clear: Command = { id: "sel:clear", group: "Selected", title: "Clear selection", keys: "Esc", icon: <SelectionSlash {...CI} />, keywords: ["deselect", "none"], run: onClear };

  const commands: Command[] = !n
    ? []
    : inTrash
      ? [
          { id: "sel:restore", group: "Selected", title: `Restore${count}`, icon: <ArrowUUpLeft {...CI} />, keywords: ["undelete", "untrash"], run: () => void run("restore") },
          { id: "sel:destroy", group: "Selected", title: `Delete${count} forever…`, icon: <Trash {...CI} />, keywords: ["remove", "erase"], run: () => setConfirming(true) },
          clear,
        ]
      : [
          ...(one
            ? [
                { id: "sel:open", group: "Selected" as const, title: `Open “${one.title.trim() || "Untitled"}”`, icon: <NotePencil {...CI} />, keywords: ["edit"], run: () => onOpen(one.id) },
                ...(one.liveSlug
                  ? [
                      { id: "sel:view", group: "Selected" as const, title: "View on site", icon: <ArrowSquareOut {...CI} />, keywords: ["live", "open"], run: () => window.open(`${SITE}/writing/${one.liveSlug}`, "_blank", "noopener") },
                      { id: "sel:link", group: "Selected" as const, title: "Copy link", icon: <LinkSimple {...CI} />, keywords: ["url", "share"], run: () => void copy(`${SITE}/writing/${one.liveSlug}`, "Link copied") },
                    ]
                  : []),
                {
                  id: "sel:duplicate",
                  group: "Selected" as const,
                  title: "Duplicate",
                  icon: <CopySimple {...CI} />,
                  keywords: ["copy", "clone"],
                  run: () =>
                    void api
                      .duplicate(one.id)
                      .then(({ post }) => {
                        toast.add({ type: "success", title: "Duplicated", description: post.title || "Untitled", actionProps: { children: "Open", onClick: () => onOpen(post.id) } });
                        onDone();
                      })
                      .catch(() => toast.add({ type: "error", title: "Couldn’t duplicate it" })),
                },
              ]
            : []),
          {
            id: "sel:publish",
            group: "Selected",
            title: publishable.length > 1 ? `Publish ${publishable.length}` : "Publish",
            icon: <PaperPlaneTilt {...CI} />,
            keywords: ["live", "ship", "bulk"],
            disabled: publishable.length ? undefined : "Everything selected is already published",
            run: () => void run("publish", publishable.map((p) => p.id)),
          },
          {
            id: "sel:schedule",
            group: "Selected",
            title: schedulable.length > 1 ? `Schedule ${schedulable.length}…` : "Schedule…",
            icon: <CalendarBlank {...CI} />,
            keywords: ["later", "date", "time", "bulk"],
            disabled: schedulable.length ? undefined : "Published posts can’t be scheduled",
            run: () => setScheduling(true),
          },
          {
            id: "sel:unpublish",
            group: "Selected",
            title: live.length > 1 ? `Unpublish ${live.length}` : "Unpublish",
            icon: <ArrowUUpLeft {...CI} />,
            keywords: ["take down", "draft", "unschedule"],
            disabled: live.length ? undefined : "None of these are published or scheduled",
            run: () => void run("unpublish", live.map((p) => p.id)),
          },
          {
            id: "sel:pin",
            group: "Selected",
            title: allPinned ? `Unpin${count}` : `Pin${count} to the top`,
            icon: allPinned ? <PushPinSlash {...CI} /> : <PushPin {...CI} />,
            keywords: ["pin", "unpin", "favorite"],
            run: () => void run(allPinned ? "unpin" : "pin"),
          },
          { id: "sel:trash", group: "Selected", title: `Move${count} to Trash`, icon: <Trash {...CI} />, keywords: ["delete", "remove"], run: () => void run("trash") },
          clear,
        ];

  return { n, busy, at, setAt, confirming, setConfirming, scheduling, setScheduling, run, schedulable, publishable, live, allPinned, inTrash, commands };
}

export default function BulkBar({ bulk, total, onSelectAll, onClear }: { bulk: Bulk; total: number; onSelectAll: () => void; onClear: () => void }) {
  const { n, busy, at, setAt, run, schedulable, publishable, live, allPinned, inTrash } = bulk;
  // Keep the last count on screen while the bar sinks away.
  const [shown, setShown] = useState(n);
  if (n && n !== shown) setShown(n);

  return (
    <>
      <div className="bulk-bar" data-open={n > 0 || undefined} inert={n === 0} role="toolbar" aria-label="Selected posts">
        <button type="button" className="bulk-close" onClick={onClear} aria-label="Clear selection" title="Clear selection (Esc)">
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
            <button type="button" className="bulk-action" data-danger="" onClick={() => bulk.setConfirming(true)} disabled={busy !== null}>
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
              title={publishable.length ? `Publish ${publishable.length} ${plural(publishable.length)} in one commit` : "Everything selected is already published"}
            >
              <PaperPlaneTilt {...I} />
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
            <DateTimePicker
              value={at}
              min={new Date()}
              onChange={setAt}
              open={bulk.scheduling}
              onOpenChange={bulk.setScheduling}
              className="bulk-action"
              label="Schedule the selected posts"
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
                  {schedulable.length ? `Schedule ${schedulable.length} ${plural(schedulable.length)}` : "Published posts can’t be scheduled"}
                </button>
              )}
            >
              <CalendarBlank {...I} />
              Schedule
            </DateTimePicker>
            <button type="button" className="bulk-action" onClick={() => void run("unpublish", live.map((p) => p.id))} disabled={busy !== null || !live.length} title={live.length ? undefined : "None of these are published or scheduled"}>
              <ArrowUUpLeft {...I} />
              Unpublish
            </button>
            <button type="button" className="bulk-action bulk-icon" onClick={() => void run(allPinned ? "unpin" : "pin")} disabled={busy !== null} aria-label={allPinned ? "Unpin" : "Pin to the top"} title={allPinned ? "Unpin" : "Pin to the top"}>
              {allPinned ? <PushPinSlash {...I} /> : <PushPin {...I} />}
            </button>
            <button type="button" className="bulk-action bulk-icon" data-danger="" onClick={() => void run("trash")} disabled={busy !== null} aria-label="Move to Trash" title="Move to Trash">
              <Trash {...I} />
            </button>
          </>
        )}
        <button type="button" className="bulk-action bulk-more" onClick={() => window.dispatchEvent(new Event("admin:palette"))} title="All actions for the selection">
          <kbd>{keys("⌘K")}</kbd>
        </button>
      </div>

      <AlertDialog.Root open={bulk.confirming} onOpenChange={bulk.setConfirming}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="sheet-backdrop" data-variant="center" />
          <AlertDialog.Popup className="sheet" data-variant="center">
            <div className="sheet-header">
              <div>
                <AlertDialog.Title className="sheet-title">
                  Delete {n} {plural(n)} forever?
                </AlertDialog.Title>
                <AlertDialog.Description className="sheet-description">Their revision history goes with them. This can’t be undone.</AlertDialog.Description>
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
                  onClick={() => void run("destroy").then(() => bulk.setConfirming(false))}
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
