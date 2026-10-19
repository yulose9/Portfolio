// @ts-nocheck
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { BookOpenText, Flame, LockSimple, Wallet, WarningCircle, UserCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { authService } from "@/lib/seneca/services/authService";
import { authProblem, type AuthProblem } from "@/lib/seneca/services/authErrors";
import { firebaseConfigured } from "@/lib/seneca/services/firebase";
import { forgetAccount, rememberedAccount, type RememberedAccount } from "@/lib/seneca/services/rememberedAccount";

/*
 * The door to Seneca, in Home's language: the Seneca mark, a greeting for
 * the time of day, today drawn as Home's hour strip with "now" on it, and one
 * apricot button. It remembers the last account on this device and offers to
 * continue as them; a failed sign-in says why and what to do, in place of
 * Firebase's raw "auth/…" codes.
 */

const ZONE = "Asia/Manila";
const KEEPS = [
  { icon: BookOpenText, label: "Journal", tone: "sage" },
  { icon: Flame, label: "Habits", tone: "coral" },
  { icon: Wallet, label: "Money", tone: "ember" },
];

/** Manila wall-clock parts for now: hour, minute, and the date line. */
function manilaNow(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const date = new Intl.DateTimeFormat("en-PH", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" }).format(now);
  const time = new Intl.DateTimeFormat("en-PH", { timeZone: ZONE, hour: "numeric", minute: "2-digit" }).format(now);
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const left = 24 * 60 - (hour * 60 + minute);
  return { hour, minute, date, time, greeting, left: `${Math.floor(left / 60)}h ${String(left % 60).padStart(2, "0")}m` };
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const NOT_CONNECTED: AuthProblem = {
  title: "Sign-in isn't connected on this build",
  detail: "The site was built without its Firebase settings. Add the NEXT_PUBLIC_FIREBASE_* values and redeploy.",
};

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: (user?: any) => void }) {
  const [problem, setProblem] = useState<AuthProblem | null>(firebaseConfigured ? null : NOT_CONNECTED);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<RememberedAccount | null>(null);
  const haptic = useWebHaptics();
  const still = useReducedMotion();
  const now = useClock();
  const clock = now ? manilaNow(now) : null;

  useEffect(() => setAccount(rememberedAccount()), []);

  // Back from Google after a redirect sign-in (the home-screen app): admit or explain.
  const onLoginSuccessRef = useRef(onLoginSuccess);
  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);
  useEffect(() => {
    authService
      .finishRedirect()
      .then((user) => user && onLoginSuccessRef.current?.(user))
      .catch((err) => setProblem(authProblem(err, window.location.hostname)));
  }, []);

  const signIn = async () => {
    haptic?.trigger?.("medium");
    setLoading(true);
    setProblem(null);
    try {
      const user = await authService.loginWithGoogle(account?.email);
      // Null: the page is on its way to Google and comes back signed in.
      if (!user) return;
      haptic?.trigger?.("success");
      if (onLoginSuccess) onLoginSuccess(user);
      else window.location.reload();
    } catch (err) {
      const next = authProblem(err, window.location.hostname);
      if (next) haptic?.trigger?.("error");
      setProblem(next);
    } finally {
      setLoading(false);
    }
  };

  const notYou = () => {
    forgetAccount();
    setAccount(null);
  };

  const localMode = () => {
    haptic?.trigger?.("light");
    localStorage.setItem("seneca_local_session", "true");
    onLoginSuccess?.({ email: "local@example.com", displayName: "Local", uid: "local-admin" });
  };

  const enter = (i: number) =>
    still ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.06 * i, ease: [0.23, 1, 0.32, 1] } };

  return (
    <div className="sn-door">
      <section className="sn-card sn-door-card" aria-labelledby="sn-door-title">
        <motion.header className="sn-door-head" {...enter(0)}>
          <img className="sn-door-mark" src="/seneca/seneca-icon-96.webp" srcSet="/seneca/seneca-icon-96.webp 1x, /seneca/seneca-icon-192.webp 2x" width={44} height={44} alt="" />
          <div>
            <p className="sn-door-brand">Seneca</p>
            <p className="sn-door-sub">Private workspace</p>
          </div>
          <span className="sn-door-lock">
            <LockSimple size={13} weight="bold" aria-hidden="true" />
            Owner only
          </span>
        </motion.header>

        <motion.div className="sn-door-greet" {...enter(1)}>
          <h2 id="sn-door-title" className="sn-door-title">
            {clock ? clock.greeting : "Welcome"}
            {account ? `, ${account.name}` : ""}.
          </h2>
          <p className="sn-door-date">{clock ? `${clock.date} · ${clock.time} Philippine time` : " "}</p>
        </motion.div>

        {/* Today, as Home draws it: an hour strip with "now" on it. */}
        <motion.div className="sn-door-day" {...enter(2)} aria-hidden={!clock}>
          <div className="sn-door-strip" role="img" aria-label={clock ? `${clock.left} left today` : "Today"}>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} data-past={clock && h < clock.hour ? "" : undefined} data-now={clock && h === clock.hour ? "" : undefined} />
            ))}
          </div>
          <div className="sn-door-strip-legend">
            <span>12 AM</span>
            <span className="sn-door-left">{clock ? `${clock.left} left today` : ""}</span>
            <span>12 AM</span>
          </div>
        </motion.div>

        <motion.ul className="sn-door-keeps" aria-label="What Seneca keeps" {...enter(3)}>
          {KEEPS.map(({ icon: Icon, label, tone }) => (
            <li key={label} data-tone={tone}>
              <Icon size={16} weight="bold" aria-hidden="true" />
              {label}
            </li>
          ))}
        </motion.ul>

        <AnimatePresence initial={false}>
          {problem ? (
            <motion.div
              key={problem.title}
              role="alert"
              className="sn-door-problem-wrap"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="sn-door-problem">
                <WarningCircle size={18} weight="bold" aria-hidden="true" />
                <div>
                  <p className="sn-door-problem-title">{problem.title}</p>
                  <p className="sn-door-problem-detail">{problem.detail}</p>
                  {problem.code ? <p className="sn-door-problem-code">{problem.code}</p> : null}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div className="sn-door-actions" {...enter(4)}>
          <button
            type="button"
            onClick={signIn}
            disabled={loading || !firebaseConfigured}
            aria-busy={loading || undefined}
            className="sn-btn sn-btn-primary sn-btn-block sn-door-google"
          >
            <span className="sn-door-google-face" data-busy={loading || undefined}>
              {account?.photo ? (
                <img src={account.photo} alt="" width={22} height={22} referrerPolicy="no-referrer" className="sn-door-avatar" />
              ) : (
                <SiGoogle size={16} aria-hidden="true" />
              )}
              <span>{account ? `Continue as ${account.name}` : "Continue with Google"}</span>
            </span>
            <span className="sn-door-spinner" data-busy={loading || undefined} aria-hidden="true" />
          </button>
          {account ? (
            <p className="sn-door-account">
              {account.email} ·{" "}
              <button type="button" className="sn-door-link" onClick={notYou}>
                Not you?
              </button>
            </p>
          ) : null}

          {/* Local mode skips sign-in, so it exists only in development. */}
          {process.env.NODE_ENV !== "production" ? (
            <button type="button" onClick={localMode} className="sn-btn sn-btn-outline sn-btn-block sn-door-local">
              <UserCircle size={17} weight="bold" aria-hidden="true" />
              <span>Local mode, this device only</span>
            </button>
          ) : null}
        </motion.div>

        <p className="sn-door-note">You stay signed in on this device. Your entries never go to analytics.</p>
      </section>
    </div>
  );
}
