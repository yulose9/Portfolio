"use client";
import { useEffect, useRef } from "react";
import Num from "../Num";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { writingStreak } from "@/lib/seneca/utils/journal";

export default function JournalActivity({ entries, onOpen }: { entries: {id:string | number; isoDate?:string}[]; onOpen:(id:string | number)=>void }) {
  const today=getPhDateKey();
  const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
  const end=addDays(today,6-weekday);
  const days=Array.from({length:364},(_,i)=>addDays(end,i-363));
  const counts=new Map<string, typeof entries>();
  for(const entry of entries) if(entry.isoDate && entry.isoDate<=today) counts.set(entry.isoDate,[...(counts.get(entry.isoDate)||[]),entry]);
  const written=days.filter(day=>counts.has(day)).length;
  const scroller=useRef<HTMLDivElement>(null);
  useEffect(()=>{ if(scroller.current) scroller.current.scrollLeft=scroller.current.scrollWidth; },[]);
  return <section className="sn-journal-activity" aria-label="Journal consistency">
    <div className="sn-journal-activity-head"><div><h2>Your writing rhythm</h2><p>One reflection is enough to keep a day.</p></div><strong><Num value={writingStreak(entries.map(e=>e.isoDate),today)} /> <span>day streak</span></strong></div>
    <div ref={scroller} className="sn-journal-activity-scroll" tabIndex={0} aria-label="Last 52 weeks of journal activity; scroll horizontally for earlier days">
      <div className="sn-journal-activity-grid">{days.map(day=>{
        const found=counts.get(day)||[];
        const label=`${new Date(`${day}T12:00:00Z`).toLocaleDateString('en-PH',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'})}: ${found.length} ${found.length===1?'entry':'entries'}`;
        return found.length ? <button key={day} title={label} aria-label={label} data-level={Math.min(3,found.length)} aria-current={day===today?'date':undefined} data-sound="tick" onClick={()=>onOpen(found[0].id)} /> : <span key={day} title={label} aria-label={label} data-future={day>today||undefined} aria-current={day===today?'date':undefined} />;
      })}</div>
    </div>
    <div className="sn-journal-activity-foot"><span><Num value={written} /> {written===1?'day':'days'} written · Last 52 weeks</span><span>Less <i data-level="0"/><i data-level="1"/><i data-level="2"/><i data-level="3"/> More</span></div>
  </section>;
}
