"use client";

import {
  ArrowSquareOut,
  ArrowUUpLeft,
  CalendarBlank,
  CheckSquare,
  ClockCounterClockwise,
  Copy,
  CopySimple,
  DotsThree,
  LinkSimple,
  MarkdownLogo,
  NotePencil,
  PaperPlaneTilt,
  PushPin,
  PushPinSlash,
  SlidersHorizontal,
  Trash,
} from "@phosphor-icons/react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import { useState } from "react";

import { serializePost, draftToPost } from "../../../cms/format";
import { copy } from "../../components/menu/actions";
import { useFinePointer } from "../../components/menu/useFinePointer";
import { toast } from "../../lib/toast";
import { api, ApiError, type PostSummary } from "./api";
import type { Panel } from "./Editor";
import { MenuSurface, MItem, MLabel, MSep } from "./menu";

/*
 * Everything you can do to a post from the list, offered twice: on right-click
 * (and on a long press on a phone) and from the ⋯ button on the row. One set
 * of items, so the two can't drift apart.
 */

const I = { size: 15 } as const;
const SITE = "https://nazarene.dev";

export type RowActions = {
  open: (id: string, panel?: Panel) => void;
  refresh: () => void;
  replace: (post: PostSummary | null, id: string) => void;
};

function rowCommands(p: PostSummary, actions: RowActions, askDelete: () => void, onSelect?: () => void) {
  const liveUrl = p.liveSlug ? `${SITE}/writing/${p.liveSlug}` : null;
  const busy = (label: string, run: () => Promise<unknown>) => async () => {
    try {
      await run();
    } catch (error) {
      toast.add({ type: "error", title: `Couldn’t ${label}`, description: error instanceof ApiError ? error.message : undefined });
    }
  };

  // In the trash, only what makes sense for something deleted.
  if (p.trashedAt) {
    return (
      <>
        <MLabel>{p.title.trim() || "Untitled"}</MLabel>
        <MItem
          icon={<ArrowUUpLeft {...I} />}
          onSelect={busy("restore it", async () => {
            const { post } = await api.untrash(p.id);
            toast.add({ type: "success", title: "Restored", description: "It's a draft again." });
            actions.replace({ ...p, trashedAt: null, status: post.status, liveSlug: post.liveSlug, updatedAt: post.updatedAt }, p.id);
          })}
        >
          Restore
        </MItem>
        <MItem icon={<NotePencil {...I} />} onSelect={() => actions.open(p.id)}>
          Open
        </MItem>
        {onSelect ? (
          <MItem icon={<CheckSquare {...I} />} onSelect={onSelect}>
            Select
          </MItem>
        ) : null}
        <MSep />
        <MItem icon={<Trash {...I} />} danger onSelect={askDelete}>
          Delete forever…
        </MItem>
      </>
    );
  }

  const toTrash = busy("delete it", async () => {
    const { post } = await api.remove(p.id);
    actions.replace(post ? { ...p, trashedAt: post.trashedAt ?? new Date().toISOString(), status: "draft", liveSlug: null } : null, p.id);
    const id = toast.add({
      type: "success",
      title: "Moved to Trash",
      description: p.liveSlug ? "Taken off the site with the next build." : "Kept for 60 days.",
      timeout: 6000,
      actionProps: {
        children: "Undo",
        onClick: () => {
          toast.close(id);
          void api.untrash(p.id).then(({ post: back }) => actions.replace({ ...p, trashedAt: null, status: back.status, liveSlug: back.liveSlug }, p.id));
        },
      },
    });
  });

  return (
    <>
      <MLabel>{p.title.trim() || "Untitled"}</MLabel>
      <MItem icon={<NotePencil {...I} />} onSelect={() => actions.open(p.id)}>
        Open
      </MItem>
      {onSelect ? (
        <MItem icon={<CheckSquare {...I} />} onSelect={onSelect}>
          Select
        </MItem>
      ) : null}
      <MItem icon={<ArrowSquareOut {...I} />} onSelect={() => window.open(`/admin?post=${p.id}`, "_blank")}>
        Open in new tab
      </MItem>
      {liveUrl ? (
        <MItem icon={<ArrowSquareOut {...I} />} onSelect={() => window.open(liveUrl, "_blank", "noopener")}>
          View on site
        </MItem>
      ) : null}
      <MSep />
      {p.status === "draft" ? (
        <MItem
          icon={<PaperPlaneTilt {...I} />}
          onSelect={busy("publish", async () => {
            const { post } = await api.publish(p.id);
            toast.add({ type: "success", title: "Published", description: "Live in about a minute, once the site rebuilds." });
            actions.replace({ ...p, status: post.status, liveSlug: post.liveSlug, dirty: post.dirty, publishedAt: post.publishedAt, updatedAt: post.updatedAt }, p.id);
          })}
        >
          Publish now
        </MItem>
      ) : null}
      {p.status === "published" && p.dirty ? (
        <MItem
          icon={<PaperPlaneTilt {...I} />}
          onSelect={busy("publish", async () => {
            const { post } = await api.publish(p.id);
            toast.add({ type: "success", title: "Changes published" });
            actions.replace({ ...p, dirty: post.dirty, liveSlug: post.liveSlug, updatedAt: post.updatedAt }, p.id);
          })}
        >
          Publish changes
        </MItem>
      ) : null}
      {p.status !== "published" ? (
        <MItem icon={<CalendarBlank {...I} />} onSelect={() => actions.open(p.id, "publish")}>
          {p.status === "scheduled" ? "Change schedule…" : "Schedule…"}
        </MItem>
      ) : null}
      {p.status !== "draft" ? (
        <MItem
          icon={<ArrowUUpLeft {...I} />}
          onSelect={busy("do that", async () => {
            const { post } = await api.unpublish(p.id);
            toast.add({ type: "success", title: p.status === "scheduled" ? "Schedule cancelled" : "Unpublished", description: p.status === "scheduled" ? undefined : "It leaves the site with the next build." });
            actions.replace({ ...p, status: post.status, liveSlug: null, publishAt: null, dirty: true, updatedAt: post.updatedAt }, p.id);
          })}
        >
          {p.status === "scheduled" ? "Cancel schedule" : "Unpublish"}
        </MItem>
      ) : null}
      <MSep />
      <MItem
        icon={<CopySimple {...I} />}
        onSelect={busy("duplicate", async () => {
          const { post } = await api.duplicate(p.id);
          toast.add({ type: "success", title: "Duplicated", description: post.title || "Untitled", actionProps: { children: "Open", onClick: () => actions.open(post.id) } });
          actions.refresh();
        })}
      >
        Duplicate
      </MItem>
      {liveUrl ? (
        <MItem icon={<LinkSimple {...I} />} onSelect={() => void copy(liveUrl, "Link copied")}>
          Copy link
        </MItem>
      ) : null}
      <MItem
        icon={<MarkdownLogo {...I} />}
        onSelect={busy("copy it", async () => {
          const { post } = await api.get(p.id);
          await copy(serializePost(draftToPost(post, post.updatedAt)), "Markdown copied");
        })}
      >
        Copy as Markdown
      </MItem>
      <MItem icon={<Copy {...I} />} onSelect={() => void copy(p.title, "Title copied")}>
        Copy title
      </MItem>
      <MSep />
      <MItem
        icon={p.pinned ? <PushPinSlash {...I} /> : <PushPin {...I} />}
        onSelect={busy(p.pinned ? "unpin it" : "pin it", async () => {
          await api.save(p.id, { pinned: !p.pinned });
          actions.replace({ ...p, pinned: !p.pinned }, p.id);
        })}
      >
        {p.pinned ? "Unpin" : "Pin to top"}
      </MItem>
      <MItem icon={<ClockCounterClockwise {...I} />} onSelect={() => actions.open(p.id, "revisions")}>
        History
      </MItem>
      <MItem icon={<SlidersHorizontal {...I} />} onSelect={() => actions.open(p.id, "details")}>
        Details
      </MItem>
      <MSep />
      <MItem icon={<Trash {...I} />} danger onSelect={toTrash}>
        Move to Trash
      </MItem>
    </>
  );
}

/** A row wrapped in its right-click menu, with the ⋯ button and the delete confirmation. */
export function PostRow({ post, actions, children, onSelect }: { post: PostSummary; actions: RowActions; children: React.ReactNode; onSelect?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fine = useFinePointer();
  const items = rowCommands(post, actions, () => setConfirm(true), onSelect);

  const remove = async () => {
    setDeleting(true);
    try {
      await api.remove(post.id, true);
      toast.add({ type: "success", title: "Deleted forever" });
      actions.replace(null, post.id);
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t delete", description: error instanceof ApiError ? error.message : undefined });
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <>
      {/* A long press on a phone opens it too: nothing to select on a row. */}
      <div className="admin-row-wrap">
        <ContextMenu.Root>
          <ContextMenu.Trigger render={<div className="admin-row-trigger" />}>{children}</ContextMenu.Trigger>
          <MenuSurface>{items}</MenuSurface>
        </ContextMenu.Root>
        {/* Not modal: a modal menu locks the page's scroll while it's open. */}
        <Menu.Root modal={false}>
          <Menu.Trigger className="admin-row-more" aria-label={`More actions for ${post.title || "Untitled"}`} data-fine={fine || undefined}>
            <DotsThree size={18} weight="bold" />
          </Menu.Trigger>
          <MenuSurface align="end">{items}</MenuSurface>
        </Menu.Root>
      </div>

      <AlertDialog.Root open={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="sheet-backdrop" data-variant="center" />
          <AlertDialog.Popup className="sheet" data-variant="center">
            <div className="sheet-header">
              <div>
                <AlertDialog.Title className="sheet-title">Delete “{post.title.trim() || "Untitled"}” forever?</AlertDialog.Title>
                <AlertDialog.Description className="sheet-description">The post and its whole history are deleted. This can’t be undone.</AlertDialog.Description>
              </div>
            </div>
            <div className="sheet-body">
              <div className="publish-actions">
                <AlertDialog.Close className="admin-button admin-button-quiet">Keep it</AlertDialog.Close>
                <button type="button" className="admin-button admin-button-danger" data-confirming="" onClick={remove} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
