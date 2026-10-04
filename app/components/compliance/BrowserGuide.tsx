"use client";

import { Check, Compass, Copy, Fire, Globe } from "@phosphor-icons/react";
import { useState } from "react";
import { copy } from "../menu/actions";
import { haptic } from "../../lib/haptics";

interface BrowserItem {
  name: string;
  category: string;
  icon: typeof Globe;
  steps: string[];
}

const BROWSERS: BrowserItem[] = [
  {
    name: "Chrome / Brave / Edge",
    category: "Chromium Engine",
    icon: Globe,
    steps: ["Settings", "Privacy and Security", "Clear browsing data", "Cookies and other site data"],
  },
  {
    name: "Safari",
    category: "WebKit (macOS & iOS)",
    icon: Compass,
    steps: ["Settings", "Safari", "Advanced", "Website Data", "Remove All Website Data"],
  },
  {
    name: "Firefox",
    category: "Gecko Engine",
    icon: Fire,
    steps: ["Settings", "Privacy & Security", "Cookies and Site Data", "Clear Data"],
  },
];

export default function BrowserGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (browser: BrowserItem, index: number) => {
    haptic();
    const path = browser.steps.join(" → ");
    void copy(path, `${browser.name} path copied`, {
      description: path,
    });
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="browser-guide not-prose my-8 grid grid-cols-1 gap-3.5 sm:grid-cols-1">
      {BROWSERS.map((b, i) => {
        const Icon = b.icon;
        const isCopied = copiedIndex === i;

        return (
          <div
            key={b.name}
            data-clickable=""
            onClick={() => handleCopy(b, i)}
            className="group relative flex flex-col justify-between gap-3.5 rounded-xl border border-[color:var(--line)] bg-[color:var(--paper-sunk)] p-4 transition-all duration-200 hover:border-[color:var(--line-strong)] hover:bg-[color:var(--wash)] active:scale-[0.99] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--fg)] shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <Icon size={18} weight="duotone" />
                </div>
                <div>
                  <h4 className="m-0 text-sm font-semibold tracking-tight text-[color:var(--fg)]">
                    {b.name}
                  </h4>
                  <p className="m-0 text-[11px] text-[color:var(--fg-3)]">
                    {b.category}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={`Copy ${b.name} clearing steps`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(b, i);
                }}
                className="flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--line)] bg-[color:var(--paper)] px-2 text-[11px] font-medium text-[color:var(--fg-2)] transition-colors hover:border-[color:var(--line-strong)] hover:text-[color:var(--fg)] active:scale-95"
              >
                {isCopied ? (
                  <>
                    <Check size={13} className="text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy path</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {b.steps.map((step, idx) => (
                <span key={step} className="inline-flex items-center gap-1.5">
                  <span className="keycap inline-flex items-center rounded-md border border-[color:var(--line)] bg-[color:var(--paper)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--fg)] shadow-2xs transition-colors group-hover:border-[color:var(--line-strong)]">
                    {step}
                  </span>
                  {idx < b.steps.length - 1 && (
                    <span className="select-none text-[11px] text-[color:var(--fg-3)]" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
