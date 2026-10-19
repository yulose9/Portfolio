// @ts-nocheck
"use client";
import { motion } from "framer-motion";
import { Download, FileJson, RotateCcw, Upload, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import { exportAsLLMPrompt, exportForLLM } from "@/lib/seneca/services/dataLogger";
import { listDayLogs } from "@/lib/seneca/services/history";
import { backupCounts, createBackup, downloadJSON, readBackup, restoreBackup } from "@/lib/seneca/services/backup";
import { addDays, getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { TAP_TRANSITION } from "@/lib/seneca/constants/motion";
import Sheet from "./Sheet";
import Num from "./Num";
import "@/app/admin/ui/seneca-data.css";

const RANGES = [7, 30, 90, 365];

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/**
 * Backup and export, read from the cloud (not this device's cache):
 * - the whole account as one JSON file,
 * - a range of days shaped for an AI to read,
 * - and restore, which merges a backup file back into the account.
 */
export default function ExportDataButton({ inline = true, pill = false }: { inline?: boolean; pill?: boolean }) {
  const haptic = useWebHaptics();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // "backup" | "ai" | "restore"
  const [status, setStatus] = useState(null); // { tone: "ok" | "error", text }
  const [days, setDays] = useState(30);
  const [format, setFormat] = useState("json");
  const [pending, setPending] = useState(null); // a parsed backup waiting for confirmation
  const fileRef = useRef(null);

  const run = async (kind, task) => {
    setBusy(kind);
    setStatus(null);
    try {
      const text = await task();
      haptic.trigger("success");
      setStatus({ tone: "ok", text });
    } catch (error) {
      haptic.trigger("error");
      setStatus({ tone: "error", text: error?.message || "Something went wrong. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const today = getPhDateKey();

  const downloadBackup = () =>
    run("backup", async () => {
      const backup = await createBackup();
      downloadJSON(`seneca-backup-${today}.json`, backup);
      const total = Object.values(backup.counts).reduce((a, b) => a + b, 0);
      return `Saved ${plural(total, "document")}: ${plural(backup.counts.daily_logs, "day")}, ${plural(backup.counts.global_data, "collection")} of records, and settings.`;
    });

  const downloadForAI = () =>
    run("ai", async () => {
      const logs = (await listDayLogs({ from: addDays(today, -(days - 1)), to: today })).map((d) => ({ date: d.date, ...d.raw }));
      if (format === "json") downloadJSON(`seneca-${days}-days.json`, exportForLLM(days, logs));
      else {
        const blob = new Blob([exportAsLLMPrompt(days, logs)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seneca-${days}-days-prompt.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return `Exported ${plural(logs.length, "logged day")} from the last ${days}.`;
    });

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus(null);
    try {
      const backup = readBackup(JSON.parse(await file.text()));
      setPending({ backup, name: file.name, counts: backupCounts(backup) });
    } catch (error) {
      setPending(null);
      setStatus({ tone: "error", text: error instanceof SyntaxError ? "That file isn't valid JSON." : error.message });
    }
  };

  const confirmRestore = () =>
    run("restore", async () => {
      const written = await restoreBackup(pending.backup);
      setPending(null);
      return `Restored ${plural(written, "document")} from ${pending.name}.`;
    });

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPending(null);
    setStatus(null);
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={TAP_TRANSITION}
        aria-label="Backup and export"
        onClick={() => {
          haptic.trigger("medium");
          setOpen(true);
        }}
        className={
          pill
            ? "sn-btn sn-btn-light sn-btn-block"
            : inline
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-fill hover:bg-fill-strong text-ink transition-colors border border-separator/40"
            : "fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-surface text-ink flex items-center justify-center shadow-float border border-separator/40"
        }
      >
        {pill ? (
          <>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            <span>Backup and export</span>
          </>
        ) : (
          <>
            <FileJson size={inline ? 14 : 18} strokeWidth={2} className="text-ink-2" />
            {inline && <span>Export Data</span>}
          </>
        )}
      </motion.button>

      <Sheet open={open} onClose={close} label="Backup and export" className="sn-sheet">
        <div className="sn-sheet-head">
          <div>
            <h2>Backup and export</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">Read from the cloud, so it&apos;s everything, not just this device.</p>
          </div>
          <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={close} disabled={!!busy}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="sn-sheet-body">
          <section className="sn-backup-row" aria-labelledby="sn-backup-all">
            <div>
              <h3 id="sn-backup-all">Full backup</h3>
              <p>Every day, journal entry, habit, goal, money record and setting, as one JSON file.</p>
            </div>
            <button type="button" className="sn-btn sn-btn-primary" onClick={downloadBackup} disabled={!!busy} aria-busy={busy === "backup" || undefined}>
              <Download size={17} strokeWidth={2} aria-hidden="true" />
              {busy === "backup" ? "Reading…" : "Download"}
            </button>
          </section>

          <section className="sn-backup-row is-stacked" aria-labelledby="sn-backup-ai">
            <div>
              <h3 id="sn-backup-ai">For an AI</h3>
              <p>Your logged days with a summary, to paste into a chat and ask about patterns.</p>
            </div>
            <div className="sn-backup-controls">
              <div className="sn-seg" role="group" aria-label="Days">
                {RANGES.map((n) => (
                  <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>
                    {n === 365 ? "Year" : `${n}d`}
                  </button>
                ))}
              </div>
              <div className="sn-seg" role="group" aria-label="Format">
                <button type="button" aria-pressed={format === "json"} onClick={() => setFormat("json")}>JSON</button>
                <button type="button" aria-pressed={format === "prompt"} onClick={() => setFormat("prompt")}>Prompt</button>
              </div>
              <button type="button" className="sn-btn sn-btn-outline" onClick={downloadForAI} disabled={!!busy} aria-busy={busy === "ai" || undefined}>
                <Download size={17} strokeWidth={2} aria-hidden="true" />
                {busy === "ai" ? "Reading…" : "Export"}
              </button>
            </div>
          </section>

          <section className="sn-backup-row is-stacked" aria-labelledby="sn-backup-restore">
            <div>
              <h3 id="sn-backup-restore">Restore</h3>
              <p>Merges a backup into your account. Matching records are replaced with the backup&apos;s; nothing is deleted.</p>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={chooseFile} tabIndex={-1} aria-hidden="true" />
            {pending ? (
              <div className="sn-backup-confirm" role="group" aria-label="Confirm restore">
                <p>
                  <strong>{pending.name}</strong>
                  <span>
                    <Num value={pending.counts.daily_logs} /> days, <Num value={pending.counts.global_data} /> record collections,{" "}
                    <Num value={pending.counts.preferences} /> settings · saved{" "}
                    {new Date(pending.backup.exportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button type="button" className="sn-btn sn-btn-outline" onClick={() => setPending(null)} disabled={!!busy}>
                    Cancel
                  </button>
                  <button type="button" className="sn-btn sn-btn-primary" onClick={confirmRestore} disabled={!!busy} aria-busy={busy === "restore" || undefined}>
                    <RotateCcw size={17} strokeWidth={2} aria-hidden="true" />
                    {busy === "restore" ? "Restoring…" : "Restore"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="sn-btn sn-btn-outline self-start" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                <Upload size={17} strokeWidth={2} aria-hidden="true" />
                Choose a backup file
              </button>
            )}
          </section>

          <p className={`sn-backup-status ${status ? `is-${status.tone}` : ""}`} role="status" aria-live="polite">
            {status?.text || ""}
          </p>
        </div>
      </Sheet>
    </>
  );
}
