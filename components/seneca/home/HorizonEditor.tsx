"use client";
import React from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import { Input } from '@cloudflare/kumo/components/input';
import AdminSelect from '@/app/admin/ui/AdminSelect';
import { validBlock, blockMinutes, type TimeBlock } from '@/lib/seneca/utils/horizon';

export type HorizonTask = { key: string; phaseId: string; id: number; title: string; done: boolean; emoji?: string };

function ClockField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const hour = Math.floor(value / 60) % 24;
  const minute = value % 60;
  return <fieldset className="hz-clock"><legend>{label}</legend><div>
    <AdminSelect label={`${label} hour`} hideLabel value={String(hour % 12 || 12)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }))} onValueChange={v => onChange((Number(v) % 12 + (hour >= 12 ? 12 : 0)) * 60 + minute)} />
    <span aria-hidden="true">:</span>
    <AdminSelect label={`${label} minute`} hideLabel value={String(minute)} options={Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }))} onValueChange={v => onChange(hour * 60 + Number(v))} />
    <AdminSelect label={`${label} period`} hideLabel value={hour >= 12 ? 'PM' : 'AM'} options={['AM', 'PM'].map(v => ({ value: v, label: v }))} onValueChange={v => onChange((hour % 12 + (v === 'PM' ? 12 : 0)) * 60 + minute)} />
  </div></fieldset>;
}

export default function HorizonEditor({ draft, tasks, onChange, onSave, onClose, onRemove }: {
  draft: TimeBlock; tasks: HorizonTask[]; onChange: (b: TimeBlock) => void;
  onSave: () => void; onClose: () => void; onRemove: () => void;
}) {
  return <form className="hz-editor" aria-label="Plan a time block" onSubmit={e => { e.preventDefault(); onSave(); }} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <div className="hz-editor-head"><h3>{draft.id ? 'Edit time block' : 'Plan a time block'}</h3><button type="button" className="hz-icon" onClick={onClose} aria-label="Close time editor"><X size={18} /></button></div>
    <div className="hz-editor-fields">
      <AdminSelect label="Activity" value={draft.taskKey} options={[{ value: '', label: 'Custom time block' }, ...tasks.map(t => ({ value: t.key, label: t.title }))]} onValueChange={value => onChange({ ...draft, taskKey: value, title: tasks.find(t => t.key === value)?.title || draft.title })} />
      <label className="hz-name"><span>Block name</span><Input aria-label="Block name" autoFocus required maxLength={80} readOnly={!!draft.taskKey} value={draft.title} onChange={e => onChange({ ...draft, title: e.target.value })} /></label>
      <ClockField label="Starts" value={draft.start} onChange={start => onChange({ ...draft, start })} />
      <ClockField label="Ends" value={draft.end} onChange={end => onChange({ ...draft, end })} />
    </div>
    <div className="hz-editor-foot"><div className="hz-colors" role="group" aria-label="Block colour">{['sage', 'apricot', 'butter', 'coral'].map(tone => <button key={tone} className={`hz-color sn-time-${tone}`} type="button" aria-label={tone} aria-pressed={tone === draft.tone} onClick={() => onChange({ ...draft, tone })}>{tone === draft.tone && <Check size={15} />}</button>)}</div>
      <p>{!validBlock(draft) ? 'Add a name and different start and end times.' : `${blockMinutes(draft)} min${draft.end < draft.start ? ' · overnight' : ''} · repeats daily`}</p>
      <div>{draft.id && <button type="button" className="sn-btn sn-btn-outline" onClick={onRemove}><Trash2 size={15} />Remove</button>}<button type="submit" className="sn-btn sn-btn-primary" disabled={!validBlock(draft)} data-sound="pop">Save time block</button></div>
    </div>
  </form>;
}
