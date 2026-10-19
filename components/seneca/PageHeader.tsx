// @ts-nocheck
"use client";
import React from "react";
import clsx from "clsx";
import { formatTodayLabel } from "@/lib/seneca/utils/timeUtils";

/**
 * Section opener for the Seneca tabs, in Home's type: a bold, tightly
 * tracked title with the day beside it, and the view's actions on the right.
 */
export default function PageHeader({ title, subtitle, action, trailing, className }) {
  return (
    <header className={clsx("flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-1 mb-7", className)}>
      <div className="flex min-w-0 flex-col">
        <p className="text-[13px] font-[500] text-ink-2 tabular-nums">{formatTodayLabel()}</p>
        <h2 className="mt-0.5 text-[32px] leading-[36px] font-[700] tracking-[-0.035em] text-ink">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-[60ch] text-[14px] text-ink-2">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {action}
        {trailing}
      </div>
    </header>
  );
}
