"use client";

import { useState, type ReactNode } from "react";
import { Copy, Check, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo/components/button";
import { Switch } from "../../components/kit/switch";
import { toast } from "../../lib/toast";
import { playSound } from "../../components/ui/sound";

export function RailCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`cc-rail-card ${className}`}>
      {title && (
        <div className="cc-rail-header">
          <h3 className="cc-rail-title">{title}</h3>
          {action && <div className="cc-rail-header-action">{action}</div>}
        </div>
      )}
      <div className="cc-rail-body">{children}</div>
    </div>
  );
}

export function RailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="cc-rail-row">
      <span className="cc-rail-label">{label}</span>
      {value !== undefined && <span className="cc-rail-value">{value}</span>}
      {children}
    </div>
  );
}

export function RailStatusDot({
  status = "active",
  label = "Active",
}: {
  status?: "active" | "warning" | "inactive";
  label?: string;
}) {
  return (
    <span className={`cc-rail-status-pill cc-rail-status-${status}`}>
      <span className="cc-rail-status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function RailSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="cc-rail-switch-row">
      <div className="cc-rail-switch-meta">
        <span className="cc-rail-switch-label">{label}</span>
        {description && <p className="cc-rail-switch-desc">{description}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(val) => {
          playSound("select");
          onCheckedChange(val);
        }}
        aria-label={label}
      />
    </div>
  );
}

export function RailCodeRow({
  label,
  code,
}: {
  label: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      playSound("copy");
      toast.add({
        type: "success",
        title: "Copied to clipboard",
        description: code,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Failed to copy",
      });
    }
  };

  return (
    <div className="cc-rail-code-row">
      <span className="cc-rail-code-label">{label}</span>
      <div className="cc-rail-code-box">
        <code className="cc-rail-code-snippet">{code}</code>
        <button
          type="button"
          onClick={copy}
          className="cc-rail-code-copy-btn"
          title={`Copy ${label}`}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check size={13} weight="bold" className="text-emerald-500" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>
    </div>
  );
}

export function RailProgressRow({
  label,
  current,
  total,
  unit = "",
}: {
  label: string;
  current: number;
  total: number;
  unit?: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="cc-rail-progress-row">
      <div className="cc-rail-progress-meta">
        <span className="cc-rail-progress-label">{label}</span>
        <span className="cc-rail-progress-ratio">
          <strong>{current}</strong>
          {total > 0 ? ` / ${total}` : ""}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="cc-rail-progress-track">
        <div
          className="cc-rail-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function RailLinkRow({
  label,
  href,
  value,
}: {
  label: string;
  href: string;
  value?: string;
}) {
  return (
    <div className="cc-rail-row">
      <span className="cc-rail-label">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="cc-rail-link"
      >
        <span>{value ?? href.replace(/^https?:\/\//, "")}</span>
        <ArrowSquareOut size={13} aria-hidden="true" />
      </a>
    </div>
  );
}
