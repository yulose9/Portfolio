export type Wallet = { id: string | number; name: string; amount: number; category: string; archived?: boolean; excludeFromTotal?: boolean; [key: string]: unknown };
export type MoneyRecord = { id: string | number; date: string; type: string; amount: number; accountId?: string | number; destinationId?: string | number; fee?: number; spendingCategory?: string; excludeFromReport?: boolean; note?: string | null; eventId?: string; person?: string; originalAmount?: number; currency?: string; exchangeRate?: number; [key: string]: unknown };
export type Ledger = { assets: Wallet[]; liabilities: Wallet[]; transactions: MoneyRecord[] };
const minor = (n: number) => Math.round(n * 100);
export function validateMoney(amount: number, allowZero = false) {
  if (!Number.isFinite(amount) || amount < (allowZero ? 0 : .01) || amount > 999999999.99 || Math.abs(amount * 100 - minor(amount)) > .00001) throw new Error("Enter a valid amount with at most two decimal places.");
}
function effect(state: Ledger, record: MoneyRecord, direction: 1 | -1): Ledger {
  validateMoney(record.amount);
  if (!Number.isFinite(Date.parse(record.date))) throw new Error("Choose a valid transaction date.");
  const next = { ...state, assets: state.assets.map(a => ({ ...a })), liabilities: state.liabilities.map(a => ({ ...a })) };
  const change = (id: unknown, delta: number, debt = false) => {
    const wallet = (debt ? next.liabilities : next.assets).find(a => a.id === id);
    if (!wallet) throw new Error("The linked account no longer exists. Restore it before changing this record.");
    const balance = minor(wallet.amount) + minor(delta) * direction;
    if (balance < 0 && direction === 1) throw new Error(`Not enough balance in ${wallet.name}.`);
    wallet.amount = balance / 100;
  };
  if (record.type === "adjustment") {
    change(record.accountId, record.adjustmentDirection === "down" ? -record.amount : record.amount, record.category === "Liabilities");
  } else if (record.type === "borrow") {
    change(record.accountId, record.amount, true);
    change(record.destinationId, record.amount);
  } else if (["transfer","lend","collect"].includes(record.type)) {
    if (record.accountId === record.destinationId) throw new Error("Choose two different accounts.");
    validateMoney(record.fee ?? 0, true);
    change(record.accountId, -record.amount - (record.fee ?? 0));
    change(record.destinationId, record.amount);
  } else if (record.type === "payment") {
    change(record.accountId, -record.amount, true);
    if (record.destinationId !== undefined) change(record.destinationId, -record.amount);
  } else if (record.type === "deposit") change(record.accountId, record.amount);
  else if (record.type === "withdrawal") change(record.accountId, -record.amount);
  else throw new Error("Unsupported transaction type.");
  return next;
}
export function recordMoney(state: Ledger, record: MoneyRecord): Ledger {
  const existing = state.transactions.find(t => t.id === record.id);
  if (existing) {
    if (!isEqual(existing, JSON.parse(JSON.stringify(record)))) throw new Error("This record was already saved with different details. Reload before editing it.");
    return state;
  }
  if (record.type === "payment" && record.destinationId == null) throw new Error("Choose the cash account paying this debt.");
  const next = effect(state, record, 1);
  if ([...next.assets,...next.liabilities].some(a=>!Number.isFinite(a.amount) || a.amount<0)) throw new Error("This change would leave an invalid account balance.");
  return { ...next, transactions: [JSON.parse(JSON.stringify(record)), ...state.transactions] };
}
export function removeMoney(state: Ledger, ids: (string | number)[], validate = true): Ledger {
  let next = state;
  for (const id of ids) {
    const record = next.transactions.find(t => t.id === id);
    if (record) next = { ...effect(next, record, -1), transactions: next.transactions.filter(t => t.id !== id) };
  }
  if (validate && [...next.assets,...next.liabilities].some(a=>!Number.isFinite(a.amount) || a.amount<0)) throw new Error("Deleting these records would leave an invalid account balance. Include the related spending or correct the account first.");
  return next;
}
export function replaceMoney(state: Ledger, record: MoneyRecord, expected?: MoneyRecord): Ledger {
  const current = state.transactions.find(t => t.id === record.id);
  if (!current) throw new Error("This transaction was removed on another device.");
  if (expected && !isEqual(current, expected)) throw new Error("This record changed on another device. Close and reopen it before saving.");
  return recordMoney(removeMoney(state, [record.id], false), record);
}
export function moneyReport(records: MoneyRecord[], start: string, end: string, wallet = "", event = "") {
  const rows = records.filter(t => {
    const date = new Date(t.date);
    if (!Number.isFinite(date.getTime()) || t.excludeFromReport) return false;
    const day = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Manila",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
    return day >= start && day <= end && (!wallet || String(t.accountId) === wallet || String(t.destinationId) === wallet) && (!event || t.eventId === event);
  });
  const income = rows.filter(t => t.type === "deposit").reduce((s,t) => s + minor(t.amount), 0) / 100;
  const feeForWallet = (t: MoneyRecord) => ["transfer", "lend", "collect"].includes(t.type) && (!wallet || String(t.accountId) === wallet) ? minor(t.fee || 0) : 0;
  const expense = rows.reduce((s,t) => s + (t.type === "withdrawal" ? minor(t.amount) : feeForWallet(t)), 0) / 100;
  const categories: Record<string, number> = {};
  for (const t of rows) if (t.type === "withdrawal") { const key = t.spendingCategory || "Uncategorized"; categories[key] = ((minor(categories[key] || 0)) + minor(t.amount)) / 100; }
  for (const t of rows) if (feeForWallet(t)) categories["Fees"] = (minor(categories["Fees"] || 0) + feeForWallet(t)) / 100;
  return { rows, income, expense, net: (minor(income) - minor(expense)) / 100, categories };
}
export function moneyCSV(records: MoneyRecord[]) {
  const cell = (v: unknown) => { const raw = String(v ?? ""); return `"${(/^(?:\s*[=+@-]|[\t\r])/.test(raw) ? "'" : "") + raw.replaceAll('"', '""')}"`; };
  return ["Date,Type,Amount,Category,Account,Note,Person,Event,Currency,Original amount,Rate,Excluded,Record ID,Destination account,Fee", ...records.map(t => [t.date,t.type,t.amount,t.spendingCategory,t.accountId,t.note,t.person,t.eventId,t.currency,t.originalAmount,t.exchangeRate,!!t.excludeFromReport,t.id,t.destinationId,t.fee].map(cell).join(","))].join("\r\n");
}
export function nextOccurrence(day: string, frequency: string, anchorDay?: number): string {
  if (!["daily","weekly","monthly","yearly"].includes(frequency)) throw new Error("Choose a valid frequency.");
  const d = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== day) throw new Error("Choose a valid date.");
  if (frequency === "daily" || frequency === "weekly") d.setUTCDate(d.getUTCDate() + (frequency === "daily" ? 1 : 7));
  else { const wanted = anchorDay || d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + (frequency === "yearly" ? 12 : 1)); const last = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(wanted,last)); }
  return d.toISOString().slice(0,10);
}
import { isEqual } from "./stableEqual";
