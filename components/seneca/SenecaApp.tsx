// @ts-nocheck
"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, getEnv } from "@/lib/seneca/services/firebase";
import { preparePrivateSession } from "@/lib/seneca/services/dataLogger";
import { rememberAccount } from "@/lib/seneca/services/rememberedAccount";
import { EASE_OUT, FADE_EXIT } from "@/lib/seneca/constants/motion";
import { senecaFont } from "./font";
import { useHoverSounds } from "./useHoverSounds";
import PhaseCelebration from "./PhaseCelebration";

import { SenecaNavProvider, useSenecaNav, type SenecaTab } from "@/lib/seneca/context/SenecaNavContext";
import { PreferencesProvider } from "@/lib/seneca/context/PreferencesContext";
import { ProtocolProvider } from "@/lib/seneca/context/ProtocolContext";
import { StudyGoalProvider } from "@/lib/seneca/context/StudyGoalContext";
import { PersonalGoalsProvider } from "@/lib/seneca/context/PersonalGoalsContext";

import LoginScreen from "./LoginScreen";
import DailyTasksReminder from "./DailyTasksReminder";
import ObligationReminder, { useObligationReminder } from "./ObligationReminder";

import HomeView from "./views/HomeView";
import ProtocolView from "./views/ProtocolView";
import GrowthView from "./views/GrowthView";
import WealthView from "./views/WealthView";
import JournalView from "./views/JournalView";

// The owner allow-list (Firebase rules are the real guard).
const ALLOWED_EMAIL = getEnv("ALLOWED_EMAIL");

export default function SenecaApp({
  initialTab = "home",
  activeTab,
  onTabChange,
  embedded = false,
}: {
  initialTab?: SenecaTab;
  activeTab?: SenecaTab;
  onTabChange?: (tab: SenecaTab) => void;
  embedded?: boolean;
}) {
  const [user, setUser] = useState<User | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Local mode (no sign-in) is a development convenience only.
    const isLocal = process.env.NODE_ENV !== "production" && localStorage.getItem("seneca_local_session") === "true";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try { preparePrivateSession(currentUser?.uid || null); setSessionError(false); }
      catch { setSessionError(true); setLoading(false); setUser(null); return; }
      // The rules are the real guard; this keeps a stale session of another
      // account from opening the workspace.
      if (currentUser && ALLOWED_EMAIL && currentUser.email !== ALLOWED_EMAIL) {
        void auth.signOut();
        setUser(null);
      } else if (currentUser) {
        rememberAccount(currentUser);
        setUser(currentUser);
      } else if (isLocal) {
        setUser({ email: "admin@nazarene.dev", displayName: "Admin" });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // The screens before sign-in sit in the same root as the app, so they get
  // Seneca's tokens and type (they live on .seneca-root).
  const preSession = (children: React.ReactNode) => (
    <div className={`seneca-root ${senecaFont.variable} font-sans antialiased text-ink relative w-full`}>{children}</div>
  );

  if (loading) {
    return preSession(
      <div className="w-full h-full min-h-[500px] flex items-center justify-center" role="status" aria-label="Loading Seneca">
        <div className="w-8 h-8 border-4 border-separator border-t-accent rounded-full animate-spin" />
      </div>,
    );
  }

  if (!user) {
    if (sessionError)
      return preSession(
        <div role="alert" className="sn-card p-6 max-w-md mx-auto my-12">
          This browser could not separate your saved account data. Free some browser storage and reload before continuing.
        </div>,
      );
    return preSession(
      <LoginScreen
        onLoginSuccess={(authed) => {
          setUser(authed || auth?.currentUser || null);
        }}
      />,
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <SenecaNavProvider key={user.uid || "local"} initialTab={initialTab} activeTab={activeTab} onTabChange={onTabChange}>
        <PreferencesProvider>
          <ProtocolProvider>
            <StudyGoalProvider>
              <PersonalGoalsProvider>
                <AppShell embedded={embedded} />
              </PersonalGoalsProvider>
            </StudyGoalProvider>
          </ProtocolProvider>
        </PreferencesProvider>
      </SenecaNavProvider>
    </MotionConfig>
  );
}

function AppShell({ embedded }: { embedded?: boolean }) {
  const { tab } = useSenecaNav();
  const rootRef = useRef<HTMLDivElement>(null);
  useHoverSounds(rootRef);
  const { showReminder, closeReminder, showTasksReminder, closeTasksReminder } =
    useObligationReminder();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div ref={rootRef} className={`seneca-root ${senecaFont.variable} font-sans antialiased text-ink selection:bg-accent/20 ${embedded ? "embedded-shell" : "desktop-shell"} relative w-full`}>
      <AnimatePresence initial={false}>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -4, transition: FADE_EXIT }}
            className="absolute top-0 inset-x-0 z-[999] bg-orange-500/90 text-white text-footnote font-medium py-1.5 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <span>You are offline. Cloud money changes need a connection; other edits stay on this device until sync resumes.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={embedded ? "embedded-app-frame" : "desktop-app-frame w-full"}>
        <AnimatePresence mode="wait" initial={false}>
          {tab === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeView />
            </motion.div>
          )}
          {tab === "protocol" && (
            <motion.div key="protocol" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProtocolView />
            </motion.div>
          )}
          {tab === "growth" && (
            <motion.div key="growth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GrowthView />
            </motion.div>
          )}
          {tab === "wealth" && (
            <motion.div key="wealth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WealthView />
            </motion.div>
          )}
          {tab === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <JournalView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PhaseCelebration />
      <ObligationReminder isOpen={showReminder} onClose={closeReminder} />
      <DailyTasksReminder isOpen={showTasksReminder} onClose={closeTasksReminder} />
    </div>
  );
}
