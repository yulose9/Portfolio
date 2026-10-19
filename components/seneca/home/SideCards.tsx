// @ts-nocheck
"use client";
import React from "react";
import { PenLine } from "lucide-react";
import { formatPeso, SectionHead } from "./parts";

/** The reference's "Connect Spotify" card: one centred prompt, one dark action. */
export function JournalPrompt({ greeting, hasJournalToday, onWrite, onOpenJournal }) {
  return (
    <>
    <SectionHead id="sn-journal-head" title="Journal" onMore={onOpenJournal} moreLabel="All entries" />
    <section className="sn-card-well sn-fill flex flex-col items-center justify-center px-6 pb-6 pt-7 text-center" aria-labelledby="sn-journal">
      <span className="sn-journal-mark" aria-hidden="true">
        {hasJournalToday ? "✓" : "✍️"}
      </span>
      <h2 id="sn-journal" className="mt-4 text-[22px] leading-[27px] font-[650] tracking-[-0.025em] text-ink text-balance">
        {greeting.title.replace(" ✓", "")}
      </h2>
      <p className="mt-2 max-w-[30ch] text-[14px] leading-[20px] text-ink-2 text-pretty">{greeting.message}</p>
      <button type="button" className="sn-btn sn-btn-dark sn-btn-block mt-5" onClick={onWrite}>
        <PenLine size={16} strokeWidth={2} aria-hidden="true" />
        {greeting.buttonText}
      </button>
    </section>
    </>
  );
}

/** Coral card with ripple rings: the one payment that should go out first. */
export function PriorityPayment({ liability, onOpen }) {
  return (
    <button type="button" className="sn-coral sn-press" onClick={onOpen} aria-label={liability ? `Priority payment: ${liability.name}, ${formatPeso(liability.amount)}` : "No priority payment"}>
      <svg className="sn-ripples" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[30, 58, 86, 114, 142].map((r) => (
          <circle key={r} cx="30" cy="130" r={r} />
        ))}
      </svg>
      <span className="relative text-[13px] font-[600] opacity-95">Priority payment</span>
      <span className="relative mt-1 text-[28px] leading-[32px] font-[700] tracking-[-0.03em] tabular-nums">
        {liability ? formatPeso(liability.amount) : "All clear"}
      </span>
      <span className="sn-coral-chip relative mt-3">{liability?.name || "Nothing flagged as priority"}</span>
    </button>
  );
}
