"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus, Clock3, Pencil, GripVertical, ChevronDown, ListChecks, PanelTopClose, Rows3 } from 'lucide-react';
import { Checkbox } from '@/app/components/kit/checkbox';
import { useProtocol } from '@/lib/seneca/context/ProtocolContext';
import { useTimeBlocks } from '@/lib/seneca/data/horizonData';
import { adjustBlock, blockMinutes, clockLabel, phMinute, planDay, segments, validBlock, type TimeBlock } from '@/lib/seneca/utils/horizon';
import Num from '../Num';
import { getPhDateKey } from '@/lib/seneca/utils/timeUtils';
import HorizonEditor, { type HorizonTask } from './HorizonEditor';
import { useHorizonDrag } from './useHorizonDrag';

type HorizonProtocol = {
  phaseOrder: string[];
  phaseTasks: Record<string, { id: number; title: string; done: boolean; emoji?: string }[]>;
  protocolCategory: string;
  toggleTask: (phaseId: string, taskId: number) => void;
};
const duration = (n: number) => `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}`;
function Duration({ minutes }: { minutes: number }) {
  return <><Num value={Math.floor(minutes / 60)} suffix="h" /> <Num value={minutes % 60} suffix="m" /></>;
}
function Fold({ title, count, children, defaultOpen = false }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const id = React.useId();
  return <div className="hz-fold">
    <button className="hz-fold-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} data-sound="select"><ListChecks size={16} /><span>{title}</span><span className="hz-count">{count}</span><ChevronDown size={16} className={open ? 'is-open' : ''} /></button>
    <AnimatePresence initial={false}>{open && <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : .18, ease: [.2, 0, 0, 1] }} className="hz-fold-body">{children}</motion.div>}</AnimatePresence>
  </div>;
}

export default function DayHorizon() {
  const { phaseOrder, phaseTasks, protocolCategory, toggleTask } = useProtocol() as HorizonProtocol;
  const [stored, setStored] = useTimeBlocks();
  const status = useTimeBlocks.useStatus();
  const reduce = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);
  const [draft, setDraft] = useState<TimeBlock | null>(null);
  const [compact, setCompact] = useState(false);
  const [inspect, setInspect] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const axis = useRef<HTMLDivElement>(null);
  const chart = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const tasks: HorizonTask[] = phaseOrder.flatMap(phaseId => (phaseTasks[phaseId] || []).map(t => ({ ...t, phaseId, key: `${phaseId}-${t.id}` })));
  const blocks = Object.values(stored || {}).filter((b): b is TimeBlock => !!b && b.category === protocolCategory && validBlock(b)).sort((a, b) => a.start - b.start);
  const commit = useCallback((block: TimeBlock) => {
    if (!validBlock(block)) return;
    const id = block.id || crypto.randomUUID();
    setStored(prev => ({ ...prev, [id]: { ...block, id, title: block.title.trim() } }));
    setAnnouncement(`${block.title} scheduled from ${clockLabel(block.start)} to ${clockLabel(block.end)}.`);
  }, [setStored]);
  const drag = useHorizonDrag(axis, chart, scroll, commit);
  const displayed = blocks.map(b => drag.preview?.id === b.id ? drag.preview : b);
  if (drag.preview && !blocks.some(b => b.id === drag.preview?.id)) displayed.push(drag.preview);
  const plan = planDay(displayed);
  const unscheduled = tasks.filter(t => !blocks.some(b => b.taskKey === t.key));
  const atMinute = inspect ?? now;
  const at = atMinute === null ? [] : displayed.filter(b => segments(b).some(s => atMinute >= s.start && atMinute < s.end));
  const currentBlocks = blocks.filter(b => now !== null && segments(b).some(s => now >= s.start && now < s.end));
  const today = getPhDateKey();
  const titleOf = (b: TimeBlock) => tasks.find(t => t.key === b.taskKey)?.title || b.title;
  const remaining = now === null ? null : 1440 - now;
  function isDone(block: TimeBlock) {
    const task = tasks.find(t => t.key === block.taskKey);
    return task ? !!task.done : block.doneOn === today;
  }
  function toggleBlock(block: TimeBlock) {
    const task = tasks.find(t => t.key === block.taskKey);
    if (task) { toggleTask(task.phaseId, task.id); return; }
    setStored(prev => {
      const saved = prev[block.id];
      return saved ? { ...prev, [block.id]: { ...saved, doneOn: saved.doneOn === today ? null : today } } : prev;
    });
  }
  useEffect(() => {
    const tick = () => setNow(phMinute());
    tick();
    const timer = window.setInterval(tick, 15000);
    try { setCompact(localStorage.getItem('seneca_horizon_compact') === 'true'); } catch { /* optional preference */ }
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (draft) editor.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'instant' : 'smooth' });
  }, [draft?.id, !!draft, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  function makeBlock(task?: HorizonTask): TimeBlock {
    const start = Math.min(1410, Math.ceil((now ?? 480) / 30) * 30);
    return { id: '', category: protocolCategory, title: task?.title || '', taskKey: task?.key || '', start, end: start + 30, tone: 'sage' };
  }
  function close() { setDraft(null); addButton.current?.focus(); }
  function keyAdjust(e: React.KeyboardEvent, block: TimeBlock, mode: 'move' | 'start' | 'end') {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    commit(adjustBlock(block, mode, (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 30 : 5)));
  }
  function jumpNow() {
    if (!scroll.current || now === null || !axis.current) return;
    scroll.current.scrollTo({ left: now / 1440 * axis.current.offsetWidth - (scroll.current.clientWidth - 150) / 2, behavior: reduce ? 'instant' : 'smooth' });
    setInspect(null);
  }
  function inspectPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.dragging) return;
    const r = e.currentTarget.getBoundingClientRect();
    setInspect(Math.max(0, Math.min(1439, Math.round((e.clientX - r.left) / r.width * 1440))));
  }
  const guide = <>{now !== null && <i className="hz-now-line" style={{ left: `${now / 14.4}%` }} />}{inspect !== null && <i className="hz-inspect-line" style={{ left: `${inspect / 14.4}%` }} />}</>;
  return <section className={`sn-horizon sn-card ${compact ? 'is-compact' : ''} ${drag.dragging ? 'is-dragging' : ''}`} aria-labelledby="sn-horizon-title">
    <header className="hz-head"><div><h2 id="sn-horizon-title"><Clock3 size={20} />Your daily rhythm</h2><p>Philippine time · {protocolCategory} protocol · repeats daily</p></div>
      <div className="hz-actions"><button className="hz-view" aria-label={compact ? 'Expand timeline' : 'Compact timeline'} aria-pressed={compact} onClick={() => { setCompact(!compact); try { localStorage.setItem('seneca_horizon_compact', String(!compact)); } catch { /* optional preference */ } }} data-sound="select">{compact ? <Rows3 size={16} /> : <PanelTopClose size={16} />}<span>{compact ? 'Expand' : 'Compact'}</span></button><button ref={addButton} className="sn-btn sn-btn-primary" onClick={() => setDraft(makeBlock())} disabled={status === 'loading'}><Plus size={16} />Plan time</button></div>
    </header>
    <div className="hz-stats">
      <div><span>Planned</span><strong><Num value={plan.covered / 60} format={{ maximumFractionDigits: 1 }} /> <small>hours</small></strong></div>
      <div><span>Left open</span><strong><Duration minutes={1440 - plan.covered} /></strong></div>
      <div><span>Until midnight</span><strong>{remaining === null ? '—' : <Duration minutes={remaining} />}</strong><small>{remaining === null ? '—' : <Num value={remaining / 14.4} format={{ maximumFractionDigits: 1 }} suffix="%" />} of today left</small><div className="hz-day-meter" aria-hidden="true"><i style={{ width: `${(remaining ?? 1440) / 14.4}%` }} /></div></div>
    </div>
    <div className="hz-current" aria-label="Current habits"><div><span className="hz-live-dot" />Now <small>{now === null ? '—' : clockLabel(now)}</small></div>{currentBlocks.length ? currentBlocks.map(block => {
      const done = isDone(block);
      return <label key={block.id}><Checkbox className="hz-check" aria-label={`Complete current habit ${titleOf(block)}`} checked={done} onCheckedChange={() => toggleBlock(block)} data-sound={done ? 'toggleOff' : 'check'} /><span className={done ? 'is-done' : ''}>{titleOf(block)}</span><small>{done ? 'Done' : 'Mark done'}</small></label>;
    }) : <p>Open time. Make room for what matters.</p>}</div>
    <div className="hz-readout"><div><span>{inspect === null ? 'Now' : 'At'} <strong>{atMinute === null ? '—' : clockLabel(atMinute)}</strong></span><p>{at.length ? at.map(titleOf).join(' · ') : 'Open time'}</p></div><button className="hz-view" onClick={jumpNow}>Go to now</button></div>
    <div className="hz-overview" aria-label="Whole day overview"><div>{Array.from({ length: 24 }, (_, h) => <span key={h} className={plan.placed.some(s => s.start < (h + 1) * 60 && s.end > h * 60) ? 'is-planned' : ''} />)}<input aria-label="Inspect time of day" type="range" min={0} max={1439} step={1} value={inspect ?? now ?? 0} onChange={e => setInspect(Number(e.target.value))} aria-valuetext={`${clockLabel(atMinute ?? 0)}, ${at.length ? at.map(titleOf).join(', ') : 'Open time'}`} /></div><p><span>12 AM</span><span>Slide to inspect the day</span><span>12 AM</span></p></div>
    <Fold title="Protocol tasks without a time" count={unscheduled.length} defaultOpen>
      <p className="hz-help">Drag a grip onto the timeline. Or tap a habit to choose its time.</p>
      <div className="hz-tray">{unscheduled.map(task => <div className="hz-habit" key={task.key}><button className="hz-grip" aria-label={`Drag ${task.title} onto timeline`} data-sound="flip" onPointerDown={e => drag.start(e, makeBlock(task), 'new')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(makeBlock(task)); }} disabled={status === 'loading'}><GripVertical size={16} /></button><button className="hz-habit-add" data-sound="select" onClick={() => setDraft(makeBlock(task))}><span aria-hidden="true">{task.emoji || '○'}</span>{task.title}<Plus size={14} /></button></div>)}{!unscheduled.length && <p className="hz-help">Every protocol habit has a place in your day.</p>}</div>
      {!!blocks.length && <><p className="hz-help">Already planned · drag to reschedule, or tap to edit.</p><div className="hz-tray hz-scheduled-tray">{blocks.map(block => <div className="hz-habit" key={block.id}><button className="hz-grip" aria-label={`Reschedule ${titleOf(block)} onto timeline`} data-sound="flip" onPointerDown={e => drag.start(e, block, 'place')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(block); }}><GripVertical size={16} /></button><button className="hz-habit-add" data-sound="select" onClick={() => setDraft(block)}><i className={`hz-agenda-dot sn-time-${block.tone}`} /><span>{titleOf(block)}<small>{clockLabel(block.start)}–{clockLabel(block.end)}</small></span><Pencil size={14} /></button></div>)}</div></>}
    </Fold>
    <div ref={chart} className="hz-chart" data-testid="horizon-chart"><div className="hz-chart-scroll" ref={scroll} tabIndex={0} role="region" aria-label="24-hour habit timeline"><div className="hz-grid" onPointerLeave={() => { if (!compact && !drag.dragging) setInspect(null); }}>
      <div className="hz-ruler-row"><div className="hz-label hz-ruler-label">Habit <span>{displayed.length}</span></div><div ref={axis} className="hz-ruler" onPointerMove={inspectPointer}><div className="hz-periods"><span>Night</span><span>Morning</span><span>Afternoon</span><span>Evening</span></div><div className="hz-hours">{Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 12 || 12}{h % 12 === 0 && <small>{h ? 'PM' : 'AM'}</small>}</span>)}</div>{guide}{inspect !== null && <span className="hz-time-tag" style={{ left: `clamp(32px, ${inspect / 14.4}%, calc(100% - 32px))` }}>{clockLabel(inspect)}</span>}</div></div>
      {compact && <motion.div key="compact-track" className="hz-compact-track hz-row-track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : .18 }} onPointerMove={inspectPointer}>
        {displayed.flatMap(block => segments(block).map((segment, index) => <button key={`${block.id}-${index}`} className={`hz-compact-block sn-time-${block.tone}`} style={{ left: `${segment.start / 14.4}%`, width: `${(segment.end - segment.start) / 14.4}%` }} aria-label={`Inspect ${titleOf(block)}, ${clockLabel(block.start)} to ${clockLabel(block.end)}`} onFocus={() => setInspect(segment.start)} onClick={() => { setInspect(segment.start); setDraft(block); }}><span>{titleOf(block)}</span></button>))}{guide}
      </motion.div>}
      {!compact && displayed.map(block => {
        return <div className={`hz-row ${drag.preview?.id === block.id ? 'is-preview' : ''}`} key={block.id || 'preview'}>
          <div className="hz-label"><button className="hz-row-grip" aria-label={`Move habit ${titleOf(block)}`} aria-describedby="hz-drag-help" data-sound="flip" onPointerDown={e => drag.start(e, block, 'move')} onKeyDown={e => keyAdjust(e, block, 'move')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(block); }}><GripVertical size={14} /></button><button onClick={() => setDraft(block)} title={titleOf(block)}><span>{titleOf(block)}</span><small>{clockLabel(block.start)}–{clockLabel(block.end)}</small></button></div>
          <div className="hz-row-track" data-block-id={block.id} onPointerMove={inspectPointer}>
            {segments(block).map((s, index) => <div key={index} className={`sn-time-block sn-time-${block.tone} ${isDone(block) ? 'is-done' : ''}`} style={{ left: `${s.start / 14.4}%`, width: `${(s.end - s.start) / 14.4}%` }}>
              <button className="hz-block-body" data-sound="flip" aria-label={`Move ${titleOf(block)}, ${clockLabel(block.start)} to ${clockLabel(block.end)}`} aria-describedby="hz-drag-help" onPointerDown={e => drag.start(e, block, 'move')} onKeyDown={e => keyAdjust(e, block, 'move')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(block); }}><span>{titleOf(block)}</span><small>{clockLabel(block.start)} – {clockLabel(block.end)}</small></button>
              {s.start === block.start && <button className="hz-resize hz-resize-start" aria-label={`Resize start of ${titleOf(block)}`} data-sound="flip" onPointerDown={e => drag.start(e, block, 'start')} onKeyDown={e => keyAdjust(e, block, 'start')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(block); }} />}
              {s.end === block.end && <button className="hz-resize hz-resize-end" aria-label={`Resize end of ${titleOf(block)}`} data-sound="flip" onPointerDown={e => drag.start(e, block, 'end')} onKeyDown={e => keyAdjust(e, block, 'end')} onClick={e => { if (e.detail === 0 || !drag.suppressClick.current) setDraft(block); }} />}
            </div>)}{guide}
          </div>
        </div>;
      })}
      {!displayed.length && <div className="hz-row hz-empty-row"><div className="hz-label">Your first habit</div><div className="hz-row-track"><p>{status === 'loading' ? 'Loading your routine…' : 'Drop a habit here, or choose Plan time.'}</p>{guide}</div></div>}
    </div></div></div>
    {compact && <div className="hz-overlap-list" aria-label="Habits at inspected time">{at.length ? at.map(block => <button key={block.id} onClick={() => setDraft(block)}><i className={`sn-time-${block.tone}`} /><span>{titleOf(block)}</span><small>{clockLabel(block.start)}–{clockLabel(block.end)}</small><Pencil size={14} /></button>) : <p>Hover the line or slide the time control to explore your day.</p>}</div>}
    <div className="hz-chart-foot"><p id="hz-drag-help">Drag to move · edges to resize · arrow keys adjust 5 min, Shift 30 min · Esc cancels</p>{plan.overlap > 0 && <span>{duration(plan.overlap)} overlapping</span>}</div>
    {drag.preview && <div className="hz-drag-readout" role="status">{titleOf(drag.preview)} · {clockLabel(drag.preview.start)}–{clockLabel(drag.preview.end)} · {duration(blockMinutes(drag.preview))}</div>}
    <AnimatePresence initial={false}>{draft && <motion.div ref={editor} key="editor" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }} className="hz-editor-wrap"><HorizonEditor draft={draft} tasks={tasks} onChange={setDraft} onClose={close} onSave={() => { commit(draft); close(); }} onRemove={() => { setStored(prev => ({ ...prev, [draft.id]: null })); close(); }} /></motion.div>}</AnimatePresence>
    {!!blocks.length && <Fold title="Daily agenda" count={blocks.length}><ul className="hz-agenda">{blocks.map(block => {
      const task = tasks.find(t => t.key === block.taskKey);
      return <li key={block.id}><span className={`hz-agenda-dot sn-time-${block.tone}`} /><div><strong>{titleOf(block)}</strong><small>{clockLabel(block.start)} – {clockLabel(block.end)}{block.end < block.start ? ' · overnight' : ''}{block.taskKey && !task ? ' · original task removed' : ''}</small></div><span className="hz-duration">{duration(blockMinutes(block))}</span><Checkbox className="hz-check" aria-label={`Complete ${titleOf(block)}`} checked={isDone(block)} onCheckedChange={() => toggleBlock(block)} data-sound={isDone(block) ? "toggleOff" : "check"} /><button className="hz-icon" aria-label={`Edit block ${titleOf(block)}`} onClick={() => setDraft(block)}><Pencil size={16} /></button></li>;
    })}</ul></Fold>}
    <p className="hz-sync">{status === 'live' ? 'Cloud sync on' : status === 'local' ? 'Saved on this device' : status === 'offline' ? 'Offline · syncs when connected' : status === 'cached' ? 'Saved on this device · checking cloud' : 'Loading routine'}</p>
    <span className="sr-only" aria-live="polite">{announcement}</span>
    {drag.ghost && <div className="hz-ghost" style={{ left: drag.ghost.x + 14, top: drag.ghost.y - 42 }}>{drag.ghost.title}<small>{drag.preview ? clockLabel(drag.preview.start) : 'Drop onto the timeline'}</small></div>}
  </section>;
}




