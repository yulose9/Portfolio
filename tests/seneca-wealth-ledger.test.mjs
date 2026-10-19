import test from 'node:test';
import assert from 'node:assert/strict';
import {recordMoney,removeMoney,replaceMoney,moneyReport,moneyCSV,nextOccurrence} from '../lib/seneca/utils/wealthLedger.ts';
const initial=()=>({assets:[{id:'a',name:'Cash',amount:1000,category:'Savings'},{id:'b',name:'Savings',amount:100,category:'Savings'}],liabilities:[{id:'d',name:'Debt',amount:500,category:'Liabilities'}],transactions:[]});
const expense={id:'x',type:'withdrawal',date:'2026-10-13T12:00:00+08:00',amount:90,accountId:'a',spendingCategory:'Food & drink'};
test('expense edit/delete reverses exactly and never changes original state',()=>{const base=initial();const added=recordMoney(base,expense);assert.equal(base.assets[0].amount,1000);assert.equal(added.assets[0].amount,910);assert.equal(replaceMoney(added,{...expense,amount:30}).assets[0].amount,970);assert.deepEqual(removeMoney(added,['x']),base);assert.equal(recordMoney(added,expense),added);});
test('transfer conserves funds apart from fee; reports exclude principal',()=>{const moved=recordMoney(initial(),{...expense,type:'transfer',destinationId:'b',amount:200,fee:5});assert.equal(moved.assets[0].amount,795);assert.equal(moved.assets[1].amount,300);assert.equal(moneyReport(moved.transactions,'2026-10-01','2026-10-31').expense,5);assert.deepEqual(removeMoney(moved,['x']),initial());});
test('debt payment changes both accounts and reverses together',()=>{const paid=recordMoney(initial(),{...expense,type:'payment',accountId:'d',destinationId:'a',amount:100});assert.equal(paid.assets[0].amount,900);assert.equal(paid.liabilities[0].amount,400);assert.deepEqual(removeMoney(paid,['x']),initial());});
test('reject invalid money, overdrafts, missing and identical accounts',()=>{for(const amount of [NaN,Infinity,-1,0,1.001,1001])assert.throws(()=>recordMoney(initial(),{...expense,amount}));assert.throws(()=>recordMoney(initial(),{...expense,accountId:'missing'}));assert.throws(()=>recordMoney(initial(),{...expense,type:'transfer',destinationId:'a'}));});
test('reports respect exclusions, filters and PH midnight',()=>{const rows=[expense,{...expense,id:'y',amount:200,excludeFromReport:true},{...expense,id:'z',date:'2026-09-30T16:00:00Z',amount:10}];assert.equal(moneyReport(rows,'2026-10-01','2026-10-31').expense,100);assert.equal(moneyReport(rows,'2026-10-01','2026-10-31','b').expense,0);});
test('CSV neutralizes formulas and escapes quoted notes',()=>{const csv=moneyCSV([{...expense,note:'=HYPERLINK("bad")'}]);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('""bad""'));});
test('recurrence clamps month ends and leap years',()=>{assert.equal(nextOccurrence('2026-01-31','monthly'),'2026-02-28');assert.equal(nextOccurrence('2024-02-29','yearly'),'2025-02-28');assert.equal(nextOccurrence('2026-12-31','daily'),'2027-01-01');});
test('editing income after spending does not fail on an intermediate balance',()=>{let s=initial();s.assets[0].amount=0;s=recordMoney(s,{...expense,type:'deposit',amount:100});s=recordMoney(s,{...expense,id:'spent',amount:90});assert.equal(replaceMoney(s,{...expense,type:'deposit',amount:100,note:'Corrected'}).assets[0].amount,10);assert.throws(()=>replaceMoney(s,{...expense,type:'deposit',amount:80}));});
test('borrowing and lending preserve net worth and reverse cleanly',()=>{const borrowed=recordMoney(initial(),{...expense,type:'borrow',accountId:'d',destinationId:'a',amount:100});assert.equal(borrowed.assets[0].amount,1100);assert.equal(borrowed.liabilities[0].amount,600);assert.deepEqual(removeMoney(borrowed,['x']),initial());const lent=recordMoney(initial(),{...expense,type:'lend',destinationId:'b',amount:100});assert.equal(lent.assets[0].amount,900);assert.equal(lent.assets[1].amount,200);assert.equal(moneyReport(lent.transactions,'2026-10-01','2026-10-31').expense,0);});
test('replacing a transfer cannot leave its old destination negative',()=>{let s=recordMoney(initial(),{...expense,type:'transfer',destinationId:'b',amount:200});s=recordMoney(s,{...expense,id:'spent',accountId:'b',amount:250});assert.throws(()=>replaceMoney(s,{...expense,type:'withdrawal',amount:200}));});

test('destination reports include transfers without charging source fees twice',()=>{
  const rows=[{...expense,type:'transfer',destinationId:'b',fee:5}];
  const destination=moneyReport(rows,'2026-10-01','2026-10-31','b');
  assert.equal(destination.rows.length,1);
  assert.equal(destination.income,0);
  assert.equal(destination.expense,0);
  assert.deepEqual(moneyReport(rows,'2026-10-01','2026-10-31','a').categories,{Fees:5});
});
test('lending and collection fees reconcile category and report totals',()=>{
  const rows=['lend','collect'].map((type,i)=>({...expense,id:i,type,destinationId:'b',fee:2.25}));
  const report=moneyReport(rows,'2026-10-01','2026-10-31');
  assert.equal(report.expense,4.5);
  assert.equal(report.categories.Fees,4.5);
  const csv=moneyCSV(rows);
  assert.ok(csv.includes('Record ID,Destination account,Fee'));
  assert.ok(csv.includes('"0","b","2.25"'));
});
test('recurrence rejects impossible calendar dates',()=>{
  assert.throws(()=>nextOccurrence('2026-02-30','monthly'));
});

test('conflicting duplicate IDs and unpaired new debt payments are rejected',()=>{
 const saved=recordMoney(initial(),expense);
 assert.throws(()=>recordMoney(saved,{...expense,amount:10}),/different details/);
 assert.throws(()=>recordMoney(initial(),{...expense,type:'payment',accountId:'d'}),/cash account/);
 assert.throws(()=>recordMoney(initial(),{...expense,type:'transfer',destinationId:'b',fee:NaN}));
});

test('editing a stale record fails instead of overwriting another device',()=>{
 let state=recordMoney(initial(),expense);
 state=replaceMoney(state,{...expense,amount:40});
 assert.throws(()=>replaceMoney(state,{...expense,note:'stale edit'},expense),/another device/);
 assert.equal(state.assets[0].amount,960);
});
