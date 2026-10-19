"use client";
import { useState } from "react";
import AdminSelect from "@/app/admin/ui/AdminSelect";
import { useWealthBudgets, useWealthAssets, useWealthPlanning } from "@/lib/seneca/data/syncedData";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { budgetSpent, budgetLimit, SPENDING_CATEGORIES, type CategoryBudget } from "@/lib/seneca/utils/wealthPlanning";
import { mutateWealth } from "@/lib/seneca/services/wealthLedger";
import Num from "./Num";
import Sheet from "./Sheet";

export default function CategoryBudgets({ transactions }: { transactions: Parameters<typeof budgetSpent>[0] }) {
  const [budgets] = useWealthBudgets();
  const [saveError,setSaveError] = useState("");
  const [saving,setSaving] = useState(false);
  const setBudgets = async (update:(previous:Record<string,CategoryBudget>)=>Record<string,CategoryBudget>) => {setSaving(true);setSaveError("");try{await mutateWealth(state=>({...state,categoryBudgetsV1:update(state.categoryBudgetsV1)}));setEditing(null);}catch(e){setSaveError(e instanceof Error?e.message:"Could not save budget.");}finally{setSaving(false);}};
  const [assets] = useWealthAssets();
  const [planning] = useWealthPlanning();
  const categories = [...new Set(["All categories","Fees",...SPENDING_CATEGORIES,...Object.values(planning).filter(p=>p.kind==="category" && !p.deleted).map(p=>p.name)])];
  const [showEnded,setShowEnded] = useState(false);
  const [editing, setEditing] = useState<CategoryBudget | null>(null);
  const [limit, setLimit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const month = getPhDateKey().slice(0, 7);
  const active = (Object.values(budgets) as CategoryBudget[]).filter(b => !b.deleted && (showEnded || (b.end ? b.end >= getPhDateKey() : b.month === month)));
  const open = (budget: CategoryBudget) => { setEditing({...budget,start:budget.start || `${budget.month}-01`,end:budget.end || new Date(Date.UTC(Number(budget.month.slice(0,4)),Number(budget.month.slice(5,7)),0)).toISOString().slice(0,10)}); setLimit(budget.limit ? String(budget.limit) : ""); setConfirmDelete(false); };
  const save = () => {
    if (!editing || !Number.isFinite(Number(limit)) || Number(limit) <= 0 || Number(limit) > 999999999.99) return;
    if (!editing.start || !editing.end || editing.start > editing.end) return;
    const id = editing.id || crypto.randomUUID();
    setBudgets(previous => ({ ...previous, [id]: { ...editing, id, limit: Math.round(Number(limit) * 100) / 100, deleted: false } }));
  };
  return <section className="sn-budgets sn-card" aria-label="Category budgets">
    <header><div><h2>Give your money a plan</h2><p>{new Date(`${month}-15T12:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} · Spending by category</p></div><button className="sn-btn sn-btn-outline" onClick={() => open({ id: "", month, category: "Food & drink", limit: 0, start: `${month}-01`, end: new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10) })}>Add budget</button></header>
    <button className="sn-btn sn-btn-outline mt-4" aria-pressed={showEnded} onClick={()=>setShowEnded(!showEnded)}>{showEnded?"Current budgets":"Include past budgets"}</button>
    {active.length === 0 ? <p className="sn-budget-empty">Set a monthly limit for food, transport, or another category. Recorded expenses fill each budget as you go.</p> : <div className="sn-budget-grid">{active.map(budget => {
      const spent = budgetSpent(transactions, budget);
      const effectiveLimit=budgetLimit(budget,Object.values(budgets),transactions);
      const remaining = Math.round((effectiveLimit - spent) * 100) / 100;
      return <button key={budget.id} className="sn-budget" data-over={remaining < 0 || undefined} data-warning={spent >= effectiveLimit*.75 || undefined} onClick={() => open(budget)} aria-label={`Edit ${budget.category} budget`}>
        <span className="sn-budget-title">{budget.category}<span>Edit ↗</span></span>
        <strong><Num value={spent} prefix="₱" format={{maximumFractionDigits:2}}/><small> of <Num value={effectiveLimit} prefix="₱"/></small></strong>
        <span className="sn-budget-track" role="meter" aria-label={`${budget.category} spent`} aria-valuemin={0} aria-valuemax={effectiveLimit} aria-valuenow={Math.min(spent,effectiveLimit)} aria-valuetext={`${spent} pesos spent of ${effectiveLimit}`}><i style={{width:`${Math.min(100,spent/effectiveLimit*100)}%`}}/></span>
        {budget.end && budget.end>=getPhDateKey() && <small><Num value={Math.max(0,remaining)/Math.max(1,(Date.parse(budget.end)-Date.parse(getPhDateKey()))/86400000+1)} prefix="₱" format={{maximumFractionDigits:2}}/> available per day</small>}
        {budget.rollover && <small>Includes <Num value={effectiveLimit-budget.limit} prefix="₱"/> carried forward</small>}
        <span><Num value={Math.abs(remaining)} prefix="₱"/> {remaining < 0 ? "over budget" : "left in this period"}</span>
        {spent >= effectiveLimit*.75 && <span>{remaining<0 ? "Limit exceeded" : "Approaching your limit"}</span>}
        {budget.start && budget.end && getPhDateKey()>=budget.start && <span>Projected: <Num value={spent / Math.max(1,Math.min((Date.parse(budget.end)-Date.parse(budget.start))/86400000+1,(Date.parse(getPhDateKey())-Date.parse(budget.start))/86400000+1)) * Math.max(1,(Date.parse(budget.end)-Date.parse(budget.start))/86400000+1)} prefix="₱" format={{maximumFractionDigits:0}}/></span>}
      </button>;
    })}</div>}
    {saveError && <p role="alert" className="sn-workbench-error">{saveError}</p>}
    <Sheet open={!!editing} onClose={() => !saving && setEditing(null)} label={editing?.id ? "Edit budget" : "New budget"} className="sn-sheet">
      <div className="sn-sheet-head"><h2>{editing?.id ? "Edit budget" : "New budget"}</h2><p>Choose a period, accounts, and the spending categories to include.</p></div>
      <div className="sn-sheet-body sn-money-form">
        <AdminSelect label="Budget category" value={editing?.category || "Food & drink"} onValueChange={category => setEditing(b => b ? { ...b, category, categories: [category] } : b)} options={categories.map(value => ({value,label:value}))} disabled={!!editing?.id}/>
        <div className="sn-workbench-filters"><label className="sn-field">Budget starts<input type="date" value={editing?.start || month+'-01'} onChange={e=>setEditing(b=>b?{...b,start:e.target.value}:b)}/></label><label className="sn-field">Budget ends<input type="date" min={editing?.start} value={editing?.end || ''} onChange={e=>setEditing(b=>b?{...b,end:e.target.value}:b)}/></label></div>
        <AdminSelect label="Budget account" value={editing?.accountId || ''} onValueChange={accountId=>setEditing(b=>b?{...b,accountId}:b)} options={[{value:'',label:'All accounts'},...assets.map(a=>({value:String(a.id),label:a.name}))]}/>
        {editing?.category!=="All categories" && <details><summary>Include more categories</summary>{categories.filter(c=>c!=="All categories").map(category=><label key={category} className="sn-switch-row"><span>{category}</span><input type="checkbox" checked={(editing?.categories || [editing?.category]).includes(category)} onChange={e=>setEditing(b=>{if(!b)return b;const current=b.categories || [b.category];const next=e.target.checked?[...current,category]:current.filter(c=>c!==category);return {...b,categories:next.length?next:[b.category]};})}/></label>)}</details>}
        <label className="sn-switch-row"><span>Carry unused funds from the previous matching budget</span><input type="checkbox" checked={!!editing?.rollover} onChange={e=>setEditing(b=>b?{...b,rollover:e.target.checked}:b)}/></label>
        {saveError && <p role="alert" className="sn-workbench-error">{saveError}</p>}
        <label className="sn-field">Budget limit in pesos<input inputMode="decimal" type="number" min="0.01" max="999999999.99" step="0.01" value={limit} onChange={event => setLimit(event.target.value)}/></label>
      </div>
      <div className="sn-sheet-foot">
        {editing?.id && <button disabled={saving} className="sn-btn sn-btn-ghost-danger" onClick={() => { if (!confirmDelete) {setConfirmDelete(true); return;} setBudgets(previous => ({...previous,[editing.id]:{...editing,deleted:true}})); }}>{confirmDelete ? "Confirm delete" : "Delete budget"}</button>}
        <button className="sn-btn sn-btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="sn-btn sn-btn-primary" data-sound="pop" disabled={saving || !editing?.start || !editing?.end || !!(editing.start>editing.end) || !Number.isFinite(Number(limit)) || Number(limit)<=0 || Number(limit)>999999999.99} onClick={save}>Save budget</button>
      </div>
    </Sheet>
  </section>;
}
