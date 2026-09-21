"use client";

import { ArrowDown } from "lucide-react";

export default function ScrollPrompt({ isVisible, onClick }: { isVisible: boolean; onClick: () => void }) {
  if (!isVisible) return null;
  return <button onClick={onClick} aria-label="Scroll to portfolio" className="pressable absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-full bg-[#374136] px-5 py-3 text-white shadow-lg"><span className="hidden md:inline text-sm font-medium">Scroll to discover</span><ArrowDown size={20} aria-hidden="true" /></button>;
}
