/**
 * An account's balance at the end of each recent day, rebuilt from its money
 * records: start from today's balance and undo each later record. Mirrors the
 * ledger's own effect rules (wealthLedger.ts), so the line matches what the
 * records actually did instead of a guess.
 */

type Account = { id: string | number; amount: number };
type Record_ = { id?: string | number; date: string; type: string; amount: number; accountId?: string | number; destinationId?: string | number; fee?: number; adjustmentDirection?: string; category?: string };

const phDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
const dayOf = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? phDate.format(new Date(t)) : null;
};
const cents = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : 0);

/** How a record moved this account's balance, in cents (positive = balance went up). */
export function recordDelta(record: Record_, accountId: string | number, isLiability: boolean): number {
  const mine = record.accountId === accountId;
  const dest = record.destinationId === accountId;
  const amount = cents(record.amount);
  switch (record.type) {
    case "deposit":
      return !isLiability && mine ? amount : 0;
    case "withdrawal":
      return !isLiability && mine ? -amount : 0;
    case "adjustment":
      return mine && (record.category === "Liabilities") === isLiability ? (record.adjustmentDirection === "down" ? -amount : amount) : 0;
    case "borrow":
      return isLiability ? (mine ? amount : 0) : dest ? amount : 0;
    case "payment":
      return isLiability ? (mine ? -amount : 0) : dest ? -amount : 0;
    case "transfer":
    case "lend":
    case "collect":
      if (isLiability) return 0;
      return (mine ? -amount - cents(record.fee) : 0) + (dest ? amount : 0);
    default:
      return 0;
  }
}

/** `days` end-of-day balances, oldest first, ending with today (the current balance). */
export function balanceHistory(account: Account, records: Record_[], isLiability: boolean, today: string, days = 30) {
  const keys: string[] = [];
  const end = Date.parse(`${today}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) keys.push(new Date(end - i * 86400000).toISOString().slice(0, 10));

  // Net change on each day, for records that touched this account.
  const byDay = new Map<string, number>();
  for (const record of records) {
    const day = dayOf(record.date);
    if (!day || day > today) continue;
    const delta = recordDelta(record, account.id, isLiability);
    if (delta) byDay.set(day, (byDay.get(day) || 0) + delta);
  }

  let balance = cents(account.amount);
  const out: { date: string; value: number }[] = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    out.push({ date: keys[i], value: balance / 100 });
    balance -= byDay.get(keys[i]) || 0;
  }
  return out.reverse();
}
