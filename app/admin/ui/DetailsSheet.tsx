"use client";

import { useState } from "react";

import { isValidSlug, slugify } from "../../../cms/format";
import { toast } from "../../lib/toast";
import { trashToast } from "./trash-toast";
import { api, ApiError, type Draft } from "./api";
import { PageSwitch } from "./bits";
import type { Meta } from "./Editor";
import { FontsEditor, ShareImageField } from "./MetaEditors";
import Sheet from "./Sheet";
import AdminSelect from "./AdminSelect";
import { Checkbox } from "../../components/kit/checkbox";
import { Switch } from "../../components/kit/switch";
import { showsSubtitle } from "../../../cms/subtitle";
import { DayTimeButton } from "./DayTimeFields";
import { addDays } from "./clock";

/*
 * Everything about a post that isn't its words: the URL, tags, the cover's
 * alt text, how it will look in search and when shared, and deleting it.
 */

const SITE = "nazarene.dev";

export default function DetailsSheet({
  open,
  onClose,
  meta,
  doc,
  onChange,
  onSlugEdited,
  onPickCover,
  onDeleted,
  onSubtitle,
}: {
  open: boolean;
  onClose: () => void;
  meta: Meta;
  doc: Draft;
  onChange: (patch: Partial<Meta>) => void;
  onSlugEdited: () => void;
  onPickCover: () => void;
  onDeleted: () => void;
  /** Shows or hides the subtitle on the page (the editor's own toggle, with its Undo toast). */
  onSubtitle: (shown: boolean) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const live = doc.liveSlug !== null;
  const moved = live && meta.slug !== doc.liveSlug;
  const slugOk = isValidSlug(meta.slug);

  const addTag = () => {
    const tag = tagInput.trim().replace(/,$/, "");
    if (tag && !meta.tags.includes(tag) && meta.tags.length < 8) onChange({ tags: [...meta.tags, tag] });
    setTagInput("");
  };

  const remove = async () => {
    if (!confirming) {
      setConfirming(true);
      // Long enough to read the new label and press again, not just to react.
      window.setTimeout(() => setConfirming(false), 6000);
      return;
    }
    setDeleting(true);
    try {
      await api.remove(doc.id);
      trashToast({ name: meta.title, live, restore: () => api.untrash(doc.id) });
      onDeleted();
    } catch (error) {
      setDeleting(false);
      toast.add({ type: "error", title: "Couldn’t move it to Trash", description: error instanceof ApiError ? error.message : undefined });
    }
  };

  const title = meta.title.trim() || "Untitled";
  const description = meta.dek.trim() || "Add a standfirst; search results and link previews show it here.";

  return (
    <Sheet open={open} onClose={onClose} title="Details" description="URL, tags, fonts, cover and previews.">
      <section className="editorial-fields">
        <AdminSelect label="Editorial stage" value={meta.editorial?.stage??"drafting"} options={[{value:"idea",label:"Idea"},{value:"drafting",label:"Drafting"},{value:"review",label:"In review"},{value:"ready",label:"Ready"}]} onValueChange={stage=>onChange({editorial:{stage:stage as import("../../../cms/editorial").Editorial["stage"],reviewAt:meta.editorial?.reviewAt??null,timezone:"UTC"}})}/>
        <div className="field"><span className="field-label">Review due (UTC)</span><DayTimeButton label="Review due" value={meta.editorial?.reviewAt?{date:meta.editorial.reviewAt.slice(0,10),time:meta.editorial.reviewAt.slice(11,16)}:null} fallback={()=>({date:addDays(new Date().toISOString().slice(0,10),1),time:"09:00"})} today={new Date().toISOString().slice(0,10)} zoneNote="UTC" onChange={value=>onChange({editorial:{stage:meta.editorial?.stage??"drafting",reviewAt:value?new Date(`${value.date}T${value.time??"09:00"}:00Z`).toISOString():null,timezone:"UTC"}})}/></div>
        <p className="field-help">Private review date. Publication is scheduled separately.</p>
        {doc.publicationReceipt?<p className="field-help" title={doc.publicationReceipt.publishedAt}>Published source {doc.publicationReceipt.sourceUpdatedAt} · Git {doc.publicationReceipt.commit.slice(0,8)}</p>:null}
      </section>
      <section className="field">
        <label className="field-label" htmlFor="slug">
          URL
        </label>
        <div className="slug-field" data-invalid={!slugOk || undefined}>
          <span className="slug-prefix">{SITE}/writing/</span>
          <input
            id="slug"
            value={meta.slug}
            spellCheck={false}
            onChange={(e) => {
              onSlugEdited();
              onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") });
            }}
            onBlur={() => onChange({ slug: slugify(meta.slug) || slugify(meta.title) })}
          />
        </div>
        <p className="field-help" data-tone={moved ? "warn" : undefined}>
          {!slugOk
            ? "Lowercase letters, numbers and single hyphens."
            : moved
              ? `Publishing moves the post here. /writing/${doc.liveSlug} will redirect to it, so existing links keep working.`
              : live
                ? "This is live. Change it only if you must; the old URL will redirect."
                : "Follows the title until you edit it. Free to change until you publish."}
        </p>
        {doc.redirectFrom.length ? (
          <p className="field-help">Also redirects from {doc.redirectFrom.map((s) => `/writing/${s}`).join(", ")}.</p>
        ) : null}
      </section>

      <section className="field">
        <PageSwitch page={meta.page} slug={meta.slug} onChange={(page) => onChange({ page })} />
      </section>

      <section className="field">
        <label className="field-label" htmlFor="tags">
          Tags
        </label>
        <div className="tag-field">
          {meta.tags.map((tag) => (
            <button key={tag} type="button" className="admin-chip" onClick={() => onChange({ tags: meta.tags.filter((t) => t !== tag) })} aria-label={`Remove tag ${tag}`}>
              {tag} <span aria-hidden="true">×</span>
            </button>
          ))}
          <input
            id="tags"
            value={tagInput}
            placeholder={meta.tags.length ? "" : "e.g. Agents"}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              } else if (e.key === "Backspace" && !tagInput && meta.tags.length) {
                onChange({ tags: meta.tags.slice(0, -1) });
              }
            }}
            onBlur={addTag}
          />
        </div>
        <p className="field-help">The first tag shows above the headline.</p>
      </section>

      <section className="field">
        <span className="field-label">Typography</span>
        <p className="field-help">From Google Fonts and Fontshare, both free. Inter unless you choose otherwise.</p>
        <FontsEditor fonts={meta.fonts} onChange={(fonts) => onChange({ fonts })} />
        <label className="ligature-control"><Checkbox checked={meta.fonts?.ligatures !== false} onCheckedChange={(on)=>onChange({fonts:{...meta.fonts,ligatures:on}})}/> Enable font ligatures</label>
      </section>

      <section className="field">
        <span className="field-label">Cover</span>
        {meta.cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="field-cover" src={meta.cover.src} alt="" />
            <input
              className="field-input"
              value={meta.cover.alt}
              onChange={(e) => onChange({ cover: { ...meta.cover!, alt: e.target.value } })}
              placeholder="Alt text: what the image shows"
              aria-label="Cover alt text"
            />
          </>
        ) : (
          <button type="button" className="admin-button" onClick={onPickCover}>
            Add a cover image
          </button>
        )}
      </section>

      <section className="field">
        <div className="switch-row">
          <span className="switch-text" id="subtitle-switch-label">
            <span className="switch-title">Show subtitle on the page</span>
            <span className="field-help">
              {showsSubtitle(meta.fonts)
                ? "The standfirst sits under the title."
                : "Hidden from the page. Its text still describes the post in search and when shared."}
            </span>
          </span>
          <Switch checked={showsSubtitle(meta.fonts)} onCheckedChange={(next) => onSubtitle(next)} aria-labelledby="subtitle-switch-label" />
        </div>
      </section>

      <section className="field">
        <span className="field-label">In search</span>
        <div className="preview-search">
          <span className="preview-url">{SITE} › writing › {meta.slug || "…"}</span>
          <span className="preview-title">{title}</span>
          <span className="preview-desc">{description}</span>
        </div>
      </section>

      <section className="field">
        <span className="field-label">Share image</span>
        <ShareImageField ogImage={meta.ogImage} hasCover={Boolean(meta.cover)} onChange={(ogImage) => onChange({ ogImage })} />
      </section>

      <section className="field">
        <span className="field-label">When shared</span>
        <div className="preview-card">
          {meta.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.cover.src} alt="" />
          ) : (
            <span className="preview-card-empty">No cover: shares as a small card</span>
          )}
          <span className="preview-card-text">
            <span className="preview-card-site">{SITE}</span>
            <span className="preview-card-title">{title}</span>
          </span>
        </div>
      </section>

      <section className="field field-danger">
        <button type="button" className="admin-button admin-button-danger" data-confirming={confirming || undefined} onClick={remove} disabled={deleting}>
          {deleting ? "Moving to Trash…" : confirming ? (live ? "Click again to unpublish and move to Trash" : "Click again to move to Trash") : "Move to Trash"}
        </button>
        <span className="sr-only" role="status">
          {confirming ? "Press again to confirm. The button resets after a few seconds." : ""}
        </span>
        <p className="field-help">
          {live ? "Takes it off the site. It stays in Trash with its history until you delete it permanently." : "It stays in Trash with its history until you delete it permanently."}
        </p>
      </section>
    </Sheet>
  );
}
