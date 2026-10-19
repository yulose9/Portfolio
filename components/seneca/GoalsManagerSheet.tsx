// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef } from "react";
import { GripVertical, Eye, EyeOff, Pencil, Pin, Plus, X } from "lucide-react";
import { usePersonalGoals } from "@/lib/seneca/context/PersonalGoalsContext";
import { suggestGoals } from "@/lib/seneca/utils/streaks";
import GoalEditSheet, { GOAL_TEMPLATES } from "./GoalEditSheet";
import Sheet from "./Sheet";

import { Reorder, motion, useDragControls, useReducedMotion } from "framer-motion";
import { playSound } from "@/app/components/ui/sound";
import GoalIcon from "./GoalIcon";
import { useGrabbingCursor } from "@/app/lib/grabbing";
const MAX_PINS = 3;
function GoalRow({ goal, children, onDrop, onMove }) {
  const controls = useDragControls();
  const reduce = useReducedMotion();
  // data-lifted rings the row being carried; its neighbours step back (seneca-sunlit.css).
  const [lifted, setLifted] = useState(false);
  return <Reorder.Item value={goal.id} dragListener={false} dragControls={controls} onDragStart={() => setLifted(true)} onDragEnd={() => { setLifted(false); onDrop(); }} data-lifted={lifted || undefined} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 36 }} className={`sn-manage-row ${goal.hiddenAt ? 'is-hidden' : ''}`} style={{ position: 'relative' }} whileDrag={{ zIndex: 2, boxShadow: '0 6px 18px #0002' }}>
    <button type="button" className="sn-goal-grip" aria-label={`Reorder ${goal.title}`} aria-describedby="sn-goal-order-help" onPointerDown={e => controls.start(e)} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); onMove(e.key === 'ArrowUp' ? -1 : 1); } }}><GripVertical size={17} /></button>{children}
  </Reorder.Item>;
}

/**
 * Choose what Home's "Keep going" shows. Pin up to three goals; any empty
 * slot is filled by the system's pick for today (a streak at risk first),
 * and each goal says why it would be picked. Edit or add goals from here.
 */
export default function GoalsManagerSheet({ open, onClose }) {
  const { getGoalsArray, goalHistory, setGoalPinned, setGoalHidden, reorderGoals } = usePersonalGoals();
  useGrabbingCursor();
  const [editing, setEditing] = useState(null); // goal | "new" | template
  const source = getGoalsArray();
  const signature = source.map(g => g.id).join('|');
  const [order, setOrder] = useState(source.map(g => g.id));
  const latest = useRef(order);
  useEffect(() => { const ids = signature.split('|').filter(Boolean); setOrder(ids); latest.current = ids; }, [signature, open]);
  const goals = order.map(id => source.find(g => g.id === id)).filter(Boolean);
  const persist = () => { reorderGoals(latest.current); playSound('pop', { velocity: .4 }); };
  const move = (id, delta) => { const ids = [...order]; const from = ids.indexOf(id), to = Math.max(0, Math.min(ids.length - 1, from + delta)); [ids[from], ids[to]] = [ids[to], ids[from]]; latest.current = ids; setOrder(ids); persist(); };
  const picks = Object.fromEntries(suggestGoals(goals, goalHistory || {}).map((p) => [p.id, p]));
  const pinnedCount = goals.filter((g) => g.pinnedAt).length;
  const existing = new Set(goals.map((g) => g.title.toLowerCase()));
  const templates = GOAL_TEMPLATES.filter((t) => !existing.has(t.title.toLowerCase())).slice(0, 4);

  return (
    <>
      <Sheet open={open && !editing} onClose={onClose} label="Keep going on Home" className="sn-sheet">
        <div className="sn-sheet-head">
          <div>
            <h2>Keep going</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Drag to arrange your goals. Pinned goals come first; hidden goals stay off Home.
            </p>
          </div>
          <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <motion.div layoutScroll className="sn-sheet-body">
          <p id="sn-goal-order-help" className="text-xs text-ink-2">Drag a handle, or focus it and use ↑ / ↓.</p>
          <Reorder.Group axis="y" values={order} onReorder={ids => { latest.current = ids; setOrder(ids); }} className="sn-goal-order">
            {goals.map((goal) => {
              const pick = picks[goal.id];
              const pinned = !!goal.pinnedAt;
              const hidden = !!goal.hiddenAt;
              const full = !pinned && pinnedCount >= MAX_PINS;
              return (
                <GoalRow key={goal.id} goal={goal} onDrop={persist} onMove={delta => move(goal.id, delta)}>
                  <span className="sn-tile sn-tile-sm" aria-hidden="true"><GoalIcon goal={goal} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-[600] text-ink">{goal.title}</span>
                    <span className={`block truncate text-[12.5px] ${!hidden && pick?.rank === 0 ? "text-accent font-[600]" : "text-ink-2"}`}>
                      {hidden ? "Hidden from Home" : pick?.reason}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="sn-icon-btn"
                    aria-label={`Edit ${goal.title}`}
                    onClick={() => setEditing(goal)}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="sn-icon-btn"
                    aria-pressed={!hidden}
                    aria-label={hidden ? `Show ${goal.title} on Home` : `Hide ${goal.title} from Home`}
                    title={hidden ? "Show on Home" : "Hide from Home"}
                    onClick={() => setGoalHidden(goal.id, !hidden)}
                  >
                    {hidden ? <EyeOff size={16} strokeWidth={2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    className={`sn-pin ${pinned ? "is-on" : ""}`}
                    aria-pressed={pinned}
                    aria-label={pinned ? `Unpin ${goal.title} from Home` : `Pin ${goal.title} to Home`}
                    disabled={full || hidden}
                    title={hidden ? "Show it first to pin it" : full ? `Unpin one first — Home shows ${MAX_PINS}` : undefined}
                    onClick={() => setGoalPinned(goal.id, !pinned)}
                  >
                    <Pin size={14} strokeWidth={2} aria-hidden="true" />
                    {pinned ? "Pinned" : "Pin"}
                  </button>
                </GoalRow>
              );
            })}
          </Reorder.Group>

          {templates.length > 0 && (
            <div className="mt-2">
              <p className="mb-2 text-[13px] font-[600] text-ink-2">Ideas to try</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button key={t.title} type="button" className="sn-idea" onClick={() => setEditing({ template: t })}>
                    <span aria-hidden="true">{t.emoji}</span>
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="sn-sheet-foot">
          <button type="button" className="sn-btn sn-btn-outline ml-auto" data-sound="pop" onClick={() => setEditing("new")}>
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            New goal
          </button>
          <button type="button" className="sn-btn sn-btn-dark" onClick={onClose}>
            Done
          </button>
        </div>
      </Sheet>

      <GoalEditSheet
        open={open && !!editing}
        onClose={() => setEditing(null)}
        goal={editing && editing !== "new" && !editing.template ? editing : null}
        template={editing?.template || null}
      />
    </>
  );
}
