export type MoneyAccount = { id: string | number; name?: string; amount: number; category?: string; platform?: string; excludeFromTotal?: boolean };
export type MoneyTransaction = { id: string | number; date: string; amount: number; type: string; bank?: string; note?: string | null; location?: string; category?: string; excludeFromReport?: boolean; fee?: number };
export type MoneyPeriod = 'all' | 'month' | 'year';
export type MoneySlice = { key: string; kind: 'held' | 'out'; title: string; amount: number; account?: MoneyAccount; transaction?: MoneyTransaction; start: number; end: number };
const phDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
function dateKey(date: Date) {
  const parts = phDate.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)?.value).join('-');
}
const cents = (value: number) => {
  const rounded = Math.round(value * 100);
  return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(rounded) ? rounded : null;
};

/** Holdings and recorded cash movement have different sources; never infer earnings from a balance. */
export function buildMoneyTrail(accounts: MoneyAccount[], transactions: MoneyTransaction[], period: MoneyPeriod = 'all', now = new Date()) {
  const today = dateKey(now);
  let invalid = 0;
  const holdings = accounts.filter(a=>!a.excludeFromTotal).flatMap(account => {
    const amount = cents(account.amount);
    if (amount === null) { invalid++; return []; }
    return amount ? [{ account, amount }] : [];
  });
  const records = transactions.filter(t=>!t.excludeFromReport).flatMap(t=>["transfer","lend","collect"].includes(t.type) ? (t.fee ? [{...t,type:"withdrawal",amount:t.fee,note:"Transaction fee"}] : []) : [t]).flatMap((transaction, index) => {
    const amount = cents(transaction.amount);
    const time = new Date(transaction.date).getTime();
    if (amount === null || !Number.isFinite(time)) { invalid++; return []; }
    const key = dateKey(new Date(time));
    if (key > today || (period === 'month' && key.slice(0, 7) !== today.slice(0, 7)) || (period === 'year' && key.slice(0, 4) !== today.slice(0, 4))) return [];
    // Manual balance edits already affect holdings and aren't receipts or spending.
    if (transaction.note?.trim().toLowerCase() === 'balance adjustment') return [];
    if (!['deposit', 'withdrawal', 'payment'].includes(transaction.type) || !amount) return [];
    return [{ transaction, amount, time, key: `transaction-${transaction.id}-${index}` }];
  }).sort((a, b) => a.time - b.time);
  const heldCents = holdings.reduce((sum, h) => sum + h.amount, 0);
  let inCents = 0, outCents = 0, running = 0;
  const points = records.map(record => {
    const incoming = record.transaction.type === 'deposit';
    if (incoming) inCents += record.amount; else outCents += record.amount;
    running += incoming ? record.amount : -record.amount;
    return { ...record, amount: record.amount / 100, value: running / 100, incoming };
  });
  const basis = heldCents + outCents;
  let position = 0;
  const rawSlices = [
    ...holdings.map(({ account, amount }) => ({ key: `account-${account.id}`, kind: 'held' as const, title: account.name || 'Unnamed account', amount, account })),
    ...records.filter(r => r.transaction.type !== 'deposit').map(record => ({ key: record.key, kind: 'out' as const, title: record.transaction.note?.trim() || record.transaction.category || 'Recorded outflow', amount: record.amount, transaction: record.transaction })),
  ];
  const slices: MoneySlice[] = rawSlices.map(slice => {
    const start = position;
    position += slice.amount;
    return { ...slice, amount: slice.amount / 100, start: basis ? start / basis : 0, end: basis ? position / basis : 0 };
  });
  return { held: heldCents / 100, incoming: inCents / 100, outgoing: outCents / 100, tracked: basis / 100, net: running / 100, slices, points, invalid };
}

/** Daily indicators describe recorded cash movement, not inferred account history. */
export function moneyDayChange(transactions: MoneyTransaction[], now = new Date()) {
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86400000));
  const totals = { todayIn: 0, todayOut: 0, yesterdayIn: 0, yesterdayOut: 0 };
  for (const point of buildMoneyTrail([], transactions, 'all', now).points) {
    const day = dateKey(new Date(point.time));
    if (day === today) totals[point.incoming ? 'todayIn' : 'todayOut'] += Math.round(point.amount * 100);
    if (day === yesterday) totals[point.incoming ? 'yesterdayIn' : 'yesterdayOut'] += Math.round(point.amount * 100);
  }
  return { net: (totals.todayIn - totals.todayOut) / 100, income: (totals.todayIn - totals.yesterdayIn) / 100, spending: (totals.todayOut - totals.yesterdayOut) / 100 };
}

/** Describe the selected records without assuming they cover someone's whole income. */
export function moneyStory(trail: ReturnType<typeof buildMoneyTrail>) {
  const subtitle = !trail.points.length ? 'Your story starts with a recorded deposit or expense.'
    : !trail.incoming ? 'Outflows recorded. Add income to see the fuller picture.'
    : !trail.outgoing ? 'Money came in. No outflows recorded in this period.'
    : trail.net < 0 ? 'Recorded spending is ahead of recorded income.'
    : trail.net === 0 ? 'Recorded income and spending are in balance.'
    : 'Recorded income is ahead of spending.';
  const categories = new Map<string, number>();
  for (const point of trail.points) {
    if (point.incoming) continue;
    const label = point.transaction.category?.trim() || 'Uncategorized';
    categories.set(label, (categories.get(label) || 0) + Math.round(point.amount * 100));
  }
  return {
    subtitle,
    spentPercent: trail.incoming ? trail.outgoing / trail.incoming * 100 : null,
    categories: [...categories].map(([label, cents]) => ({ label, amount: cents / 100, share: trail.outgoing ? cents / (trail.outgoing * 100) : 0 })).sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label)),
  };
}
