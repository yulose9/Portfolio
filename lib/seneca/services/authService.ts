// @ts-nocheck
/**
 * Authentication Service
 * Manages user login and security.
 */

import { auth, getEnv } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, type User } from "firebase/auth";
import { flushPendingWrites } from "./dataLogger";

const ALLOWED_EMAIL = getEnv("ALLOWED_EMAIL");

export const authService = {
  get currentUser(): User | null {
    return auth?.currentUser ?? null;
  },

  async loginWithGoogle(): Promise<User> {
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // SECURITY CHECK: Email Allow-List
      if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
        await signOut(auth); // Immediately kick them out
        throw new Error("Access Denied: This email is not authorized.");
      }

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
