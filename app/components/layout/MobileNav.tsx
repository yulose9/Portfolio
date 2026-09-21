"use client";

import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { useHaptics } from "@/app/hooks/use-haptics";
import { scrollToSection } from "@/app/utils/navigation";
import { Briefcase, Code, Home, Mail, User } from "lucide-react";
import { useRef, useState } from "react";

const navigationItems = [
  { section: "home", label: "Home", icon: Home },
  { section: "portfolio", label: "Portfolio", icon: Briefcase },
  { section: "work", label: "Experience", icon: Code },
  { section: "about-mobile", label: "About", icon: User },
];

export default function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const haptic = useHaptics();
  const [activeSection, setActiveSection] = useState("home");
  const destination = useRef<string | null>(null);
  const navigate = (section: string) => {
    haptic("selection");
    setActiveSection(section);
    destination.current = section;
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { haptic("light"); onClose(); } }}>
      <DialogContent
        id="mobile-navigation"
        aria-describedby={undefined}
        data-lenis-prevent
        className="mobile-navigation bg-[#374136] text-white border-white/15 w-[calc(100%-1.5rem)] max-w-md max-h-[calc(100svh-1.5rem)] overflow-y-auto rounded-3xl p-6 pt-10"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const section = destination.current;
          destination.current = null;
          requestAnimationFrame(() => {
            document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus({ preventScroll: true });
            if (section) scrollToSection(section);
          });
        }}
      >
        <DialogTitle className="text-2xl">John Nazarene</DialogTitle>
        <p className="text-sm text-white/75">Developer · Cloud Engineer</p>
        <nav aria-label="Mobile navigation" className="space-y-2 my-4">
          {navigationItems.map(({ section, label, icon: Icon }) => (
            <button key={section} onClick={() => navigate(section)} aria-current={activeSection === section ? "location" : undefined}
              className={`pressable w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left font-semibold transition-colors duration-150 ${activeSection === section ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10"}`}>
              <Icon size={22} strokeWidth={2} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
        <button onClick={() => navigate("contact")} className="pressable flex items-center justify-center gap-3 rounded-2xl bg-[#dfffd9] text-[#243621] p-4 font-semibold">
          <Mail size={20} aria-hidden="true" />Get in touch
        </button>
        <p className="text-center text-sm text-white/70 mt-3">Located in the Philippines</p>
      </DialogContent>
    </Dialog>
  );
}
