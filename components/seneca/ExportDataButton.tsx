// @ts-nocheck
"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileJson } from "lucide-react";
import React, { useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  exportAsLLMPrompt,
  exportForLLM,
  getLastNDaysLogs,
} from "@/lib/seneca/services/dataLogger";
import { DIALOG_SPRING, FADE, TAP, TAP_TRANSITION } from "@/lib/seneca/constants/motion";
import SenecaPortal, { SCRIM_CLASS } from "./SenecaPortal";
import Num from "./Num";

/**
 * Export Data Component
 * Allows you to view and export your data for LLM analysis
 */
export default function ExportDataButton({ inline = true, pill = false }: { inline?: boolean; pill?: boolean }) {
  const haptic = useWebHaptics();
  const [showModal, setShowModal] = useState(false);
  const [exportType, setExportType] = useState("json");
  const [days, setDays] = useState(30);

  const handleExport = () => {
    let data;
    let filename;
    let content;

    if (exportType === "json") {
      data = exportForLLM(days);
      filename = `seneca-data-${days}days.json`;
      content = JSON.stringify(data, null, 2);
    } else {
      data = exportAsLLMPrompt(days);
      filename = `seneca-prompt-${days}days.txt`;
      content = data;
    }

    // Create download
    const blob = new Blob([content], {
      type: exportType === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // Revoking synchronously can cancel the download in Safari/Firefox
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    haptic.trigger("success");
    setShowModal(false);
  };

  const logs = getLastNDaysLogs(7);
  const avgCompletion = logs.length
    ? Math.round(
        (logs.reduce(
          (sum, log) => sum + (log.protocol?.completion_rate || 0),
          0,
        ) /
          logs.length) *
          100,
      )
    : 0;

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={TAP_TRANSITION}
        aria-label="Export data"
        onClick={() => {
          haptic.trigger("medium");
          setShowModal(true);
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
            <span>Export data</span>
          </>
        ) : (
          <>
            <FileJson size={inline ? 14 : 18} strokeWidth={2} className="text-ink-2" />
            {inline && <span>Export Data</span>}
          </>
        )}
      </motion.button>

      {/* Modal */}
      <SenecaPortal>
      <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onClick={() => setShowModal(false)}
            className={SCRIM_CLASS}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0, transition: FADE }}
            transition={DIALOG_SPRING}
            role="dialog"
            aria-modal="true"
            className="relative bg-surface rounded-[28px] p-6 max-w-md w-full shadow-float"
          >
            <h2 className="text-[24px] leading-[30px] font-[700] tracking-[-0.03em] text-ink mb-2">
              Export your data
            </h2>
            <p className="text-subhead text-ink-2 mb-6">
              Download your habit data in a format optimized for AI analysis.
            </p>

            {/* Stats Preview */}
            <div className="sn-card-well p-4 mb-6">
              <p className="text-footnote text-ink-2 mb-2">
                Last 7 Days Summary
              </p>
              <div className="flex justify-between">
                <div>
                  <p className="text-title-2 font-bold text-ink">
                    <Num value={logs.length} />
                  </p>
                  <p className="text-footnote text-ink-2">Days Tracked</p>
                </div>
                <div>
                  <p className="text-title-2 font-bold text-accent">
                    <Num value={avgCompletion} suffix="%" />
                  </p>
                  <p className="text-footnote text-ink-2">Avg Completion</p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
              {/* Days Selector */}
              <div>
                <label className="text-footnote font-semibold text-ink-2 mb-2 block">
                  Time range
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-fill rounded-2xl text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--sn-apricot)]"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {/* Format Selector */}
              <div>
                <label className="text-footnote font-semibold text-ink-2 mb-2 block">
                  Export format
                </label>
                <div className="sn-seg w-full" role="group" aria-label="Export format">
                  <button
                    type="button"
                    onClick={() => setExportType("json")}
                    aria-pressed={exportType === "json"}
                    className="flex-1"
                    style={{ minHeight: 38, fontSize: 14 }}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportType("prompt")}
                    aria-pressed={exportType === "prompt"}
                    className="flex-1"
                    style={{ minHeight: 38, fontSize: 14 }}
                  >
                    LLM Prompt
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="sn-btn sn-btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                data-sound="pop"
                className="sn-btn sn-btn-primary flex-1"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
      </SenecaPortal>
    </>
  );
}
