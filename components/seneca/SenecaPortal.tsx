"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { senecaFont } from "./font";

/**
 * Renders overlays (sheets, dialogs) at the end of <body>, still wearing
 * Seneca's tokens and font. A fixed-position overlay inside the app would be
 * trapped by any ancestor with a transform or filter (the entrance and tab
 * animations use both) and show up as a hard-edged box over one card.
 */
export default function SenecaPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<div className={`seneca-root sn-portal ${senecaFont.variable}`}>{children}</div>, document.body);
}

/** The shared scrim: a warm dim with a soft vignette, not a flat grey sheet. */
export const SCRIM_CLASS = "sn-scrim fixed inset-0";
