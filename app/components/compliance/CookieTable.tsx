"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { copy } from "../menu/actions";
import { haptic } from "../../lib/haptics";

interface CookieItem {
  key: string;
  type: string;
  lifespan: string;
  category: "Strictly Necessary" | "Functional" | "Functional Preference";
  description: string;
}

const COOKIE_DATA: CookieItem[] = [
  {
    key: "poll_<id>",
    type: "HTTP Cookie (HttpOnly, Secure, SameSite=Lax)",
    lifespan: "1 year",
    category: "Strictly Necessary",
    description: "Set only when you choose to cast a ballot in an article choice poll. Prevents duplicate votes and verifies your vote hash at the edge.",
  },
  {
    key: "poll-voter",
    type: "Local Storage",
    lifespan: "Persistent",
    category: "Functional",
    description: "Stores a random 20-character pseudonym generated on your client device, enabling you to inspect or retract your vote later.",
  },
  {
    key: "portfolio:analytics-opt-out",
    type: "Local Storage",
    lifespan: "Persistent",
    category: "Functional Preference",
    description: "Remembers whether you clicked the “Opt out of analytics” button, preventing any future metric dispatch.",
  },
  {
    key: "data-theme",
    type: "Local Storage",
    lifespan: "Persistent",
    category: "Functional Preference",
    description: "Saves your chosen interface theme (light or dark) to eliminate screen flash on subsequent visits.",
  },
  {
    key: "portfolio:sound",
    type: "Local Storage",
    lifespan: "Persistent",
    category: "Functional Preference",
    description: "Remembers whether you toggled the sound effects audio toggle on or off.",
  },
];

export default function CookieTable() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (item: CookieItem) => {
    haptic();
    void copy(item.key, "Cookie key copied", {
      description: `${item.key}: ${item.description}`,
    });
    setCopiedKey(item.key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="table-scroll my-6 overflow-x-auto rounded-xl border border-[color:var(--line)] bg-[color:var(--paper-sunk)] p-1 shadow-xs">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--line-strong)] text-[color:var(--fg)]">
            <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-[color:var(--fg-2)]">
              Key / Cookie Name
            </th>
            <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-[color:var(--fg-2)]">
              Type
            </th>
            <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-[color:var(--fg-2)]">
              Lifespan
            </th>
            <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-[color:var(--fg-2)]">
              Purpose &amp; Necessity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)] text-[color:var(--fg-2)]">
          {COOKIE_DATA.map((item) => {
            const isCopied = copiedKey === item.key;
            return (
              <tr
                key={item.key}
                data-clickable=""
                onClick={() => handleCopy(item)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-[color:var(--wash)]"
                title="Click to copy cookie name, right-click for full row details"
              >
                <td className="py-3 px-3.5 font-mono text-xs whitespace-nowrap text-[color:var(--fg)]">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--line)] bg-[color:var(--paper)] px-2 py-0.5 shadow-2xs group-hover:border-[color:var(--line-strong)]">
                    <span>{item.key}</span>
                    {isCopied ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} className="opacity-40 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-3.5 text-xs whitespace-nowrap">
                  {item.type}
                </td>
                <td className="py-3 px-3.5 text-xs whitespace-nowrap font-mono text-[color:var(--fg-3)]">
                  {item.lifespan}
                </td>
                <td className="py-3 px-3.5 text-xs leading-relaxed">
                  <span
                    className={`inline-block mr-1.5 font-semibold ${
                      item.category === "Strictly Necessary"
                        ? "text-[color:var(--fg)]"
                        : "text-[color:var(--fg-2)]"
                    }`}
                  >
                    {item.category}.
                  </span>
                  {item.description}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
