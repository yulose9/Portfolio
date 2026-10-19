import { moneyReport, type MoneyRecord, type Wallet } from "./wealthLedger";

const cents = (value: number) => Math.round(value * 100);
const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
export const recordDay = (date: string) => Number.isFinite(Date.parse(date)) ? formatter.format(new Date(date)) : "";
export type ReportScope = { start: string; end: string; wallet?: string; event?: string; category?: string; type?: "deposit" | "withdrawal"; day?: string; excluded?: boolean };
export function scopedRecords(records: MoneyRecord[], scope: ReportScope) {
  return records.filter(record => {
    const day = recordDay(record.date);
    return day && day >= scope.start && day <= scope.end && (!scope.day || scope.day === day)
      && (!scope.wallet || String(record.accountId) === scope.wallet || String(record.destinationId) === scope.wallet)
      && (!scope.event || record.eventId === scope.event)
      && (scope.excluded ? !!record.excludeFromReport : !record.excludeFromReport);
  });
}

/** Cash movement, including transfers and excluded records; not profit or net worth. */
export function accountMovement(record: MoneyRecord, wallet: string | number): number {
  const source = record.accountId === wallet;
  const destination = record.destinationId === wallet;
  if (record.type === "adjustment") return source && record.category !== "Liabilities" ? cents(record.amount) * (record.adjustmentDirection === "down" ? -1 : 1) : 0;
  if (record.type === "deposit") return source ? cents(record.amount) : 0;
  if (record.type === "withdrawal") return source ? -cents(record.amount) : 0;
  if (record.type === "borrow") return destination ? cents(record.amount) : 0;
  if (record.type === "payment") return destination ? -cents(record.amount) : 0;
  if (["transfer", "lend", "collect"].includes(record.type)) return (source ? -cents(record.amount) - cents(record.fee || 0) : 0) + (destination ? cents(record.amount) : 0);
  return 0;
}

/** Reconstruct from current balances, reversing subsequent recorded movements. */
export function balanceRange(wallets: Wallet[], records: MoneyRecord[], scope: ReportScope) {
  const selected = wallets.filter(w => !scope.wallet || String(w.id) === scope.wallet);
  let opening = selected.reduce((sum, w) => sum + cents(w.amount), 0);
  let closing = opening;
  for (const record of records) {
    const day = recordDay(record.date);
    if (!day) continue;
    const movement = selected.reduce((sum, wallet) => sum + accountMovement(record, wallet.id), 0);
    if (day >= scope.start) opening -= movement;
    if (day > scope.end) closing -= movement;
  }
  return { opening: opening / 100, closing: closing / 100 };
}

export function reportDetails(records: MoneyRecord[], scope: ReportScope) {
  const report = moneyReport(records, scope.start, scope.end, scope.wallet, scope.event);
  const incomeCategories: Record<string, number> = {};
  const days = new Map<string, { day: string; income: number; expense: number }>();
  for (const record of report.rows) {
    const day = recordDay(record.date);
    const bucket = days.get(day) || { day, income: 0, expense: 0 };
    if (record.type === "deposit") {
      bucket.income += cents(record.amount);
      const category = record.spendingCategory || "Uncategorized";
      incomeCategories[category] = (cents(incomeCategories[category] || 0) + cents(record.amount)) / 100;
    }
    if (record.type === "withdrawal") bucket.expense += cents(record.amount);
    if (["transfer", "lend", "collect"].includes(record.type) && (!scope.wallet || String(record.accountId) === scope.wallet)) bucket.expense += cents(record.fee || 0);
    if (bucket.income || bucket.expense) days.set(day, bucket);
  }
  const excluded = scopedRecords(records, { ...scope, excluded: true });
  return { ...report, incomeCategories, excluded, days: [...days.values()].sort((a,b) => a.day.localeCompare(b.day)).map(d => ({ ...d, income: d.income / 100, expense: d.expense / 100 })) };
}

export function periodRange(preset: string, today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid date.");
  let start = today;
  if (preset === "Week") { date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); start = date.toISOString().slice(0,10); }
  if (preset === "Month") start = `${today.slice(0,7)}-01`;
  if (preset === "Quarter") start = `${date.getUTCFullYear()}-${String(Math.floor(date.getUTCMonth()/3)*3+1).padStart(2,"0")}-01`;
  if (preset === "Year") start = `${date.getUTCFullYear()}-01-01`;
  return { start, end: today };
}
