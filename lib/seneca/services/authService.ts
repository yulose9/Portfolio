// @ts-nocheck
/**
 * Authentication Service
 * Manages user login and security.
 */

import { auth, getEnv } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, type User } from "firebase/auth";
import { flushPendingWrites } from "./dataLogger";
import { rememberAccount } from "./rememberedAccount";

const ALLOWED_EMAIL = getEnv("ALLOWED_EMAIL");

export const authService = {
  get currentUser(): User | null {
    return auth?.currentUser ?? null;
  },

  /** `hint`: the remembered email, so Google offers that account first. */
  async loginWithGoogle(hint?: string): Promise<User> {
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters(hint ? { login_hint: hint, prompt: "select_account" } : { prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // SECURITY CHECK: Email Allow-List
      if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
        await signOut(auth); // Immediately kick them out
        throw new Error("Access Denied: This email is not authorized.");
      }

      rememberAccount(user);
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
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
