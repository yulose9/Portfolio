"use client";
import { useEffect, useState } from "react";
import { tagSlug } from "../../../cms/format";
import { tagPage, type TagPage } from "../../../cms/tag-pages";
import UpdatedAt from "../../components/UpdatedAt";
import { api } from "./api";
import { beginPendingWork } from "./session";
import Sheet from "./Sheet";

export default function TagPages({open,onClose}:{open:boolean;onClose:()=>void}) {
  const [tags,setTags]=useState<string[]|null>(null);
  const [selected,setSelected]=useState("");
  const [page,setPage]=useState<TagPage|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  useEffect(()=>{if(!open)return;let live=true;api.list().then(({posts})=>{if(live)setTags([...new Set(posts.filter(p=>!p.trashedAt).flatMap(p=>p.tags))].sort());}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[open]);
  useEffect(()=>{if(!open||!selected)return;let live=true;api.tagPage(tagSlug(selected)).then(({page})=>{if(!live)return;try{const cached=sessionStorage.getItem(`admin:tag:${tagSlug(selected)}`);setPage(cached?tagPage(JSON.parse(cached)):page);}catch{setPage(page);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[open,selected]);
  const [loadedKey,setLoadedKey]=useState("");
  const nextKey=`${open}:${selected}`;
  if(loadedKey!==nextKey){setLoadedKey(nextKey);setPage(null);setError("");setMessage("");}
  const change=(patch:Partial<TagPage>)=>{if(!page)return;const next={...page,...patch};setPage(next);setMessage("");try{sessionStorage.setItem(`admin:tag:${tagSlug(selected)}`,JSON.stringify(next));}catch{setError("Browser recovery is unavailable. Keep this panel open until you save.");}};
  const save=async()=>{if(!page)return;const finish=beginPendingWork();setBusy(true);setError("");try{const result=await api.saveTagPage(tagSlug(selected),page);setPage(result.page);try{sessionStorage.removeItem(`admin:tag:${tagSlug(selected)}`);}catch{}setMessage("Saved. The tag page updates after the site finishes building.");}catch(e){setError(e instanceof Error?e.message:"Couldn’t save this tag page.");}finally{setBusy(false);finish();}};
  return <Sheet open={open} onClose={()=>{if(!busy)onClose();}} title="Tag pages" description="Give each topic a title and description. Saving publishes the change.">
    <div className="tag-page-fields"><label>Tag<select value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">Choose a tag</option>{(tags??[]).map(t=><option key={t}>{t}</option>)}</select></label>
      {tags===null&&!error?<p role="status">Loading tags…</p>:null}
      {tags?.length===0?<p className="field-help">Add tags to a post to manage their pages here.</p>:null}
      {page?<><p className="field-help">/writing/tag/{tagSlug(selected)}</p><label>Page title<input value={page.title} maxLength={100} placeholder={selected} disabled={busy} onChange={e=>change({title:e.target.value})}/></label><label>Description<textarea value={page.description} rows={5} maxLength={2000} disabled={busy} onChange={e=>change({description:e.target.value})}/></label>{page.updatedAt?<UpdatedAt at={page.updatedAt}/>:null}<button type="button" className="admin-button" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":"Save and publish"}</button></>:selected&&!error?<p role="status">Loading…</p>:null}
      {error?<p role="alert">{error}</p>:null}{error&&selected?<button type="button" className="admin-button" disabled={busy} onClick={async()=>{const slug=tagSlug(selected);setBusy(true);setError("");try{const {page}=await api.tagPage(slug);try{sessionStorage.removeItem(`admin:tag:${slug}`);}catch{}setPage(page);}catch(e){setError(e instanceof Error?e.message:"Couldn’t reload.");}finally{setBusy(false);}}}>Discard local edits and reload saved version</button>:null}{message?<p role="status">{message}</p>:null}
    </div>
  </Sheet>;
}
