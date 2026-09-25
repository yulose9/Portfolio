"use client";

import { Check, Warning } from "@phosphor-icons/react";
import { useState } from "react";

import { isValidSlug } from "../../../cms/format";
import { toast } from "../../lib/toast";
import { api, ApiError, type Draft } from "./api";
import { exactTime, PageSwitch } from "./bits";
import type { Meta } from "./Editor";
import DateTimePicker from "./DateTimePicker";
import Sheet from "./Sheet";

/*
 * Publish, with the checks in front of you rather than as errors after:
 * title, standfirst, cover alt text, body, URL. Blocking checks disable the
 * button; advisory ones (no standfirst) only say so.
 *
 * A post that has never been live can go out now or at a set time. A live
 * post's changes go out now; see cms/server/publish.ts for why.
 */

type Check = { label: string; ok: boolean; blocking: boolean; hint?: string };

/** Tomorrow at 9, the usual answer to "later". */
function tomorrowMorning() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function PublishDialog({
  open,
  onClose,
  doc,
  meta,
  body,
  beforePublish,
  onDone,
  onSlugChange,
  onPageChange,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  doc: Draft;
  meta: Meta;
  body: string;
  beforePublish: () => Promise<boolean>;
  onDone: (post: Draft) => void;
  onSlugChange: (slug: string) => void;
  onPageChange: (page: boolean) => void;
  onPreview: () => void;
}) {
  const live = doc.liveSlug !== null;
  const scheduled = doc.status === "scheduled";
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState<Date>(tomorrowMorning);
  const [busy, setBusy] = useState(false);

  // Each time it opens, start from the post's own state.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setWhen(scheduled ? "later" : "now");
      if (scheduled && doc.publishAt) setAt(new Date(doc.publishAt));
    }
  }

  const checks: Check[] = [
    { label: "Title", ok: Boolean(meta.title.trim()), blocking: true },
    { label: "Standfirst", ok: Boolean(meta.dek.trim()), blocking: false, hint: "Recommended: it's what search and link previews show." },
    ...(meta.cover ? [{ label: "Cover alt text", ok: Boolean(meta.cover.alt.trim()), blocking: true }] : []),
    meta.page
      ? { label: "Body", ok: Boolean(body.trim()), blocking: true }
      : { label: "Body", ok: true, blocking: false, hint: "Optional for a listed-only note." },
    { label: "URL", ok: isValidSlug(meta.slug), blocking: true, hint: "Lowercase letters, numbers and hyphens." },
  ];
  const blocked = checks.some((c) => c.blocking && !c.ok);
  const moved = live && meta.slug !== doc.liveSlug;

  const go = async () => {
    setBusy(true);
    try {
      if (!(await beforePublish())) throw new ApiError("Save the latest edits first; the save didn't go through.", 0);
      if (when === "later" && at.getTime() <= Date.now()) throw new ApiError("Pick a time in the future.", 0);
      const isoAt = when === "later" ? at.toISOString() : undefined;
      const { post } = await api.publish(doc.id, isoAt);
      onDone(post);
      onClose();
      if (isoAt) {
        toast.add({ type: "success", title: "Scheduled", description: `Goes live ${exactTime(isoAt)}.` });
      } else {
        toast.add({
          type: "success",
          title: live ? "Changes published" : "Published",
          description: "The site takes about 3 minutes to rebuild. The top bar shows when it's live.",
          timeout: 6000,
        });
      }
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t publish", description: error instanceof ApiError ? error.message : undefined, priority: "high" });
    } finally {
      setBusy(false);
    }
  };

  const takeDown = async () => {
    setBusy(true);
    try {
      const { post } = await api.unpublish(doc.id);
      onDone(post);
      onClose();
      toast.add({ type: "success", title: scheduled ? "Schedule cancelled" : "Unpublished", description: scheduled ? "It's a draft again." : "It leaves the site with the next build, in about a minute." });
    } catch (error) {
      toast.add({ type: "error", title: "Couldn’t do that", description: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const title = scheduled ? "Scheduled" : live ? "Publish changes" : "Publish";
  const action = busy ? "Publishing…" : when === "later" ? (scheduled ? "Update schedule" : "Schedule") : live ? "Publish changes" : "Publish now";

  return (
    <Sheet open={open} onClose={onClose} title={title} variant="center">
      <div className="publish-url">
        <span className="field-label">Goes to</span>
        <input
          className="publish-url-input"
          value={meta.slug}
          onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          aria-label="URL slug"
          spellCheck={false}
        />
        <span className="publish-url-full">nazarene.dev/writing/{meta.slug || "…"}</span>
        {moved ? <p className="field-help" data-tone="warn">/writing/{doc.liveSlug} will redirect here.</p> : null}
      </div>

      <button type="button" className="preview-cta" onClick={onPreview}>
        <span>
          <b>Preview first</b>
          <span className="field-help">The page on a laptop and a phone, how it looks in lists, and the card on X, Threads, LinkedIn, WhatsApp and more.</span>
        </span>
        <span aria-hidden="true">→</span>
      </button>

      <PageSwitch page={meta.page} slug={meta.slug} onChange={onPageChange} />

      <ul className="publish-checks">
        {checks.map((c) => (
          <li key={c.label} data-ok={c.ok || undefined} data-blocking={c.blocking || undefined}>
            <span className="publish-check-icon" aria-hidden="true">
              {c.ok ? <Check size={12} weight="bold" /> : <Warning size={12} weight="bold" />}
            </span>
            <span>{c.label}</span>
            {!c.ok && c.hint ? <span className="publish-check-hint">{c.hint}</span> : null}
          </li>
        ))}
      </ul>

      {!live ? (
        <div className="publish-when">
          <div className="admin-segments" role="radiogroup" aria-label="When">
            <button type="button" role="radio" aria-checked={when === "now"} className="admin-segment" onClick={() => setWhen("now")}>
              Now
            </button>
            <button type="button" role="radio" aria-checked={when === "later"} className="admin-segment" onClick={() => setWhen("later")}>
              Later
            </button>
          </div>
          {when === "later" ? (
            <div className="publish-at">
              <DateTimePicker value={at} min={new Date()} onChange={setAt} label="When it goes live" className="admin-button dtp-trigger" />
              <span className="field-help">Your time. Published within ten minutes of it.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="publish-actions">
        {live || scheduled ? (
          <button type="button" className="admin-button admin-button-quiet" onClick={takeDown} disabled={busy}>
            {scheduled ? "Cancel schedule" : "Unpublish"}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="admin-button admin-button-primary"
          data-keycap
          onClick={go}
          disabled={busy || blocked || (live && !doc.dirty && !moved && when === "now")}
        >
          <span key={action} className="button-label">
            {live && !doc.dirty && !moved ? "Up to date" : action}
          </span>
        </button>
      </div>
    </Sheet>
  );
}
