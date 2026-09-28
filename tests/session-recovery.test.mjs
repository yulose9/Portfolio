import test from "node:test";
import assert from "node:assert/strict";
import {beginPendingWork,keepRecovery,readRecovery,clearRecovery,registerProtection,protectWork,reportSession,reportExpired,sessionExpiry} from "../app/admin/ui/session.ts";
test("draft body and metadata survive a session-expiry recovery cycle", () => {
  const store=new Map();
  globalThis.sessionStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k)};
  const edit={body:"Unsaved last sentence",title:"New title",cover:{src:"/media/cover.png"},tags:["draft"]};
  assert.equal(keepRecovery("post", "base-1", edit),true);
  assert.deepEqual(readRecovery("post").edit,edit);
  assert.equal(readRecovery("post").base,"base-1");
  clearRecovery("post"); assert.equal(readRecovery("post"),null);
});
test("storage failure does not pretend that a draft is protected", () => {
  globalThis.sessionStorage={setItem:()=>{throw Error("quota")},getItem:()=>{throw Error("denied")}};
  assert.equal(keepRecovery("post","base",{body:"new"}),false);
  assert.equal(readRecovery("post"),null);
});
test("session confirmation awaits registered save protection", async () => {
  let finish;
  const unregister=registerProtection(()=>new Promise(resolve=>{finish=resolve}));
  let done=false;
  const pending=protectWork().then(result=>{done=true;return result});
  await Promise.resolve(); assert.equal(done,false);
  finish({saved:false,recoverable:true});
  assert.deepEqual(await pending,{saved:false,recoverable:true});
  unregister(); assert.deepEqual(await protectWork(),{saved:true,recoverable:true});
});
test("invalid expiry is ignored and repeated expiry failures do not retrigger notices", () => {
  reportSession(NaN); assert.equal(sessionExpiry,0);
  reportSession(Date.now()+60_000); reportExpired();
  const expired=sessionExpiry; reportExpired(); assert.equal(sessionExpiry,expired);
});
test("uploads and recordings prevent a protected navigation until finished", async () => {
  const finish=beginPendingWork();
  assert.equal((await protectWork()).pending,true);
  finish(); finish();
  assert.equal((await protectWork()).pending,undefined);
});
test("unexpected save errors block navigation instead of reporting success", async () => {
  const unregister=registerProtection(async()=>{throw Error("serialization")});
  const result=await protectWork();
  assert.equal(result.saved,false); assert.equal(result.recoverable,false);
  unregister();
});
test("session protection waits for editor and research forms together",async()=>{
  const editor=registerProtection(async()=>({saved:true,recoverable:true}));
  const form=registerProtection(async()=>({saved:false,recoverable:true}));
  assert.deepEqual(await protectWork(),{saved:false,recoverable:true});
  form();assert.deepEqual(await protectWork(),{saved:true,recoverable:true});editor();
});
