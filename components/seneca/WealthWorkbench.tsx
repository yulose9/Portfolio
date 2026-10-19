"use client";
import { useState } from "react";
import AdminSelect from "@/app/admin/ui/AdminSelect";
import { useWealthAssets, useWealthLiabilities, useWealthPlanning, useWealthTransactions } from "@/lib/seneca/data/syncedData";
import { mutateWealth, type PlanItem } from "@/lib/seneca/services/wealthLedger";
import { moneyCSV, moneyReport, nextOccurrence, recordMoney, removeMoney, replaceMoney, validateMoney, type MoneyRecord, type Wallet } from "@/lib/seneca/utils/wealthLedger";
import { SPENDING_CATEGORIES } from "@/lib/seneca/utils/wealthPlanning";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import Sheet from "./Sheet";
import { storageService } from "@/lib/seneca/services/storageService";
import Num from "./Num";
import WealthReportDetails from "./WealthReportDetails";
import { scopedRecords, periodRange, type ReportScope } from "@/lib/seneca/utils/wealthReports";

const money = { style: "currency", currency: "PHP", maximumFractionDigits: 2 } as const;
const dayOf = (iso: string) => !Number.isFinite(Date.parse(iso)) ? "" : new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
const uid = () => crypto.randomUUID();
export default function WealthWorkbench() {
  const [assets] = useWealthAssets();
  const [liabilities] = useWealthLiabilities();
  const [transactions] = useWealthTransactions();
  const [planning] = useWealthPlanning();
  const today = getPhDateKey();
  const [tab,setTab] = useState("Reports");
  const [start,setStart] = useState(`${today.slice(0,7)}-01`);
  const [end,setEnd] = useState(today);
  const [wallet,setWallet] = useState("");
  const [event,setEvent] = useState("");
  const [groupCategories,setGroupCategories] = useState(false);
  const [search,setSearch] = useState("");
  const [recordScope,setRecordScope] = useState<ReportScope | null>(null);
  const inspect = (scope:ReportScope) => {setRecordScope(scope);setSearch("");setTab("Records");};
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [record,setRecord] = useState<MoneyRecord | null>(null);
  const [editing,setEditing] = useState(false);
  const [originalRecord,setOriginalRecord] = useState<MoneyRecord | undefined>();
  const [accountDraft,setAccountDraft] = useState<Wallet | null>(null);
  const [mergeCategory,setMergeCategory] = useState("");
  const [plan,setPlan] = useState<PlanItem | null>(null);
  const [confirm,setConfirm] = useState(false);
  const items = Object.values(planning).filter(p => !p.deleted);
  const categories = [...new Set([...SPENDING_CATEGORIES, ...items.filter(p=>p.kind==="category").map(p=>p.name)])];
  const walletOptions = assets.filter(a=>!a.archived).map(a=>({value:String(a.id),label:a.name}));
  const events = items.filter(p=>p.kind==="event");
  const parentName = (name:string) => {const seen=new Set<string>();let current=items.find(p=>p.kind==='category' && p.name===name);while(current?.parentId && !seen.has(current.id)){seen.add(current.id);const parent=items.find(p=>p.id===current!.parentId);if(!parent)break;current=parent;}return current?.name || name;};
  const report = moneyReport(transactions,start,end,wallet,event);
  const reportCategories = Object.entries(report.categories).reduce<Record<string,number>>((sum,[name,amount])=>{const key=groupCategories?parentName(name):name;sum[key]=(sum[key]||0)+amount;return sum;},{});
  const periodDays = Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/86400000)+1);
  const previousEnd = new Date(Date.parse(start)-86400000).toISOString().slice(0,10);
  const previousStart = new Date(Date.parse(start)-periodDays*86400000).toISOString().slice(0,10);
  const previous = moneyReport(transactions,previousStart,previousEnd,wallet,event);
  const scoped = recordScope ? scopedRecords(transactions,recordScope).filter(t=>{if(recordScope.category === "Fees") return ["transfer","lend","collect"].includes(t.type) && !!t.fee && (!recordScope.wallet || String(t.accountId)===recordScope.wallet);return (!recordScope.type || t.type===recordScope.type) && (!recordScope.category || (t.spendingCategory || "Uncategorized")===recordScope.category || parentName(t.spendingCategory || "Uncategorized")===recordScope.category);}) : transactions;
  const rows = scoped.filter(t=>`${t.bank || ""} ${t.note || ""} ${t.spendingCategory || ""} ${t.person || ""} ${parentName(t.spendingCategory || "")}`.toLowerCase().includes(search.toLowerCase()));
  const run = async (action:()=>Promise<unknown>, close = false) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); if(close){setRecord(null);setPlan(null);setAccountDraft(null);setConfirm(false);} }
    catch(e){setError(e instanceof Error ? e.message : "Could not save. Please retry.");}
    finally{setBusy(false);}
  };
  const newRecord = (type:string) => {setEditing(false);setConfirm(false);setError("");setRecord({id:uid(),type,date:`${today}T12:00:00+08:00`,amount:0,accountId:assets[0]?.id,spendingCategory:"Other"});};
  const changeRecord = (patch:Partial<MoneyRecord>) => setRecord(r=>r?{...r,...patch}:r);
  const accountId = (value:string,debt=false) => (debt?liabilities:assets).find(a=>String(a.id)===value)?.id;
  const saveRecord = () => run(async()=>{
    if(!record) return;
    const account = (["payment","borrow"].includes(record.type) || (record.type==="adjustment" && record.category==="Liabilities")?liabilities:assets).find(a=>a.id===record.accountId);
    const normalized = {...record,bank:account?.name || "",category:account?.category || "",note:record.note || "",person:record.person || "",eventId:record.eventId || ""};
    if (record.originalAmount) {
      validateMoney(record.originalAmount);
      if (!/^[A-Z]{3}$/.test(record.currency || "")) throw new Error("Enter a three-letter currency code, such as USD.");
      if(!record.exchangeRate || !Number.isFinite(record.exchangeRate) || record.exchangeRate<=0) throw new Error("Enter the conversion rate used for this transaction.");
      normalized.amount=Math.round(record.originalAmount*record.exchangeRate*100)/100;
    }
    await mutateWealth(state=>({...state,...(editing?replaceMoney(state,normalized,originalRecord):recordMoney(state,normalized))}));
  },true);
  const newPlan = (kind:PlanItem["kind"]) => {setConfirm(false);setError("");setPlan({id:uid(),kind,name:"",amount:0,date:today,frequency:"monthly",transactionType:"withdrawal",category:"Other",accountId:String(assets[0]?.id || "")});};
  const savePlan = () => run(async()=>{
    if(!plan?.name.trim()) throw new Error("Give this a name.");
    if(plan.kind==="goal" || plan.kind==="recurring") validateMoney(Number(plan.amount));
    if((plan.kind==="recurring" || plan.kind==="goal") && !assets.some(a=>String(a.id)===plan.accountId && !a.archived)) throw new Error("Choose an active account.");
    if ((plan.kind==="recurring" || plan.kind==="goal") && (!plan.date || !Number.isFinite(Date.parse(plan.date)))) throw new Error("Choose a valid plan date.");
    if (plan.endDate && plan.date && plan.endDate<plan.date) throw new Error("End date must follow the next occurrence.");
    await mutateWealth(state=>{
      const old=state.planningV1[plan.id]; const name=plan.name.trim();
      if(plan.kind==="goal" && Object.values(state.planningV1).some(p=>p.kind==="goal" && !p.deleted && p.id!==plan.id && p.accountId===plan.accountId)) throw new Error("This account already tracks another savings goal. Choose a separate account to avoid counting the same money twice.");
      if(plan.kind==='category' && SPENDING_CATEGORIES.some(c=>c.toLowerCase()===name.toLowerCase())) throw new Error('That built-in category already exists. Choose another name.');
      if(plan.kind==='category' && Object.values(state.planningV1).some(p=>p.id!==plan.id && p.kind==='category' && !p.deleted && p.name.toLowerCase()===name.toLowerCase())) throw new Error('That category already exists. Use merge instead.');
      if(plan.parentId){const seen=new Set([plan.id]);let parent=plan.parentId;while(parent){if(seen.has(parent))throw new Error('A category cannot contain itself.');seen.add(parent);parent=state.planningV1[parent]?.parentId || '';}}
      const rename=(category:string)=>old?.kind==='category' && category===old.name?name:category;
      return {...state,transactions:state.transactions.map(t=>t.spendingCategory?{...t,spendingCategory:rename(t.spendingCategory)}:t),categoryBudgetsV1:Object.fromEntries(Object.entries(state.categoryBudgetsV1).map(([id,b])=>[id,{...b,category:rename(b.category),...(b.categories?{categories:b.categories.map(rename)}:{})}])),planningV1:{...Object.fromEntries(Object.entries(state.planningV1).map(([id,p])=>[id,p.category?{...p,category:rename(p.category)}:p])),[plan.id]:{...plan,name,anchorDay:plan.date?new Date(plan.date).getUTCDate():1}}};
    });
  },true);
  const postRecurring = (item:PlanItem) => run(()=>mutateWealth(state=>{
    const latest = state.planningV1[item.id];
    if(!latest || latest.deleted || latest.paused || !latest.date || latest.date>today || (latest.endDate && latest.date>latest.endDate)) throw new Error("This entry is not due.");
    const account=state.assets.find(a=>String(a.id)===latest.accountId && !a.archived);
    if(!account) throw new Error("Choose an active account first.");
    const next=recordMoney(state,{id:`recurring:${item.id}:${latest.date}`,date:`${latest.date}T12:00:00+08:00`,type:latest.transactionType || "withdrawal",amount:Number(latest.amount),accountId:account.id,bank:account.name,category:account.category,spendingCategory:latest.category || "Other",note:latest.name});
    return {...state,...next,planningV1:{...state.planningV1,[latest.id]:{...latest,date:nextOccurrence(latest.date,latest.frequency || "monthly",latest.anchorDay)}}};
  }));
  const exportCSV = () => {const url=URL.createObjectURL(new Blob(["\uFEFF",moneyCSV(report.rows)],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`seneca-${start}-${end}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="sn-workbench sn-card" aria-label="Money tools">
    <header><div><h2>Your money, in detail</h2><p>Review what moved. Plan what comes next.</p></div><button className="sn-btn sn-btn-outline" onClick={()=>newRecord("transfer")}>Transfer money</button></header>
    <nav className="sn-workbench-tabs" aria-label="Money tools views">{["Reports","Records","Savings","Recurring","Organize"].map(name=><button key={name} aria-pressed={tab===name} data-sound="select" onClick={()=>setTab(name)}>{name}</button>)}</nav>
    {error && !record && !plan && <p role="alert" className="sn-workbench-error">{error}</p>}
    {tab==="Reports" && <>
      <div className="sn-report-presets" aria-label="Report periods">{["Today","Week","Month","Quarter","Year"].map(preset=><button className="sn-btn sn-btn-outline" key={preset} data-sound="select" onClick={()=>{const range=periodRange(preset,today);setStart(range.start);setEnd(range.end);}}>{preset}</button>)}</div>
      <div className="sn-workbench-filters"><label className="sn-field">From<input type="date" value={start} max={end} onChange={e=>e.target.value && setStart(e.target.value)}/></label><label className="sn-field">To<input type="date" value={end} min={start} onChange={e=>e.target.value && setEnd(e.target.value)}/></label><AdminSelect label="Report account" value={wallet} onValueChange={setWallet} options={[{value:"",label:"All accounts"},...assets.map(a=>({value:String(a.id),label:a.name}))]}/><AdminSelect label="Report event" value={event} onValueChange={setEvent} options={[{value:"",label:"All events"},...events.map(e=>({value:e.id,label:e.name}))]}/></div>
      <div className="sn-workbench-summary">{[["Money in",report.income,previous.income],["Money out",report.expense,previous.expense],["Net income",report.net,previous.net]].map(([label,value,before])=><div key={String(label)}><span>{label}</span><strong><Num value={Number(value)} format={money}/></strong><small><Num value={Number(value)-Number(before)} format={money}/> vs previous {periodDays} days</small></div>)}</div>
      <button className="sn-btn sn-btn-outline" aria-pressed={groupCategories} onClick={()=>setGroupCategories(!groupCategories)}>Group subcategories</button>
      <div className="sn-report-categories">{Object.entries(reportCategories).sort((a,b)=>b[1]-a[1]).map(([name,amount])=><button key={name} onClick={()=>inspect({start,end,wallet,event,category:name,type:"withdrawal"})}><span>{name}</span><span className="sn-report-track"><i style={{width:`${report.expense?amount/report.expense*100:0}%`}}/></span><Num value={amount} format={money}/></button>)}{!Object.keys(reportCategories).length && <p>No categorized expenses in this period.</p>}</div>
      <WealthReportDetails records={transactions} wallets={assets} scope={{start,end,wallet,event}} onInspect={inspect}/>
      <footer><p>Transfers are not income or spending. Transfer fees count as spending. Excluded records stay out of this report.</p><button className="sn-btn sn-btn-outline" onClick={exportCSV}>Export CSV</button></footer>
    </>}
    {tab==="Records" && <>{recordScope && <div className="sn-record-scope"><span>{recordScope.day || `${recordScope.start} to ${recordScope.end}`}{recordScope.category ? ` · ${recordScope.category}` : ""}{recordScope.excluded ? " · Excluded records" : ""}</span><button className="sn-btn sn-btn-outline" onClick={()=>{setRecordScope(null);setSearch("");}}>Show all records</button></div>}<div className="sn-workbench-actions"><label className="sn-field">Search records<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Category, account, note or person"/></label><button className="sn-btn sn-btn-primary" onClick={()=>newRecord("withdrawal")}>New record</button></div><div className="sn-record-list">{rows.map((item:MoneyRecord)=><button key={item.id} onClick={()=>{setRecord(item);setOriginalRecord(item);setEditing(true);setConfirm(false);setError("");}}><span><strong>{String(item.note || item.spendingCategory || item.bank || item.type)}</strong><small>{dayOf(item.date)} · {item.type}{item.excludeFromReport?" · Excluded":""}</small></span><Num value={item.amount} format={money}/></button>)}{!rows.length && <p>No matching records.</p>}</div></>}
    {(tab==="Savings" || tab==="Recurring") && <><div className="sn-workbench-actions"><p>{tab==="Savings"?"Link a target to a savings account. Its real balance tracks progress.":"Review and post due entries. Nothing is deducted without your action."}</p><button className="sn-btn sn-btn-outline" onClick={()=>newPlan(tab==="Savings"?"goal":"recurring")}>{tab==="Savings"?"Add savings goal":"Add recurring entry"}</button></div><div className="sn-plan-grid">{items.filter(p=>p.kind===(tab==="Savings"?"goal":"recurring")).map(item=>{
      const balance=assets.find(a=>String(a.id)===item.accountId)?.amount || 0;
      return <article key={item.id}><button className="sn-plan-title" onClick={()=>{setPlan(item);setConfirm(false);}}><strong>{item.name}</strong><span>Edit ↗</span></button><strong className="sn-plan-amount"><Num value={item.kind==="goal"?balance:Number(item.amount)} format={money}/></strong>{item.kind==="goal"?<><span>of <Num value={Number(item.amount)} format={money}/> · Target {item.date}</span><span className="sn-budget-track"><i style={{width:`${Math.min(100,balance/Number(item.amount)*100)}%`}}/></span></>:<span>{item.paused?"Paused":`Next ${item.date}`} · {item.frequency}</span>}<button disabled={busy || (item.kind==="recurring" && (!!item.paused || !item.date || item.date>today || (!!item.endDate && item.date>item.endDate)))} className="sn-btn sn-btn-outline" onClick={()=>{if(item.kind==="recurring")void postRecurring(item);else {setEditing(false);setRecord({id:uid(),type:"transfer",date:`${today}T12:00:00+08:00`,amount:0,destinationId:accountId(item.accountId || ""),note:`Save toward ${item.name}`});}}}>{item.kind==="goal"?"Move money to goal":"Post next due entry"}</button></article>;
    })}</div></>}
    {tab==="Organize" && <><div className="sn-workbench-actions"><button className="sn-btn sn-btn-primary" onClick={()=>{setError("");setAccountDraft({id:uid(),name:"",amount:0,category:"Savings"});}}>Add account</button><button className="sn-btn sn-btn-outline" onClick={()=>newPlan("category")}>New category</button><button className="sn-btn sn-btn-outline" onClick={()=>newPlan("event")}>New event</button></div><div className="sn-plan-grid">{["category","event"].map(kind=><div key={kind}><h3>{kind==="category"?"Custom categories":"Events & trips"}</h3>{items.filter(p=>p.kind===kind).map(item=><button className="sn-organize-row" key={item.id} onClick={()=>{setPlan(item);setConfirm(false);}}>{item.parentId?`${items.find(p=>p.id===item.parentId)?.name || ""} / `:""}{item.name}<span>Edit ↗</span></button>)}</div>)}</div><h3 className="sn-workbench-subhead">Account visibility</h3><p>Archived accounts keep their history. Excluding an account removes it from Wealth totals.</p>{assets.map(a=><div className="sn-organize-row" key={a.id}><button onClick={()=>{setError("");setAccountDraft(a);}}><strong>{a.name}</strong> · Edit</button><div><button disabled={busy} className="sn-btn sn-btn-outline" onClick={()=>run(()=>mutateWealth(state=>({...state,assets:state.assets.map(w=>w.id===a.id?{...w,archived:!w.archived}:w)})))}>{a.archived?"Unarchive":"Archive"}</button><button disabled={busy} className="sn-btn sn-btn-outline" onClick={()=>run(()=>mutateWealth(state=>({...state,assets:state.assets.map(w=>w.id===a.id?{...w,excludeFromTotal:!w.excludeFromTotal}:w)})))}>{a.excludeFromTotal?"Include in totals":"Exclude from totals"}</button></div></div>)}</>}
    {tab==="Organize" && liabilities.map(a=><button className="sn-organize-row" key={a.id} onClick={()=>{setError("");setAccountDraft({...a,category:"Liabilities"});}}><strong>{a.name}</strong><span>Edit debt account ↗</span></button>)}
    <Sheet open={!!accountDraft} onClose={()=>!busy && setAccountDraft(null)} label="Account details" className="sn-sheet">
      <div className="sn-sheet-head"><h2>Account details</h2><p>Balance changes create an adjustment record, not income or spending.</p></div>
      {accountDraft && <div className="sn-sheet-body sn-money-form"><label className="sn-field">Account name<input maxLength={100} value={accountDraft.name} onChange={e=>setAccountDraft({...accountDraft,name:e.target.value})}/></label><AdminSelect label="Account type" disabled={[...assets,...liabilities].some(a=>a.id===accountDraft.id)} value={accountDraft.category} onValueChange={category=>setAccountDraft({...accountDraft,category})} options={[{value:"Savings",label:"Cash / savings"},{value:"Investments",label:"Investment / money lent"},{value:"Liabilities",label:"Debt / credit card"}]}/><label className="sn-switch-row"><span>Archive account</span><input type="checkbox" checked={!!accountDraft.archived} onChange={e=>setAccountDraft({...accountDraft,archived:e.target.checked})}/></label><label className="sn-field">Account balance in pesos<input type="number" min="0" step="0.01" value={accountDraft.amount} onChange={e=>setAccountDraft({...accountDraft,amount:Number(e.target.value)})}/></label>{error && <p role="alert" className="sn-workbench-error">{error}</p>}</div>}
      <div className="sn-sheet-foot"><button disabled={busy} className="sn-btn sn-btn-outline" onClick={()=>setAccountDraft(null)}>Cancel</button><button disabled={busy} className="sn-btn sn-btn-primary" onClick={()=>run(()=>mutateWealth(state=>{
        if(!accountDraft?.name.trim())throw new Error("Name this account.");validateMoney(accountDraft.amount,true);
        const field=accountDraft.category==="Liabilities"?"liabilities":"assets";
        const previous=state[field].find(a=>a.id===accountDraft.id);let next=state;
        if(previous){const delta=Math.round((accountDraft.amount-previous.amount)*100)/100;if(delta)next={...state,...recordMoney(state,{id:uid(),type:"adjustment",date:new Date().toISOString(),amount:Math.abs(delta),accountId:previous.id,category:accountDraft.category,adjustmentDirection:delta>0?"up":"down",excludeFromReport:true,note:"Balance Adjustment"})};return {...next,[field]:next[field].map(a=>a.id===accountDraft.id?{...a,name:accountDraft.name.trim(),archived:!!accountDraft.archived}:a)};}
        return {...state,[field]:[...state[field],{...accountDraft,name:accountDraft.name.trim()}]};
      }),true)}>Save account</button></div>
    </Sheet>
    <Sheet open={!!record} onClose={()=>!busy && setRecord(null)} label={editing?"Edit money record":"New money record"} className="sn-sheet">
      <div className="sn-sheet-head"><h2>{editing?"Edit money record":"New money record"}</h2><p>Changes update linked balances. For lending, use a separate asset account for each person’s outstanding loan.</p></div>
      {record && <div className="sn-sheet-body sn-money-form">
        <AdminSelect label="Record type" disabled={record.type==="adjustment"} value={record.type} onValueChange={type=>changeRecord({type,accountId:undefined,destinationId:undefined})} options={[...(record.type==="adjustment"?[{value:"adjustment",label:"Balance adjustment"}]:[]),{value:"withdrawal",label:"Expense"},{value:"deposit",label:"Income"},{value:"transfer",label:"Transfer"},{value:"payment",label:"Debt payment"},{value:"borrow",label:"Borrow money"},{value:"lend",label:"Lend money"},{value:"collect",label:"Collect a loan"}]}/>
        {record.type==="adjustment" && <AdminSelect label="Adjustment direction" value={record.adjustmentDirection==="down"?"down":"up"} onValueChange={adjustmentDirection=>changeRecord({adjustmentDirection})} options={[{value:"up",label:"Increase balance"},{value:"down",label:"Decrease balance"}]}/>}
        <AdminSelect disabled={record.type==="adjustment"} label={["payment","borrow"].includes(record.type) || (record.type==="adjustment" && record.category==="Liabilities")?"Debt account":"From / account"} value={String(record.accountId ?? "")} onValueChange={v=>changeRecord({accountId:accountId(v,["payment","borrow"].includes(record.type))})} options={[{value:"",label:"Choose account"},...(["payment","borrow"].includes(record.type) || (record.type==="adjustment" && record.category==="Liabilities")?liabilities.map(a=>({value:String(a.id),label:a.name})):walletOptions)]}/>
        {(["transfer","payment","borrow","lend","collect"].includes(record.type)) && <AdminSelect label={record.type==="payment"?"Pay from":"To account"} value={String(record.destinationId ?? "")} onValueChange={v=>changeRecord({destinationId:accountId(v)})} options={[{value:"",label:"Choose account"},...walletOptions]}/>}
        <label className="sn-field">Amount in pesos<input type="number" inputMode="decimal" min="0.01" step="0.01" value={record.amount || ""} onChange={e=>changeRecord({amount:Number(e.target.value)})}/></label>
        {record.type==="transfer" && <label className="sn-field">Transfer fee in pesos<input type="number" min="0" step="0.01" value={record.fee || ""} onChange={e=>changeRecord({fee:Number(e.target.value)})}/></label>}
        <label className="sn-field">Record date<input type="date" value={dayOf(record.date)} max={today} onChange={e=>e.target.value && changeRecord({date:`${e.target.value}T12:00:00+08:00`})}/></label>
        {record.type!=="transfer" && <AdminSelect label="Record category" value={record.spendingCategory || "Other"} onValueChange={spendingCategory=>changeRecord({spendingCategory})} options={categories.map(value=>({value,label:value}))}/>}
        <label className="sn-field">Description<input value={record.note || ""} maxLength={500} onChange={e=>changeRecord({note:e.target.value})}/></label><label className="sn-field">Person<input value={record.person || ""} maxLength={100} onChange={e=>changeRecord({person:e.target.value})}/></label>
        <AdminSelect label="Event or trip" value={record.eventId || ""} onValueChange={eventId=>changeRecord({eventId})} options={[{value:"",label:"No event"},...events.map(e=>({value:e.id,label:e.name}))]}/>
        <label className="sn-field">Receipt photo<input className="sn-receipt-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(!file)return;void run(async()=>{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Choose a JPG, PNG or WebP image smaller than 8 MB.');const receiptUrl=await storageService.uploadImage(file,'wealth-receipts');changeRecord({receiptUrl});});}}/></label>
        {typeof record.receiptUrl==='string' && record.receiptUrl.startsWith('https://firebasestorage.googleapis.com/') && <div className="flex gap-3 items-center"><a className="sn-btn sn-btn-outline" href={record.receiptUrl} target="_blank" rel="noopener noreferrer">View receipt</a><button className="sn-btn sn-btn-outline" onClick={()=>changeRecord({receiptUrl:null})}>Unlink receipt</button></div>}
        <details><summary>Foreign currency</summary><p>Keep the original amount and the rate you used. Account balances remain in pesos.</p><label className="sn-field">Currency code<input placeholder="USD" maxLength={3} value={record.currency || ""} onChange={e=>changeRecord({currency:e.target.value.toUpperCase()})}/></label><label className="sn-field">Original amount<input type="number" min="0" step="0.01" value={record.originalAmount || ""} onChange={e=>changeRecord({originalAmount:Number(e.target.value)})}/></label><label className="sn-field">Pesos per currency unit<input type="number" min="0" step="0.000001" value={record.exchangeRate || ""} onChange={e=>changeRecord({exchangeRate:Number(e.target.value)})}/></label>{!!record.originalAmount && <p>Converted: <Num value={Math.round(record.originalAmount*(record.exchangeRate || 0)*100)/100} format={money}/></p>}</details>
        <label className="sn-switch-row"><span>Exclude from reports</span><input type="checkbox" checked={!!record.excludeFromReport} onChange={e=>changeRecord({excludeFromReport:e.target.checked})}/></label>
        {error && <p role="alert" className="sn-workbench-error">{error}</p>}
      </div>}
      <div className="sn-sheet-foot">{editing && <><button disabled={busy} className="sn-btn sn-btn-ghost-danger" onClick={()=>{if(!confirm){setConfirm(true);return;}void run(()=>mutateWealth(state=>({...state,...removeMoney(state,[record!.id])})),true);}}>{confirm?"Confirm delete":"Delete"}</button><button disabled={busy} className="sn-btn sn-btn-outline" onClick={()=>{setRecord(r=>r?{...r,id:uid(),date:`${today}T12:00:00+08:00`}:r);setEditing(false);}}>Duplicate</button></>}<button disabled={busy} className="sn-btn sn-btn-outline" onClick={()=>setRecord(null)}>Cancel</button><button disabled={busy || record?.accountId == null || (["transfer","payment","borrow","lend","collect"].includes(record?.type || "") && record?.destinationId == null)} className="sn-btn sn-btn-primary" onClick={saveRecord}>{busy?"Saving…":"Save record"}</button></div>
    </Sheet>
    <Sheet open={!!plan} onClose={()=>!busy && setPlan(null)} label={`Edit ${plan?.kind || "plan"}`} className="sn-sheet">
      <div className="sn-sheet-head"><h2>{plan?.kind==="goal"?"Savings goal":plan?.kind==="recurring"?"Recurring entry":plan?.kind==="event"?"Event or trip":"Spending category"}</h2></div>
      {plan && <div className="sn-sheet-body sn-money-form"><label className="sn-field">Name<input value={plan.name} maxLength={100} onChange={e=>setPlan({...plan,name:e.target.value})}/></label>{(plan.kind==="goal" || plan.kind==="recurring") && <><label className="sn-field">{plan.kind==="goal"?"Target amount":"Recurring amount"}<input type="number" min="0.01" step="0.01" value={plan.amount || ""} onChange={e=>setPlan({...plan,amount:Number(e.target.value)})}/></label><AdminSelect label="Plan account" value={plan.accountId || ""} onValueChange={accountId=>setPlan({...plan,accountId})} options={[{value:"",label:"Choose account"},...walletOptions]}/><label className="sn-field">{plan.kind==="goal"?"Target date":"Next occurrence"}<input type="date" value={plan.date || today} onChange={e=>setPlan({...plan,date:e.target.value})}/></label></>}{plan.kind==="category" && <><AdminSelect label="Parent category" value={plan.parentId || ""} onValueChange={parentId=>setPlan({...plan,parentId})} options={[{value:"",label:"No parent"},...items.filter(p=>p.kind==="category" && p.id!==plan.id).map(p=>({value:p.id,label:p.name}))]}/>{planning[plan.id] && <><AdminSelect label="Merge into" value={mergeCategory} onValueChange={setMergeCategory} options={[{value:"",label:"Choose a category"},...categories.filter(c=>c!==plan.name).map(value=>({value,label:value}))]}/><button className="sn-btn sn-btn-outline" disabled={busy || !mergeCategory} onClick={()=>run(()=>mutateWealth(state=>{const source=state.planningV1[plan.id];if(!source || source.deleted)throw new Error("Category no longer exists.");const rename=(c:string)=>c===source.name?mergeCategory:c;return {...state,transactions:state.transactions.map(t=>t.spendingCategory?{...t,spendingCategory:rename(t.spendingCategory)}:t),categoryBudgetsV1:Object.fromEntries(Object.entries(state.categoryBudgetsV1).map(([id,b])=>[id,{...b,category:rename(b.category),...(b.categories?{categories:[...new Set(b.categories.map(rename))]}:{})}])),planningV1:{...Object.fromEntries(Object.entries(state.planningV1).map(([id,p])=>[id,{...p,...(p.category?{category:rename(p.category)}:{}),...(p.parentId===plan.id?{parentId:""}:{})}])),[plan.id]:{...source,deleted:true}}};}),true)}>Merge records and budgets</button></>}</>}{plan.kind==="recurring" && <><AdminSelect label="Frequency" value={plan.frequency || "monthly"} onValueChange={frequency=>setPlan({...plan,frequency})} options={["daily","weekly","monthly","yearly"].map(value=>({value,label:value}))}/><AdminSelect label="Recurring type" value={plan.transactionType || "withdrawal"} onValueChange={transactionType=>setPlan({...plan,transactionType})} options={[{value:"withdrawal",label:"Expense"},{value:"deposit",label:"Income"}]}/><AdminSelect label="Recurring category" value={plan.category || "Other"} onValueChange={category=>setPlan({...plan,category})} options={categories.map(value=>({value,label:value}))}/><label className="sn-field">End date (optional)<input type="date" min={plan.date} value={plan.endDate || ""} onChange={e=>setPlan({...plan,endDate:e.target.value})}/></label><label className="sn-switch-row"><span>Pause schedule</span><input type="checkbox" checked={!!plan.paused} onChange={e=>setPlan({...plan,paused:e.target.checked})}/></label></>}{error && <p role="alert" className="sn-workbench-error">{error}</p>}</div>}
      <div className="sn-sheet-foot">{plan && planning[plan.id] && <button disabled={busy} className="sn-btn sn-btn-ghost-danger" onClick={()=>{if(!confirm){setConfirm(true);return;}void run(()=>mutateWealth(state=>({...state,planningV1:{...state.planningV1,[plan.id]:{...plan,deleted:true}}})),true);}}>{confirm?"Confirm delete":"Delete"}</button>}<button className="sn-btn sn-btn-outline" disabled={busy} onClick={()=>setPlan(null)}>Cancel</button><button className="sn-btn sn-btn-primary" disabled={busy} onClick={savePlan}>{busy?"Saving…":"Save plan"}</button></div>
    </Sheet>
  </section>;
}

