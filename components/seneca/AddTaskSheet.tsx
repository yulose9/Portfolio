"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { EmojiPicker, Fluent } from "@/app/admin/ui/extensions/emoji";
import AdminSelect from "@/app/admin/ui/AdminSelect";
import { playSound } from "@/app/components/ui/sound";
import Sheet from "./Sheet";

const PHASES = [
  { value: "morningIgnition", label: "Morning Ignition" },
  { value: "arena", label: "The Arena" },
  { value: "maintenance", label: "The Maintenance" },
  { value: "shutdown", label: "The Shutdown" },
];

export default function AddTaskSheet({ visible, onClose, onAddTask, protocolCategory = "personal" }: {
  visible: boolean; onClose: () => void; onAddTask: (phase: string, task: Record<string, unknown>) => void; protocolCategory?: string;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [phase, setPhase] = useState("morningIgnition");
  const [picking, setPicking] = useState(false);
  const haptic = useWebHaptics();
  useEffect(() => { setPhase(protocolCategory === "personal" ? "morningIgnition" : "general"); }, [protocolCategory]);
  const label = protocolCategory === "personal" ? "New Task" : `New ${protocolCategory.charAt(0).toUpperCase() + protocolCategory.slice(1)} Task`;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAddTask(phase, { id: `custom-${crypto.randomUUID()}`, title: title.trim(), subtitle: subtitle.trim(), description: description.trim(), emoji, done: false, isCustom: true });
    haptic.trigger("success");
    playSound("success");
    setTitle(""); setSubtitle(""); setDescription(""); setEmoji("📝"); setPicking(false);
    onClose();
  };
  return <Sheet open={visible} onClose={onClose} label={label} className="sn-sheet sn-task-editor">
    <form onSubmit={submit}>
      <div className="sn-sheet-head"><div><h2>{label}</h2><p className="text-sm text-ink-2 mt-1">Give your routine one clear next step.</p></div><button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}><X size={18} /></button></div>
      <div className="sn-sheet-body">
        <div className="sn-task-identity">
          <button type="button" className="sn-task-icon" aria-label="Change icon" aria-expanded={picking} data-sound="select" onClick={() => setPicking(value => !value)}><Fluent emoji={emoji} size={40} /></button>
          <label className="sn-field"><span>Task name</span><input autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Enter task name" required /></label>
        </div>
        {picking && <div className="sn-task-emoji"><EmojiPicker onPick={value => { setEmoji(value); setPicking(false); }} /></div>}
        <div className="sn-task-fields">
          <AdminSelect label="When it belongs" value={phase} onValueChange={setPhase} options={protocolCategory === "personal" ? PHASES : [{ value: "general", label: "Unscheduled" }, ...PHASES]} />
          <label className="sn-field"><span>Short reminder <small>Optional</small></span><input value={subtitle} onChange={e => setSubtitle(e.target.value)} maxLength={240} placeholder="What helps you start?" /></label>
        </div>
        <label className="sn-field"><span>Details <small>Optional</small></span><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="Steps, notes, or what done looks like" /></label>
      </div>
      <div className="sn-sheet-foot"><button type="button" className="sn-btn sn-btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="sn-btn sn-btn-primary" disabled={!title.trim()} data-sound="none">Add task</button></div>
    </form>
  </Sheet>;
}
