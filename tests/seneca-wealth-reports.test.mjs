import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceRange,reportDetails,scopedRecords,periodRange} from '../lib/seneca/utils/wealthReports.ts';
const wallets=[{id:'cash',name:'Cash',category:'Savings',amount:895},{id:'save',name:'Savings',category:'Savings',amount:200}];
const transfer={id:'move',date:'2026-10-14T12:00:00+08:00',type:'transfer',amount:100,fee:5,accountId:'cash',destinationId:'save'};
const scope={start:'2026-10-14',end:'2026-10-14'};
test('opening and closing balances reverse cash movements without treating transfers as income',()=>{
 assert.deepEqual(balanceRange(wallets,[transfer],scope),{opening:1100,closing:1095});
 assert.deepEqual(balanceRange(wallets,[transfer],{...scope,wallet:'save'}),{opening:100,closing:200});
 assert.deepEqual(balanceRange(wallets,[transfer],{start:'2026-10-01',end:'2026-10-13'}),{opening:1100,closing:1100});
});
test('excluded adjustments affect balances but not reported income',()=>{
 const adjustment={...transfer,id:'adjust',type:'adjustment',amount:20,accountId:'cash',category:'Savings',adjustmentDirection:'up',excludeFromReport:true};
 const report=reportDetails([adjustment],scope);
 assert.equal(report.income,0);assert.equal(report.excluded.length,1);
 assert.deepEqual(balanceRange([{...wallets[0],amount:120}],[adjustment],scope),{opening:100,closing:120});
});
test('reports retain exact date, event and destination scope for record drilldown',()=>{
 const rows=[transfer,{...transfer,id:'earlier',date:'2026-10-13T12:00:00+08:00'},{...transfer,id:'event',eventId:'trip'}];
 assert.deepEqual(scopedRecords(rows,{...scope,wallet:'save',event:'trip'}).map(r=>r.id),['event']);
});
test('income categories and daily fees reconcile with report totals',()=>{
 const income={...transfer,id:'salary',type:'deposit',amount:200,spendingCategory:'Salary',fee:undefined,destinationId:undefined};
 const report=reportDetails([transfer,income],scope);
 assert.deepEqual(report.incomeCategories,{Salary:200});
 assert.deepEqual(report.days,[{day:'2026-10-14',income:200,expense:5}]);
});
test('calendar shortcuts use Monday weeks and quarter boundaries',()=>{
 assert.deepEqual(periodRange('Week','2026-10-14'),{start:'2026-10-12',end:'2026-10-14'});
 assert.equal(periodRange('Quarter','2026-10-14').start,'2026-10-01');
 assert.equal(periodRange('Year','2026-10-14').start,'2026-01-01');
});
