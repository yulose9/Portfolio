"use client";
import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Coins, Rows3, PanelTopClose, Plus, ArrowDownLeft, ArrowUpRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import AdminSelect from '@/app/admin/ui/AdminSelect';
import { useWealthAssets, useWealthTransactions } from '@/lib/seneca/data/syncedData';
import { buildMoneyTrail, moneyDayChange, moneyStory, type MoneyTransaction, type MoneyPeriod } from '@/lib/seneca/utils/moneyTrail';
import Num from '../Num';

const format = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const money = (n: number) => n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const date = (s: string) => new Date(s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });

export default function MoneyHorizon({ onOpenWealth, onOpenSummary, onRecord, onTransaction }: { onOpenWealth?: () => void; onOpenSummary?: (view: 'held' | 'income' | 'expenses') => void; onRecord?: () => void; onTransaction?: (transaction: MoneyTransaction) => void }) {
  const [accounts] = useWealthAssets();
  const [transactions] = useWealthTransactions();
  const accountStatus = useWealthAssets.useStatus();
  const transactionStatus = useWealthTransactions.useStatus();
  const [period, setPeriod] = useState<MoneyPeriod>('all');
  const [compact, setCompact] = useState(false);
  const [selection, setSelection] = useState<{ kind: 'slice' | 'point'; key: string } | null>(null);
  const reduce = useReducedMotion();
  const id = useId();
  const trail = buildMoneyTrail(accounts || [], transactions || [], period);
  const daily = moneyDayChange(transactions || []);
  const story = moneyStory(trail);
  const selectedSlice = trail.slices.find(s => s.key === selection?.key) || trail.slices.findLast(s => s.kind === 'out') || trail.slices[0];
  const pointIndex = Math.max(0, trail.points.findIndex(p => p.key === selection?.key));
  const selectedPoint = selection?.kind === 'point' ? trail.points[pointIndex] : null;
  const transaction = selectedPoint?.transaction || selectedSlice?.transaction;
  const selectedAmount = selectedPoint?.amount ?? selectedSlice?.amount ?? 0;
  const selectedTitle = selectedPoint ? selectedPoint.transaction.note || selectedPoint.transaction.category || (selectedPoint.incoming ? 'Recorded deposit' : 'Recorded outflow') : selectedSlice?.title;
  const loading = accountStatus === 'loading' || transactionStatus === 'loading';
  const offline = accountStatus === 'offline' || transactionStatus === 'offline';
  const fullId = `money-full-${id}`;
  const detailKey = selectedPoint?.key || selectedSlice?.key || 'empty';
  function trend(value: number, spending = false, net = false) {
    const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
    return <small className={`mh-trend ${value === 0 ? '' : (spending ? value < 0 : value > 0) ? 'is-good' : 'is-bad'}`}><Icon size={12} /><span>{value === 0 ? (net ? 'No net movement today' : 'Same as yesterday') : `${money(Math.abs(value))} ${net ? 'net today' : 'vs yesterday'}`}</span></small>;
  }
  useEffect(() => { try { setCompact(localStorage.getItem('seneca_money_compact') === 'true'); } catch { /* optional layout preference */ } }, []);
  function select(kind: 'slice' | 'point', key: string) { setSelection(prev => prev?.kind === kind && prev.key === key ? prev : { kind, key }); }
  function toggleView() {
    setCompact(prev => { try { localStorage.setItem('seneca_money_compact', String(!prev)); } catch { /* optional layout preference */ } return !prev; });
    setSelection(null);
  }
  const values = [0, ...trail.points.map(p => p.value)];
  const low = Math.min(...values), high = Math.max(...values);
  const span = high - low || 1;
  const y = (value: number) => 170 - (value - low) / span * 136;
  const x = (index: number) => 24 + (index + 1) / Math.max(1, trail.points.length) * 752;
  const line = [`24,${y(0)}`, ...trail.points.map((p, i) => `${x(i)},${y(p.value)}`)].join(' ');
  const area = `M 24 ${y(0)} L ${line.replaceAll(' ', ' L ')} L 776 ${y(0)} Z`;
  return <section className={`sn-money-horizon sn-card ${compact ? 'is-compact' : ''}`} aria-labelledby={`money-title-${id}`}>
    <header className="mh-head hz-head"><div><h2 id={`money-title-${id}`}><Coins size={20} />Your money story</h2><p>{loading ? 'Checking your money records…' : story.subtitle}</p></div><div className="mh-actions hz-actions"><button className="hz-view" aria-label={compact ? 'Expand money view' : 'Compact money view'} aria-pressed={compact} aria-expanded={!compact} aria-controls={fullId} onClick={toggleView} data-sound="select">{compact ? <Rows3 size={16} /> : <PanelTopClose size={16} />}<span>{compact ? 'Expand' : 'Compact'}</span></button>{onRecord && <button className="sn-btn sn-btn-primary" onClick={onRecord} data-sound="select"><Plus size={16} /><span>Record</span></button>}</div></header>
    <div className="mh-period"><AdminSelect label="Money period" hideLabel value={period} options={[{ value: 'all', label: 'All records' }, { value: 'month', label: 'This month' }, { value: 'year', label: 'This year' }]} onValueChange={value => { setPeriod(value as MoneyPeriod); setSelection(null); }} /></div>
    {loading ? <div className="mh-loading" role="status"><span>Loading your money records</span><i /><i /></div> : <>
      <div className="mh-summary"><button className="mh-held" aria-label="Held now: view accounts in Wealth" onClick={() => onOpenSummary?.('held')} data-sound="select"><span>Held now</span><strong><Num value={trail.held} prefix="₱" format={format} /></strong>{trend(daily.net, false, true)}</button><button aria-label="Money in: view income in Wealth" onClick={() => onOpenSummary?.('income')} data-sound="select"><span><i className="mh-in-dot" />Money in</span><strong><Num value={trail.incoming} prefix="₱" format={format} /></strong>{trend(daily.income)}</button><button aria-label="Money out: view expenses in Wealth" onClick={() => onOpenSummary?.('expenses')} data-sound="select"><span><i className="mh-out-dot" />Money out</span><strong><Num value={trail.outgoing} prefix="₱" format={format} /></strong>{trend(daily.spending, true)}</button></div>
      <div className="mh-ribbon-heading"><h3>Held + spent</h3><span>{money(trail.tracked)} tracked</span></div>
      <div className="mh-ribbon" role="group" aria-label="Money slices" onPointerMove={event => { const r = event.currentTarget.getBoundingClientRect(); const fraction = (event.clientX - r.left) / r.width; const slice = trail.slices.find(s => fraction >= s.start && fraction < s.end); if (slice) select('slice', slice.key); }} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !trail.slices.length) return;
        event.preventDefault();
        const index = trail.slices.indexOf(selectedSlice);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? trail.slices.length - 1 : Math.max(0, Math.min(trail.slices.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
        select('slice', trail.slices[next].key);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
      }}>
        {trail.slices.map(slice => <button key={slice.key} className={`mh-slice mh-slice-${slice.kind}`} style={{ width: `${(slice.end - slice.start) * 100}%` }} tabIndex={selectedSlice?.key === slice.key ? 0 : -1} aria-label={`${slice.title}, ${money(slice.amount)}${slice.transaction ? `, ${date(slice.transaction.date)}` : ', held now'}`} aria-pressed={selectedSlice?.key === slice.key && !selectedPoint} onFocus={() => select('slice', slice.key)} onClick={() => select('slice', slice.key)} data-sound="select"><span>{slice.title}</span></button>)}
        {!trail.slices.length && <span className="mh-ribbon-empty">Your balances and recorded outflows will appear here.</span>}
      </div>
      <div className="mh-ribbon-legend"><span><i className="mh-in-dot" />Held in accounts</span><span><i className="mh-out-dot" />Recorded outflows</span><span>Slice widths follow amounts</span></div>
      <AnimatePresence initial={false}>{!compact && <motion.div id={fullId} key="money-full" className="mh-expanded" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : .2, ease: [.2, 0, 0, 1] }}>
        <div className="mh-chart-heading"><div><h3>How recorded money adds up</h3><p>Each step is a transaction. Inflows minus outflows, starting at zero.</p></div><strong aria-label={`Net recorded movement ${money(trail.net)}`} className={trail.net < 0 ? 'is-negative' : ''}><Num value={trail.net} prefix="₱" format={format} /></strong></div>
        {trail.points.length ? <>
          <div className="mh-chart" role="slider" tabIndex={0} aria-label="Inspect recorded transaction" aria-valuemin={0} aria-valuemax={trail.points.length - 1} aria-valuenow={selectedPoint ? pointIndex : trail.points.length - 1} aria-valuetext={selectedPoint ? `${selectedTitle}, ${money(selectedAmount)}` : 'Use arrow keys to inspect transactions'} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const current = selectedPoint ? pointIndex : trail.points.length - 1; const next = event.key === 'Home' ? 0 : event.key === 'End' ? trail.points.length - 1 : Math.max(0, Math.min(trail.points.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))); select('point', trail.points[next].key); }} onPointerMove={event => { const r = event.currentTarget.getBoundingClientRect(); const fraction = Math.max(0, Math.min(1, (event.clientX - r.left - 55) / (r.width - 55))); const index = Math.max(0, Math.min(trail.points.length - 1, Math.round((fraction * 800 - 24) / 752 * trail.points.length - 1))); select('point', trail.points[index].key); }}>
            <div className="mh-axis-values"><span>{money(high)}</span><span>{money(low)}</span></div>
            <svg viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden="true"><path className="mh-area" d={area} /><line className="mh-zero" x1="24" x2="776" y1={y(0)} y2={y(0)} /><polyline className="mh-line" points={line} />{selectedPoint && <><line className="mh-chart-guide" x1={x(pointIndex)} x2={x(pointIndex)} y1="22" y2="184" /><circle className={selectedPoint.incoming ? 'mh-point-in' : 'mh-point-out'} cx={x(pointIndex)} cy={y(selectedPoint.value)} r="5" /></>}</svg>
          </div><div className="mh-chart-dates"><span>{date(trail.points[0].transaction.date)}</span><span>{date(trail.points[trail.points.length - 1].transaction.date)}</span></div>
        </> : <p className="mh-chart-empty">Record a deposit or expense to start your accumulation line.</p>}
      </motion.div>}</AnimatePresence>
      {selectedSlice || selectedPoint ? <div className={`mh-inspector ${selectedPoint ? selectedPoint.incoming ? 'is-held' : 'is-out' : selectedSlice.kind === 'held' ? 'is-held' : 'is-out'}`}><div className="mh-inspector-icon">{selectedPoint?.incoming || (!transaction && selectedSlice?.kind === 'held') ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</div><div className="mh-inspector-copy"><AnimatePresence initial={false} mode="popLayout"><motion.div key={detailKey} initial={{ opacity: 0, y: reduce ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -4 }} transition={{ duration: reduce ? 0 : .14 }}><span>{transaction ? `${date(transaction.date)} · ${transaction.bank || 'Account not specified'}` : `Held today · ${selectedSlice?.account?.category || 'Account balance'}`}</span><h3>{selectedTitle}</h3><p>{selectedPoint ? `${money(selectedPoint.value)} cumulative recorded movement` : transaction?.location && transaction.location !== 'Unknown Location' ? transaction.location : transaction ? 'Recorded outflow' : 'Current account balance'}</p></motion.div></AnimatePresence></div><strong><Num value={selectedAmount} prefix="₱" format={format} /></strong>{transaction && onTransaction && <button className="hz-view" onClick={() => onTransaction(transaction)} data-sound="select">Details</button>}</div> : <div className="mh-empty"><p>Start with your account balances, then record what comes in and goes out.</p>{onOpenWealth && <button className="sn-btn sn-btn-primary" onClick={onOpenWealth}>Open Wealth</button>}</div>}
      <AnimatePresence initial={false}>{!compact && <motion.section className="mh-spending" aria-label="Spending breakdown" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }}>
        <div className="mh-spending-heading"><h3>Where it went</h3><span>{period === 'month' ? 'This month' : period === 'year' ? 'This year' : 'All records'}</span></div>
        <p className="mh-cashflow">{story.spentPercent === null ? 'Record income to compare what comes in with what goes out.' : <><strong><Num value={story.spentPercent} format={{ maximumFractionDigits: 1 }} suffix="%" /></strong> of recorded income went out{trail.net < 0 ? <> · {money(-trail.net)} more out than in</> : <> · {money(trail.net)} net inflow</>}.</>}</p>
        {story.categories.length ? <ul>{story.categories.slice(0, 4).map(category => <li key={category.label}><div><span>{category.label}</span><strong>{money(category.amount)}</strong><small>{Math.round(category.share * 100)}%</small></div><div className="mh-category-meter" aria-hidden="true"><i style={{ width: `${category.share * 100}%` }} /></div></li>)}</ul> : <p className="mh-breakdown-empty">Your spending categories will appear when you record an outflow.</p>}
        {story.categories.length > 4 && <p className="mh-breakdown-empty">{story.categories.length - 4} more categories in Wealth.</p>}
        {!!trail.outgoing && <button className="mh-view" onClick={() => onOpenSummary?.('expenses')} data-sound="select">Review expenses</button>}
      </motion.section>}</AnimatePresence>
      <footer className="mh-foot"><p>Current balances plus recorded outflows. Balance edits stay in Held now.</p>{onOpenWealth && trail.slices.length > 0 && <button className="mh-view" onClick={onOpenWealth} data-sound="select">Open Wealth</button>}</footer>
    </>}
    {offline && <p className="mh-status" role="status">Showing saved records. Cloud updates resume when connected.</p>}
    {trail.invalid > 0 && <p className="mh-status" role="status">{trail.invalid} {trail.invalid === 1 ? 'record has' : 'records have'} an invalid amount or date. Review your records in Wealth.</p>}
  </section>;
}
