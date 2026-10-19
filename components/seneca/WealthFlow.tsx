"use client";
import React, { useState } from 'react';
import Num, { pesoFormat } from './Num';
import { getPhDateKey, toDateKey } from '@/lib/seneca/utils/timeUtils';

type Transaction = { date: string; type: string; amount: number };
export default function WealthFlow({ transactions, deposits, withdrawals }: { transactions: Transaction[]; deposits: number; withdrawals: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const today = getPhDateKey();
  const [year, month, day] = today.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totals = Array.from({ length: days }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    const items = transactions.filter(t => Number.isFinite(new Date(t.date).getTime()) && toDateKey(new Date(t.date)) === date);
    return { incoming: items.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0), outgoing: items.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0) };
  });
  const ceiling = Math.max(1, ...totals.flatMap(t => [t.incoming, t.outgoing]));
  const index = selected ?? day - 1;
  const current = totals[index];
  return <section className="sn-money-flow sn-card" aria-label="Monthly money movement">
    <header><h2>Money movement</h2><span>{new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span></header>
    <div className="sn-money-totals"><div><span><i />Money in</span><strong><Num value={deposits} format={pesoFormat(deposits)} /></strong></div><div><span><i />Money out</span><strong><Num value={withdrawals} format={pesoFormat(withdrawals)} /></strong></div></div>
    <div className="sn-money-chart" aria-label="Daily deposits and withdrawals">{totals.map((total, i) => <button key={i} aria-label={`Day ${i + 1}: ${total.incoming} pesos in, ${total.outgoing} pesos out`} aria-pressed={index === i} onPointerEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)} style={{ '--in': `${total.incoming / ceiling * 100}%`, '--out': `${total.outgoing / ceiling * 100}%` } as React.CSSProperties}><i /><i /></button>)}</div>
    <div className="sn-money-axis"><span>1</span><span>15</span><span>{days}</span></div>
    <input className="sn-money-scrubber" type="range" min={1} max={days} value={index + 1} onChange={e => setSelected(Number(e.target.value) - 1)} aria-label="Inspect day of month" aria-valuetext={`Day ${index + 1}, ${current.incoming} pesos in, ${current.outgoing} pesos out`} />
    <p className="sn-money-detail">Day {index + 1}<span>In <Num value={current.incoming} format={pesoFormat(current.incoming)} /></span><span>Out <Num value={current.outgoing} format={pesoFormat(current.outgoing)} /></span></p>
    {!transactions.length && <p className="sn-money-note">Record a transaction to see this month take shape.</p>}
  </section>;
}
