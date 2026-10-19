import test from 'node:test';
import assert from 'node:assert/strict';
import { switchPrivateCache, CACHE_OWNER } from '../lib/seneca/utils/privateCache.ts';
function store(initial={}) { const data=new Map(Object.entries(initial));return {get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; }
test('local sessions retain legacy data; signing in does not import it',()=>{
 const s=store({wealth_assets:'local money',theme:'dark'});
 assert.equal(switchPrivateCache(s,null),false);
 assert.equal(s.getItem('wealth_assets'),'local money');
 switchPrivateCache(s,'alice');assert.equal(s.getItem('wealth_assets'),null);assert.equal(s.getItem('theme'),'dark');
 switchPrivateCache(s,null);assert.equal(s.getItem('wealth_assets'),'local money');
});
test('direct account switches isolate money, protocol and dirty state',()=>{
 const s=store({[CACHE_OWNER]:'user:alice',wealth_assets:'alice money',protocol_today_tasks:'alice habits',seneca_sync_dirty:'alice pending'});
 switchPrivateCache(s,'bob');assert.equal(s.getItem('wealth_assets'),null);assert.equal(s.getItem('protocol_today_tasks'),null);assert.equal(s.getItem('seneca_sync_dirty'),null);
 s.setItem('wealth_assets','bob money');switchPrivateCache(s,'alice');assert.equal(s.getItem('wealth_assets'),'alice money');
 switchPrivateCache(s,'bob');assert.equal(s.getItem('wealth_assets'),'bob money');
});
test('reload under the same owner never discards pending records',()=>{
 const s=store({[CACHE_OWNER]:'user:alice',wealth_ledger_recovery:'pending'});
 assert.equal(switchPrivateCache(s,'alice'),false);assert.equal(s.getItem('wealth_ledger_recovery'),'pending');
});
test('unknown legacy cache is preserved separately, never exposed on logout',()=>{
 const s=store({journal_entries:'legacy journal'});switchPrivateCache(s,'alice');assert.equal(s.getItem('journal_entries'),null);
 switchPrivateCache(s,null);assert.equal(s.getItem('journal_entries'),null);
 assert.ok(s.getItem('seneca_private_cache_v1:unassigned').includes('legacy journal'));
});

test('interrupted cache restoration keeps the source archive intact on retry',()=>{
 const s=store({[CACHE_OWNER]:'user:alice',wealth_assets:'alice money','seneca_private_cache_v1:user%3Abob':JSON.stringify({wealth_assets:'bob money',wealth_transactions:'bob records'})});
 const original=s.setItem;let fail=true;
 s.setItem=(key,value)=>{if(fail && key==='wealth_transactions')throw new Error('quota');original(key,value);};
 assert.throws(()=>switchPrivateCache(s,'bob'));
 fail=false;switchPrivateCache(s,'bob');assert.equal(s.getItem('wealth_assets'),'bob money');
 switchPrivateCache(s,'alice');assert.equal(s.getItem('wealth_assets'),'alice money');
});
