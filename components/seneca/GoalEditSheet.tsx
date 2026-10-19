// @ts-nocheck
"use client";
import { Fluent } from "@/app/admin/ui/extensions/emoji";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Trash2, X } from "lucide-react";
import { usePersonalGoals } from "@/lib/seneca/context/PersonalGoalsContext";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import Sheet from "./Sheet";
import NumberStepper from "./NumberStepper";
import GoalIcon from "./GoalIcon";
import IconSources from "@/app/admin/ui/IconSources";
import { Calendar } from "@/app/components/kit/inputs/calendar";
import { Button } from "@/app/components/kit/button";

export const GOAL_COLORS = [
  { color: "#5F8F69", name: "Sage" },
  { color: "#F5A55B", name: "Apricot" },
  { color: "#E2625C", name: "Coral" },
  { color: "#E9B949", name: "Butter" },
  { color: "#5AA0C8", name: "Sky" },
  { color: "#9256C9", name: "Plum" },
  { color: "#262523", name: "Charcoal" },
];

const EMOJI_PICKS = ["🎯", "💧", "🚶", "🧘", "📖", "🏋️", "🥗", "😴", "🚫", "🍬", "📵", "✍️", "🙏", "🧹", "💰", "🎸"];

/** Starting points the system can offer when you add a goal. */
export const GOAL_TEMPLATES = [
  { emoji: "💧", title: "Drink 2L of water", color: "#5AA0C8" },
  { emoji: "🚶", title: "Walk 8,000 steps", color: "#5F8F69" },
  { emoji: "🧘", title: "Meditate 10 minutes", color: "#9256C9" },
  { emoji: "📖", title: "Read 20 pages", color: "#F5A55B" },
  { emoji: "📵", title: "No phone after 10pm", color: "#262523" },
  { emoji: "🍬", title: "No added sugar", color: "#E2625C" },
];

/**
 * Create or edit a personal goal — every part of it: emoji, name, colour,
 * the day you started, the current streak, and whether Home shows it.
 * `goal` null + open = a new goal (optionally prefilled from a template).
 */
export default function GoalEditSheet({ open, onClose, goal = null, template = null }) {
  const { addGoal, updateGoal, setGoalStreak, setGoalPinned, deleteGoal, getGoalStreak, getGoalHistory } = usePersonalGoals();
  const isNew = !goal;
  const today = getPhDateKey();

  const [emoji, setEmoji] = useState("🎯");
  const [iconSrc, setIconSrc] = useState("");
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [choosingDate, setChoosingDate] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0].color);
  const [startDate, setStartDate] = useState(today);
  const [streak, setStreak] = useState(0);
  const [countToday, setCountToday] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load the goal (or template) each time the sheet opens
  useEffect(() => {
    if (!open) return;
    const source = goal || template || {};
    setEmoji(source.emoji || "🎯");
    setIconSrc(source.iconSrc || "");
    setChoosingIcon(false); setChoosingDate(false);
    setTitle(source.title || "");
    setColor(source.color || GOAL_COLORS[0].color);
    setStartDate(goal?.startDate || (goal?.createdAt ? goal.createdAt.slice(0, 10) : today));
    setStreak(goal ? getGoalStreak(goal.id) : 0);
    setCountToday(goal ? getGoalHistory(goal.id)[today] === true : false);
    setPinned(!!goal?.pinnedAt);
    setConfirmDelete(false);
  }, [open, goal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const original = goal ? getGoalStreak(goal.id) : 0;
  const originalToday = goal ? getGoalHistory(goal.id)[today] === true : false;
  const valid = title.trim().length > 0 && !!startDate && startDate <= today && !uploading;

  const save = () => {
    if (!valid) return;
    const patch = { emoji, iconSrc, title: title.trim(), color, startDate };
    let id = goal?.id;
    if (isNew) id = addGoal(emoji, title.trim(), color, { startDate, iconSrc });
    else updateGoal(id, patch);
    if (streak !== original || countToday !== originalToday) setGoalStreak(id, streak, { includeToday: countToday });
    if (pinned !== !!goal?.pinnedAt) setGoalPinned(id, pinned);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label={isNew ? "New goal" : `Edit ${goal?.title}`} className="sn-sheet">
      <div className="sn-sheet-head">
        <h2>{isNew ? "New goal" : "Edit goal"}</h2>
        <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="sn-sheet-body">
        {/* Identity: the emoji is the goal's face */}
        <div className="flex items-center gap-3">
          <span className="sn-goal-face" style={{ "--goal": color }} aria-hidden="true">
            <GoalIcon goal={{ emoji, iconSrc }} />
          </span>
          <label className="sn-field flex-1">
            <span>Name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Walk 8,000 steps"
              maxLength={60}
              autoFocus={isNew}
            />
          </label>
        </div>

        <div className="sn-field">
          <span>Emoji</span>
          <div className="sn-emoji-row" role="radiogroup" aria-label="Emoji">
            <input
              className="sn-emoji-input"
              value={emoji}
              onChange={(e) => { setEmoji(e.target.value.slice(0, 32)); setIconSrc(""); }}
              aria-label="Type any emoji"
            />
            {EMOJI_PICKS.map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={!iconSrc && emoji === e}
                aria-label={e}
                className="sn-emoji-pick"
                onClick={() => { setEmoji(e); setIconSrc(""); }}
              >
                <Fluent emoji={e} size={24} />
              </button>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={() => setChoosingIcon(!choosingIcon)} aria-expanded={choosingIcon}>Choose emoji, icon or upload</Button>
        {choosingIcon && <div className="sn-goal-icon-picker"><IconSources onBusy={setUploading} onEmoji={value => { setEmoji(value); setIconSrc(""); setChoosingIcon(false); }} onImage={src => { setIconSrc(src); setChoosingIcon(false); }} /></div>}

        <div className="sn-field">
          <span>Colour</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {GOAL_COLORS.map((c) => (
              <button
                key={c.color}
                type="button"
                role="radio"
                aria-checked={color === c.color}
                aria-label={c.name}
                title={c.name}
                className="sn-swatch"
                style={{ "--swatch": c.color }}
                onClick={() => setColor(c.color)}
              />
            ))}
          </div>
        </div>

        <div className="sn-field">
          <span>Tracking since</span>
          <Button variant="outline" className="sn-goal-date" aria-label="Tracking since" aria-expanded={choosingDate} onClick={() => setChoosingDate(!choosingDate)}><CalendarDays size={17} />{new Date(`${startDate}T12:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</Button>
          {choosingDate && <div className="sn-goal-calendar"><Calendar mode="single" selected={new Date(`${startDate}T12:00:00`)} defaultMonth={new Date(`${startDate}T12:00:00`)} disabled={{ after: new Date(`${today}T23:59:59`) }} weekStartsOn={1} onSelect={date => { if (!date) return; setStartDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`); setChoosingDate(false); }} /></div>}
        </div>
        <div className="sn-field">
          <span id="sn-streak-label">Current streak</span>
          <NumberStepper label="Streak in days" value={streak} onChange={setStreak} min={0} max={3650} less="One day less" more="One day more" unit={streak === 1 ? 'day' : 'days'} />
          <small className="text-ink-2">Tap the number to type a streak.</small>
        </div>

        <label className="sn-switch-row">
          <span>
            <strong>Counting today</strong>
            <small>The streak includes today, so today shows as kept.</small>
          </span>
          <input type="checkbox" role="switch" checked={countToday && streak > 0} disabled={streak === 0} onChange={(e) => setCountToday(e.target.checked)} />
        </label>

        <label className="sn-switch-row">
          <span>
            <strong>Pin on Home</strong>
            <small>Pinned goals appear first. Hide or show goals in Keep going.</small>
          </span>
          <input type="checkbox" role="switch" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        </label>
      </div>

      <div className="sn-sheet-foot">
        {!isNew && (
          <AnimatePresence mode="popLayout" initial={false}>
            {confirmDelete ? (
              <motion.div key="confirm" className="flex items-center gap-2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                <button
                  type="button"
                  className="sn-btn sn-btn-danger"
                  data-variant="destructive"
                  onClick={() => {
                    deleteGoal(goal.id);
                    onClose();
                  }}
                >
                  Delete with history
                </button>
                <button type="button" className="sn-more" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="ask"
                type="button"
                className="sn-btn sn-btn-ghost-danger"
                onClick={() => setConfirmDelete(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                Delete
              </motion.button>
            )}
          </AnimatePresence>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="sn-btn sn-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="sn-btn sn-btn-primary" data-sound="pop" onClick={save} disabled={!valid}>
            {isNew ? "Add goal" : "Save"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
