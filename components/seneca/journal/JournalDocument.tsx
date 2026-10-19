// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@cloudflare/kumo/components/button";
import { ArrowLeft, ArrowCounterClockwise, ClockCounterClockwise, Sparkle, Trash, X } from "@phosphor-icons/react";
import { Kbd } from "@/app/components/kit/kbd";
import { EmojiPicker, Fluent } from "@/app/admin/ui/extensions/emoji";
import RichTextEditor from "@/components/seneca/RichTextEditor";
import SenecaPortal from "@/components/seneca/SenecaPortal";
import { refineEntryWithGemini } from "@/lib/seneca/services/journalAI";
import { entryPreview, entryText, to12Hour, to24Hour, wordCount } from "@/lib/seneca/utils/journal";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";

const RANDOM_MOODS = ["😊", "🌟", "💭", "📝", "🎯", "🌱", "🍃", "🔥", "💡", "🌙", "☀️", "🌊"];
const randomMood = () => RANDOM_MOODS[Math.floor(Math.random() * RANDOM_MOODS.length)];
const EASE_OUT = [0.23, 1, 0.32, 1];

const displayDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** The unsaved new-entry draft, restored on return (title, mood and body). */
function readDraft() {
  try {
    const body = JSON.parse(localStorage.getItem("journal-draft") || "null");
    let content = null;
    if (body?.content) content = typeof body.content === "string" ? JSON.parse(body.content) : body.content;
    return {
      title: localStorage.getItem("journal-draft-title") || "",
      mood: localStorage.getItem("journal-draft-mood") || randomMood(),
      content,
    };
  } catch {
    return { title: "", mood: randomMood(), content: null };
  }
}

function clearDraft() {
  try {
    ["journal-draft", "journal-draft-title", "journal-draft-mood"].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable — the draft just isn't cleared */
  }
}

/**
 * An entry as a page, the way Writing edits a post: a top bar with state and
 * actions, then the document — mood, date and time, a large title, and the
 * body with "/" blocks. New entries save with "Save entry"; existing ones
 * save as you go (each session keeps a "before" version you can restore).
 */
export default function JournalDocument({ entry, initialDate, history = [], onCreate, onUpdate, onDelete, onClose }) {
  const isNew = !entry;
  const today = getPhDateKey();
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("📝");
  const [content, setContent] = useState(null);
  const draftDate = /^\d{4}-\d{2}-\d{2}$/.test(initialDate || "") && !Number.isNaN(Date.parse(initialDate)) ? initialDate : today;
  const [date, setDate] = useState(draftDate);
  const [time, setTime] = useState("");
  const [versions, setVersions] = useState(history);
  const [state, setState] = useState("idle"); // idle | saving | saved
  const [picking, setPicking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState(false);
  const titleRef = useRef(null);
  const editorRef = useRef(null);
  const snapshotted = useRef(false);
  const timer = useRef(null);
  const loaded = useRef(false);

  // Load the entry (or the saved draft) once per open
  useEffect(() => {
    loaded.current = false;
    if (entry) {
      setTitle(entry.title || "");
      setMood(entry.mood || "📝");
      setContent(entry.content || null);
      setDate(entry.isoDate || today);
      setTime(to24Hour(entry.time) || "");
    } else {
      // Restore the draft, but never over anything typed in the first frames
      const d = readDraft();
      setTitle((t) => t || d.title);
      setMood(d.mood);
      setContent((c) => c || d.content);
      setDate(draftDate);
      setTime("");
    }
    setVersions(history);
    snapshotted.current = false;
    setState("idle");
    setRefined(false);
    requestAnimationFrame(() => {
      loaded.current = true;
      if (!entry) titleRef.current?.focus();
    });
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // New entries keep their title and mood as a draft (the body autosaves itself)
  useEffect(() => {
    if (!isNew || !loaded.current) return;
    try {
      localStorage.setItem("journal-draft-title", title);
      localStorage.setItem("journal-draft-mood", mood);
    } catch {
      /* private mode */
    }
  }, [isNew, title, mood]);

  // Title grows with its text, like Writing's
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const build = (over = {}) => {
    const c = over.content ?? content;
    const t = (over.title ?? title).trim() || "Untitled Entry";
    const d = over.date ?? date;
    return {
      ...(entry || {}),
      title: t,
      mood: over.mood ?? mood,
      content: c,
      preview: entryPreview(c) || "No additional text",
      isoDate: d,
      date: displayDate(d),
      time: to12Hour(over.time ?? time) || entry?.time || new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  };

  /** Existing entries save as you type: the first change of a session keeps a "before" version. */
  const schedule = (over = {}) => {
    if (isNew || !loaded.current) return;
    let nextVersions = versions;
    if (!snapshotted.current) {
      snapshotted.current = true;
      nextVersions = [
        ...versions,
        { timestamp: Date.now(), title: entry.title, content: entry.content, mood: entry.mood, date: entry.isoDate, time: entry.time, action: "Manual Edit" },
      ];
      setVersions(nextVersions);
    }
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onUpdate(build(over), nextVersions);
      setState("saved");
    }, 700);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const hasContent = title.trim().length > 0 || entryText(content).length > 0;
  const close = () => {
    if (!isNew && state === 'saving') {
      clearTimeout(timer.current);
      onUpdate(build(), versions);
    }
    onClose();
  };

  const create = async () => {
    if (!hasContent) return;
    setState("saving");
    const now = new Date();
    const fresh = {
      ...build(),
      id: Date.now(),
      isoDate: date,
      date: displayDate(date),
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    // The old journal's short beat before "logged": it reads as care, not lag
    await new Promise((r) => setTimeout(r, 450));
    clearDraft();
    onCreate(fresh);
  };

  // ⌘/Ctrl+S saves; Escape leaves (after closing whatever is open)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isNew) void create();
        else {
          clearTimeout(timer.current);
          onUpdate(build(), versions);
          setState("saved");
        }
      } else if (e.key === "Escape") {
        if (picking) setPicking(false);
        else if (showHistory) setShowHistory(false);
        else if (confirmDelete) setConfirmDelete(false);
        else if (!e.target.closest?.(".ProseMirror")) close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const refine = async () => {
    setRefining(true);
    setRefined(false);
    const before = [...versions, { timestamp: Date.now(), title, content, mood, date, time: to12Hour(time), action: "Before Stoic Rewrite" }];
    setVersions(before);
    try {
      const result = await refineEntryWithGemini(title, content);
      const next = { title: result.title || title, content: result.content || content };
      setTitle(next.title);
      setContent(next.content);
      onUpdate(build(next), before);
      setRefined(true);
      setState("saved");
    } catch (e) {
      console.error(e);
      alert("Couldn't rewrite this entry. Try again in a moment.");
    } finally {
      setRefining(false);
    }
  };

  const restore = (version) => {
    const nextVersions = [...versions, { timestamp: Date.now(), title, content, mood, action: "Reverted Change" }];
    setTitle(version.title);
    setContent(version.content);
    setMood(version.mood);
    if (version.date) setDate(version.date);
    setVersions(nextVersions);
    onUpdate(build({ title: version.title, content: version.content, mood: version.mood, date: version.date || date }), nextVersions);
    setShowHistory(false);
    setRefined(false);
    setState("saved");
  };

  const words = wordCount(content);

  return (
    <div className="sn-doc">
      {/* Top bar, as Writing's editor bar */}
      <div className="sn-doc-bar">
        <button type="button" className="sn-doc-back" onClick={close} aria-label="Back to all entries" data-sound="select">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <span className={`sn-doc-status ${isNew ? "is-draft" : ""}`}>
          <span className="sn-doc-dot" aria-hidden="true" />
          {isNew ? "Draft" : "Saved entry"}
        </span>
        <span className="sn-doc-saved" role="status">
          {isNew ? "Draft saved on this device" : state === "saving" ? "Saving…" : state === "saved" ? "Saved" : `Written ${entry.date || ""}`}
        </span>

        <div className="sn-doc-actions">
          {!isNew && (
            <div className="sn-doc-tools">
              <button type="button" className="sn-doc-icon" aria-label="Version history" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
                <ClockCounterClockwise size={18} aria-hidden="true" />
              </button>
              {refined ? (
                <Button variant="secondary" size="sm" icon={<ArrowCounterClockwise size={14} aria-hidden="true" />} onClick={() => restore(versions[versions.length - 1])} aria-label="Undo rewrite">
                  <span className="sn-doc-label">Undo rewrite</span>
                </Button>
              ) : (
                <Button variant="secondary" size="sm" icon={<Sparkle size={14} aria-hidden="true" />} loading={refining} disabled={refining || !hasContent} onClick={refine} aria-label="Stoic rewrite">
                  <span className="sn-doc-label">{refining ? "Rewriting…" : "Stoic rewrite"}</span>
                </Button>
              )}
              <div className="relative">
                <button type="button" className="sn-doc-icon" aria-label="Delete entry" onClick={() => setConfirmDelete((v) => !v)}>
                  <Trash size={18} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {confirmDelete && (
                    <motion.div
                      className="sn-doc-confirm"
                      role="dialog"
                      aria-label="Delete entry?"
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                    >
                      <p>Delete this entry? This can&apos;t be undone.</p>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                          Keep
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(entry.id)}>
                          Delete
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          {isNew ? (
            <Button variant="primary" onClick={() => void create()} disabled={!hasContent || state === "saving"} loading={state === "saving"} data-sound="none">
              {state === "saving" ? "Saving…" : "Save entry"}
            </Button>
          ) : (
            <Button variant="primary" onClick={close} data-keycap>
              Done
            </Button>
          )}
        </div>
      </div>

      <article className="sn-doc-page">
        {/* Mood: the entry's icon, as a post's emoji */}
        <div className="relative">
          <button type="button" className="sn-doc-mood" aria-label={`Mood: ${mood}. Change`} aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
            <Fluent emoji={mood} size={64} />
          </button>
          <AnimatePresence>
            {picking && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPicking(false)} aria-hidden="true" />
                <motion.div
                  className="sn-doc-picker"
                  initial={{ opacity: 0, scale: 0.97, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <EmojiPicker
                    onPick={(e) => {
                      setMood(e);
                      setPicking(false);
                      schedule({ mood: e });
                    }}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="sn-doc-meta">
          {/* Friendly text on top, the native picker underneath (transparent, full size) */}
          <label className={`sn-doc-when ${isNew ? "is-locked" : ""}`}>
            <span aria-hidden="true">{new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={today}
              disabled={isNew}
              onChange={(e) => {
                if (!e.target.value) return;
                setDate(e.target.value);
                schedule({ date: e.target.value });
              }}
            />
          </label>
          <label className={`sn-doc-when ${isNew ? "is-locked" : ""}`}>
            <span aria-hidden="true">{isNew ? "Now" : to12Hour(time) || "Add a time"}</span>
            <input
              type="time"
              aria-label="Time"
              value={time}
              disabled={isNew}
              onChange={(e) => {
                setTime(e.target.value);
                schedule({ time: e.target.value });
              }}
            />
          </label>
          <span className="sn-doc-mono">{words === 1 ? "1 word" : `${words} words`}</span>
        </div>

        <textarea
          ref={titleRef}
          className="sn-doc-title"
          value={title}
          rows={1}
          placeholder="Title your entry"
          aria-label="Title"
          onChange={(e) => {
            setTitle(e.target.value);
            schedule({ title: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editorRef.current?.focus();
            }
          }}
        />

        <RichTextEditor
          ref={editorRef}
          variant="document"
          content={content}
          onChange={(json) => {
            setContent(json);
            schedule({ content: json });
          }}
          placeholder="Write your thoughts… type / for blocks"
          autoSaveKey={isNew ? "journal-draft" : null}
        />
      </article>

      {/* Version history, as a side panel */}
      <SenecaPortal><AnimatePresence>
        {showHistory && (
          <motion.aside
            className="sn-doc-history"
            aria-label="Version history"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12, transition: { duration: 0.14 } }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          >
            <div className="flex items-center justify-between">
              <h2>Versions</h2>
              <button type="button" className="sn-doc-icon" aria-label="Close versions" onClick={() => setShowHistory(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {versions.length === 0 ? (
              <p className="text-[13px] text-ink-2">Edits made while this entry is open keep a version here.</p>
            ) : (
              <ul>
                {versions
                  .slice()
                  .reverse()
                  .map((v, i) => (
                    <li key={v.timestamp || i}>
                      <div className="flex items-start justify-between gap-2">
                        <span>
                          <strong>{v.action || "Edit"}</strong>
                          <small>{new Date(v.timestamp).toLocaleString()}</small>
                        </span>
                        <Button variant="secondary" size="sm" icon={<ArrowCounterClockwise size={12} aria-hidden="true" />} onClick={() => restore(v)}>
                          Restore
                        </Button>
                      </div>
                      <p className="truncate font-[600]">{v.title}</p>
                      <p className="line-clamp-2 text-ink-2">{entryPreview(v.content)}</p>
                    </li>
                  ))}
              </ul>
            )}
          </motion.aside>
        )}
      </AnimatePresence></SenecaPortal>

      <div className="sn-doc-hints" aria-hidden="true">
        <Kbd size="sm">/</Kbd> blocks
        <Kbd size="sm">Ctrl S</Kbd> save
        <Kbd size="sm">Esc</Kbd> all entries
      </div>
    </div>
  );
}
