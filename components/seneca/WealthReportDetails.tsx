"use client";
import Num from "./Num";
import { balanceRange, reportDetails, type ReportScope } from "@/lib/seneca/utils/wealthReports";
import type { MoneyRecord, Wallet } from "@/lib/seneca/utils/wealthLedger";

const money = { style: "currency", currency: "PHP", maximumFractionDigits: 2 } as const;
export default function WealthReportDetails({ records, wallets, scope, onInspect }: {
  records: MoneyRecord[]; wallets: Wallet[]; scope: ReportScope; onInspect: (scope: ReportScope) => void;
}) {
  const details = reportDetails(records, scope);
  const balances = balanceRange(wallets, records, scope);
  const maximum = Math.max(1, ...details.days.flatMap(day => [day.income, day.expense]));
  return <div className="sn-report-details">
    {!scope.event && <div className="sn-report-balances" aria-label="Recorded account balances">
      <div><span>Opening balance</span><strong><Num value={balances.opening} format={money}/></strong></div>
      <div><span>Closing balance</span><strong><Num value={balances.closing} format={money}/></strong></div>
      <p>Reconstructed from current balances and recorded movements. Unrecorded activity is not included.</p>
    </div>}
    <div className="sn-report-detail-heading"><h3>Income by category</h3><span>{Object.keys(details.incomeCategories).length} {Object.keys(details.incomeCategories).length === 1 ? "category" : "categories"}</span></div>
    <div className="sn-report-categories">{Object.entries(details.incomeCategories).sort((a,b)=>b[1]-a[1]).map(([category,amount]) =>
      <button key={category} data-sound="select" onClick={()=>onInspect({...scope,type:"deposit",category})}>
        <span>{category}</span><span className="sn-report-track"><i style={{width:`${details.income ? amount/details.income*100 : 0}%`}}/></span><Num value={amount} format={money}/>
      </button>)}{!details.income && <p>No recorded income in this period.</p>}</div>
    <div className="sn-report-detail-heading"><h3>Daily movement</h3><span>Income / spending</span></div>
    <div className="sn-report-trend" aria-label="Daily income and spending">{details.days.map(day =>
      <button key={day.day} data-sound="select" onClick={()=>onInspect({...scope,day:day.day})} aria-label={`${day.day}: income ${day.income} pesos, spending ${day.expense} pesos`}>
        <span className="sn-report-trend-date">{new Date(`${day.day}T12:00:00`).toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</span>
        <span className="sn-report-trend-bars"><i style={{width:`${day.income/maximum*100}%`}}/><i style={{width:`${day.expense/maximum*100}%`}}/></span>
        <span><Num value={day.income} format={money}/><small><Num value={day.expense} format={money}/></small></span>
      </button>)}{!details.days.length && <p>No income or spending recorded yet.</p>}</div>
    {details.excluded.length > 0 && <button className="sn-btn sn-btn-outline" data-sound="select" onClick={()=>onInspect({...scope,excluded:true})}>Review {details.excluded.length} excluded records</button>}
  </div>;
}
