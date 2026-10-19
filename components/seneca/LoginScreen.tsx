// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import { authService } from "@/lib/seneca/services/authService";
import { AlertCircle, Lock, Google, ShieldCheck, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { FADE } from "@/lib/seneca/constants/motion";

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: (user?: any) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const haptic = useWebHaptics();

  const handleGoogleLogin = async () => {
    haptic?.trigger?.("medium");
    setLoading(true);
    setError(null);
    try {
      const user = await authService.loginWithGoogle();
      haptic?.trigger?.("success");
      if (onLoginSuccess) {
        onLoginSuccess(user);
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
      haptic?.trigger?.("error");
      setError(err?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalMode = () => {
    haptic?.trigger?.("light");
    if (typeof window !== "undefined") {
      localStorage.setItem("seneca_local_session", "true");
    }
    const mockUser = {
      email: "admin@nazarene.dev",
      displayName: "Admin User",
      uid: "local-admin",
    };
    onLoginSuccess?.(mockUser);
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-12 px-4 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-surface border border-separator/60 rounded-2xl p-8 shadow-card"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center">
            <Lock size={28} className="text-accent" strokeWidth={2.2} />
          </div>
        </div>

        <h2 className="text-title-2 font-semibold text-ink tracking-tight mb-2">Seneca Telemetry</h2>
        <p className="text-subhead text-ink-2 mb-6 leading-relaxed">
          Stoic habit tracker, protocol logging, wealth telemetry, and reflection journal.
        </p>

        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={FADE}
            className="mb-6 p-3.5 bg-negative/10 border border-negative/20 rounded-xl text-negative text-subhead font-medium text-left flex items-start gap-2.5"
          >
            <AlertCircle size={18} strokeWidth={2} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-xs leading-normal">{error}</span>
          </motion.div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-ink text-white dark:bg-white dark:text-ink font-medium text-callout rounded-xl active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>Connect with Google (Cloud Sync)</span>
              </>
            )}
          </button>

          {/* Local mode skips sign-in, so it exists only in development. */}
          {process.env.NODE_ENV !== "production" ? (
          <button
            type="button"
            onClick={handleLocalMode}
            className="w-full py-3 px-4 bg-fill hover:bg-fill-strong text-ink font-medium text-callout rounded-xl active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2.5 border border-separator/40"
          >
            <UserCheck size={18} aria-hidden="true" />
            <span>Continue in Local Mode (Offline Storage)</span>
          </button>
          ) : null}
        </div>

        <div className="mt-6 pt-5 border-t border-separator/40 flex items-center justify-center gap-3 text-caption text-ink-3">
          <span>Signed-in owner only</span>
          <span>•</span>
          <span>Not sent to analytics</span>
        </div>
      </motion.div>
    </div>
  );
}
