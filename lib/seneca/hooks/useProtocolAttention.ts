"use client";
import { useEffect, useState } from "react";
import { protocolAttention } from "../utils/protocolDay";

export function useProtocolAttention(category: string, date: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return protocolAttention(category, date, now);
}
