import type { ReactNode } from "react";

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

const DEFAULT_ICONS: Record<CalloutType, string> = {
  note: "ℹ️",
  tip: "💡",
  important: "🛡️",
  warning: "⚠️",
  caution: "🚨",
};

export default function Callout({
  type = "note",
  icon,
  children,
}: {
  type?: CalloutType;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="callout my-6" data-callout="" data-type={type}>
      <span className="callout-icon select-none" aria-hidden="true">
        {icon ?? DEFAULT_ICONS[type]}
      </span>
      <div className="callout-body leading-relaxed text-sm text-[color:var(--fg-2)]">
        {children}
      </div>
    </aside>
  );
}
