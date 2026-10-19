// @ts-nocheck
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useWebHaptics } from "web-haptics/react";
import { ROUTE_POPPED, ROUTE_PUSHED } from "@/app/admin/ui/shell-nav";
import JournalDocument from "@/components/seneca/journal/JournalDocument";
import JournalList from "@/components/seneca/journal/JournalList";
import PageHeader from "@/components/seneca/PageHeader";
import SenecaPortal from "@/components/seneca/SenecaPortal";
import { useNavigate } from "@/lib/seneca/context/SenecaNavContext";
import { useJournalEntries } from "@/lib/seneca/data/syncedData";
import { updateGlobalData, updateTodayLog } from "@/lib/seneca/services/dataLogger";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { playSound } from "@/app/components/ui/sound";

const EASE_OUT = [0.23, 1, 0.32, 1];
const POSITIVE = ["😊", "🌟", "🔥", "💡", "☀️", "🎯", "🌱"];
const CHALLENGE = ["💭", "🌙", "🌊"];

/** ?entry=<id> or ?entry=new — the open entry is a place, so Back closes it. */
const readEntryParam = () => (typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("entry"));
function writeEntryParam(value, { replace = false } = {}) {
  const url = new URL(window.location.href);
  if ((url.searchParams.get("entry") ?? null) === (value ?? null)) return;
  if (value) url.searchParams.set("entry", String(value));
  else url.searchParams.delete("entry");
  if (value !== "new") url.searchParams.delete("entryDate");
  const next = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
  if (replace) window.history.replaceState(window.history.state, "", next);
  else window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(ROUTE_PUSHED));
}

/** "Journal logged" — the moment after saving, now in Seneca's language. */
function LoggedDialog({ open, onProtocol, onRead }) {
  const reduce = useReducedMotion();
  return (
    <SenecaPortal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="sn-scrim fixed inset-0 z-[400]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onRead} />
            <div className="fixed inset-0 z-[401] grid place-items-center px-6" style={{ pointerEvents: "none" }}>
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sn-logged"
                className="sn-logged"
                style={{ pointerEvents: "auto" }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              >
                <motion.span
                  className="sn-logged-mark"
                  initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", duration: 0.5, bounce: 0.3 }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <motion.path d="M5 13l4 4L19 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.3, ease: EASE_OUT }} />
                  </svg>
                </motion.span>
                <h2 id="sn-logged">Journal logged</h2>
                <p>Your reflection is saved.</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button type="button" className="sn-btn sn-btn-primary sn-btn-block" data-sound="pop" onClick={onProtocol}>
                    Back to Protocol
                  </button>
                  <button type="button" className="sn-btn sn-btn-outline sn-btn-block" onClick={onRead}>
                    Read the entry
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </SenecaPortal>
  );
}

/**
 * Journal, laid out like Writing: the list of entries (filters, table,
 * rail), and each entry as a full page. Entries sync across devices via
 * global_data/journal.entries; version history stays on this device for the
 * session — uploading every revision would push the doc toward Firestore's
 * 1 MiB limit.
 */
export default function Journal() {
  const navigate = useNavigate();
  const haptic = useWebHaptics();
  const reduce = useReducedMotion();
  const [entries, storeEntries] = useJournalEntries();
  const sync = useJournalEntries.useStatus();
  const setEntries = useCallback(
    (update) => storeEntries((prev) => (typeof update === "function" ? update(prev) : update).map(({ history, ...e }) => e)),
    [storeEntries],
  );
  const [histories, setHistories] = useState({}); // id → versions, this session only
  const [open, setOpen] = useState(() => readEntryParam()); // "new" | id | null
  const [logged, setLogged] = useState(null);

  // Back/Forward open and close entries
  useEffect(() => {
    const follow = () => setOpen(readEntryParam());
    window.addEventListener(ROUTE_POPPED, follow);
    return () => window.removeEventListener(ROUTE_POPPED, follow);
  }, []);

  const go = useCallback((value, opts) => {
    setOpen(value);
    writeEntryParam(value, opts);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Derived summaries for the daily log (dataLogger diffs; unchanged writes nothing)
  useEffect(() => {
    const today = getPhDateKey();
    const todays = entries.filter((e) => e.isoDate === today);
    updateGlobalData("journal", { total_entries: entries.length });
    updateTodayLog("journal", {
      entries_today: todays.length,
      mood: todays[0]?.mood ?? null,
      highlights: todays.filter((e) => POSITIVE.includes(e.mood)).map((e) => e.title),
      challenges: todays.filter((e) => CHALLENGE.includes(e.mood)).map((e) => e.title),
      total_entries_all_time: entries.length,
    });
  }, [entries]);

  const current = open && open !== "new" ? entries.find((e) => String(e.id) === String(open)) : null;

  const create = (entry) => {
    setEntries((prev) => [entry, ...prev]);
    haptic.trigger("success");
    setLogged(entry.id);
    playSound("success");
    // The saved entry takes the place of "new" in history: Back returns to the list
    go(String(entry.id), { replace: true });
  };

  const update = (entry, versions) => {
    setHistories((h) => ({ ...h, [entry.id]: versions }));
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
  };

  const remove = (ids) => {
    const gone = new Set(ids.map(String));
    haptic.trigger("warning");
    setEntries((prev) => prev.filter((e) => !gone.has(String(e.id))));
    if (open && gone.has(String(open))) go(null);
  };

  return (
    <div className="w-full pb-8">
      {!open && (
        <PageHeader title="Journal" subtitle="Daily stoic reflection, evening review, and personal chronicle." />
      )}

      {/* popLayout, not wait: the next page mounts at once, so a title typed
          the moment "New entry" is pressed lands in the page that keeps it */}
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div
            key={`doc-${open}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {open !== "new" && !current ? (
              <div className="sn-doc-missing">
                <p>This entry isn&apos;t here any more.</p>
                <button type="button" className="sn-btn sn-btn-outline" onClick={() => go(null)}>
                  All entries
                </button>
              </div>
            ) : (
              <JournalDocument
                entry={current}
                initialDate={new URL(window.location.href).searchParams.get("entryDate")}
                history={current ? histories[current.id] || [] : []}
                onCreate={create}
                onUpdate={update}
                onDelete={(id) => remove([id])}
                onClose={() => go(null)}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <JournalList
              entries={entries}
              sync={sync}
              onOpen={(id) => go(String(id))}
              onNew={() => go("new")}
              onDelete={remove}
              onBackToProtocol={() => navigate("/protocol")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LoggedDialog
        open={!!logged}
        onRead={() => setLogged(null)}
        onProtocol={() => {
          setLogged(null);
          writeEntryParam(null);
          setOpen(null);
          navigate("/protocol");
        }}
      />
    </div>
  );
}
