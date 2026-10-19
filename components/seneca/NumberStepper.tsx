"use client";
import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/app/components/kit/button';
import Num from './Num';

export default function NumberStepper({ label, value, onChange, min, max, less, more, unit }: {
  label: string; value: number; onChange: (value: number) => void; min: number; max: number;
  less: string; more: string; unit?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.trunc(n)));
  function finish() {
    if (draft?.trim() && Number.isFinite(Number(draft))) onChange(clamp(Number(draft)));
    setDraft(null);
  }
  return <div className="sn-goal-streak" role="group" aria-label={label}>
    <Button variant="outline" size="icon" aria-label={less} data-sound="tick" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}><Minus size={18} /></Button>
    {draft !== null ? <input autoFocus type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={draft} onChange={e => setDraft(e.target.value)} onBlur={finish} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); } }} /> : <button type="button" className="sn-goal-streak-value" aria-label={`${label}: ${value}. Edit number`} onClick={() => setDraft(String(value))}><Num value={value} format={{ useGrouping: false }} />{unit && <> <span>{unit}</span></>}</button>}
    <Button variant="outline" size="icon" aria-label={more} data-sound="tick" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}><Plus size={18} /></Button>
  </div>;
}
