import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustAmount, budgetSpent, budgetLimit } from '../lib/seneca/utils/wealthPlanning.ts';
test('amount adjustments preserve cents and clamp at zero',()=>{assert.equal(adjustAmount('0.10',.2),'0.30');assert.equal(adjustAmount('5',-10),'0');assert.equal(adjustAmount('99.99',10),'109.99');});
test('budgets count only matching expenses in the Philippine month',()=>{const budget={id:'a',category:'Food & drink',month:'2026-10',limit:500};const rows=[{type:'withdrawal',date:'2026-09-30T16:00:00Z',amount:.1,spendingCategory:budget.category},{type:'withdrawal',date:'2026-10-01T00:00:00Z',amount:.2,spendingCategory:budget.category},{type:'deposit',date:'2026-10-01',amount:200,spendingCategory:budget.category},{type:'withdrawal',date:'invalid',amount:30,spendingCategory:budget.category},{type:'withdrawal',date:'2026-09-30T15:59:00Z',amount:40,spendingCategory:budget.category}];assert.equal(budgetSpent(rows,budget),.3);});
test('custom budgets include multiple categories and honor report exclusions and wallet filters',()=>{const b={id:'b',category:'Food & drink',categories:['Food & drink','Transport'],month:'2026-10',start:'2026-10-10',end:'2026-10-20',accountId:'a',limit:100};const rows=[{type:'withdrawal',date:'2026-10-13',amount:10,spendingCategory:'Transport',accountId:'a'},{type:'withdrawal',date:'2026-10-13',amount:50,spendingCategory:'Food & drink',accountId:'b'},{type:'withdrawal',date:'2026-10-13',amount:30,spendingCategory:'Food & drink',accountId:'a',excludeFromReport:true}];assert.equal(budgetSpent(rows,b),10);});

test('rollover carries only unused funds from matching earlier scope',()=>{const previous={id:'old',category:'Food & drink',month:'2026-09',start:'2026-09-01',end:'2026-09-30',limit:100};const current={...previous,id:'new',month:'2026-10',start:'2026-10-01',end:'2026-10-31',limit:200,rollover:true};assert.equal(budgetLimit(current,[previous,current],[{type:'withdrawal',date:'2026-09-15',amount:30,spendingCategory:'Food & drink'}]),270);assert.equal(budgetLimit({...current,accountId:'other'},[previous,current],[]),200);});
test('all-category budgets include uncategorized expenses and transaction fees once',()=>{
 const budget={id:'all',category:'All categories',month:'2026-10',limit:100};
 const transactions=[{type:'withdrawal',amount:20,date:'2026-10-14T12:00:00+08:00'},{type:'transfer',amount:500,fee:5,date:'2026-10-14T12:00:00+08:00'}];
 assert.equal(budgetSpent(transactions,budget),25);
 assert.equal(budgetSpent(transactions,{...budget,category:'Fees'}),5);
});
