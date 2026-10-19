export const SPENDING_CATEGORIES = ['Food & drink', 'Transport', 'Home & bills', 'Health', 'Learning', 'Shopping', 'Leisure', 'Other'] as const;
export const cents = (amount:number) => Math.round((amount + Number.EPSILON) * 100);
export function adjustAmount(value:string, delta:number):string {
  return (Math.max(0, Math.min(99999999999, cents(Number(value)||0)+cents(delta)))/100).toFixed(value.includes('.') ? 2 : 0);
}
export type CategoryBudget = {id:string; category:string; month:string; limit:number; deleted?:boolean; categories?:string[]; start?:string; end?:string; accountId?:string; rollover?:boolean};
export function budgetSpent(transactions:{type:string; date:string; amount:number; spendingCategory?:string; excludeFromReport?:boolean; accountId?:string | number; fee?:number}[], budget:CategoryBudget):number {
  return transactions.reduce((sum,t)=> {
    const fee = ['transfer','lend','collect'].includes(t.type);
    const amount = fee ? t.fee || 0 : t.amount;
    const category = fee ? 'Fees' : t.spendingCategory || 'Uncategorized';
    if((t.type!=='withdrawal' && !fee) || t.excludeFromReport || (budget.category !== 'All categories' && !(budget.categories || [budget.category]).includes(category)) || (budget.accountId && String(t.accountId)!==budget.accountId) || !Number.isFinite(amount) || amount<0) return sum;
    const date=new Date(t.date);
    if(Number.isNaN(date.getTime())) return sum;
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    const included=budget.start && budget.end ? day>=budget.start && day<=budget.end : day.slice(0,7)===budget.month;
    return included ? sum+cents(amount) : sum;
  },0)/100;
}

/** Carry unused funds from the closest earlier budget with the same scope. */
export function budgetLimit(budget:CategoryBudget, all:CategoryBudget[], transactions:Parameters<typeof budgetSpent>[0]):number {
  const scope=(b:CategoryBudget)=>JSON.stringify([(b.categories || [b.category]).slice().sort(),b.accountId || '']);
  const used=new Set<string>();
  const resolve=(b:CategoryBudget):number=>{
    if(!b.rollover || !b.start || used.has(b.id)) return b.limit;
    used.add(b.id);
    const previous=all.filter(p=>!p.deleted && p.id!==b.id && p.end && p.end<b.start! && scope(p)===scope(b)).sort((a,c)=>c.end!.localeCompare(a.end!))[0];
    return previous ? (cents(b.limit)+Math.max(0,cents(resolve(previous))-cents(budgetSpent(transactions,previous))))/100 : b.limit;
  };
  return resolve(budget);
}
