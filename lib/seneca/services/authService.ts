// @ts-nocheck
/**
 * Authentication Service
 * Manages user login and security.
 */

import { auth, getEnv, sameOriginAuth } from "./firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, type User } from "firebase/auth";
import { flushPendingWrites } from "./dataLogger";
import { rememberAccount } from "./rememberedAccount";

const ALLOWED_EMAIL = getEnv("ALLOWED_EMAIL");

/** Opened from the home screen: a pop-up there is a separate browser sheet that can't hand the sign-in back. */
const isStandalone = () =>
  typeof window !== "undefined" &&
  ((navigator as any).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches);

async function admit(user: User): Promise<User> {
  // SECURITY CHECK: Email Allow-List
  if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
    await signOut(auth); // Immediately kick them out
    throw new Error("Access Denied: This email is not authorized.");
  }
  rememberAccount(user);
  return user;
}

export const authService = {
  get currentUser(): User | null {
    return auth?.currentUser ?? null;
  },

  /**
   * `hint`: the remembered email, so Google offers that account first.
   * In the home-screen app (with the same-origin helper) this navigates away
   * to Google and resolves on return through `finishRedirect`; elsewhere it's
   * the pop-up.
   */
  async loginWithGoogle(hint?: string): Promise<User | null> {
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters(hint ? { login_hint: hint, prompt: "select_account" } : { prompt: "select_account" });
    try {
      if (sameOriginAuth && isStandalone()) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      const result = await signInWithPopup(auth, provider);
      return await admit(result.user);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  /** After a redirect sign-in: admits the account, or throws why it failed. Null when there was none. */
  async finishRedirect(): Promise<User | null> {
    if (!auth || !sameOriginAuth) return null;
    const result = await getRedirectResult(auth);
    return result ? admit(result.user) : null;
  },

  async logout(): Promise<void> {
    if (auth) {
      await flushPendingWrites().catch(() => {});
      await signOut(auth);
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};
