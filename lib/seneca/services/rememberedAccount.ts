/*
 * The account that last signed in on this device, so the sign-in screen can
 * say "Continue as John" and ask Google for that account straight away
 * (login_hint). Only the name, email and photo are kept: no tokens, no data.
 * Signing out keeps it, as Google's own account chooser does; "Not you?"
 * forgets it.
 */

export type RememberedAccount = { name: string; email: string; photo?: string };

const KEY = "seneca_remembered_account_v1";

export function rememberedAccount(): RememberedAccount | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return value && typeof value.email === "string" && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
}

export function rememberAccount(user: { displayName?: string | null; email?: string | null; photoURL?: string | null }) {
  if (!user?.email) return;
  const name = (user.displayName || user.email.split("@")[0]).trim().split(/\s+/)[0];
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, email: user.email, ...(user.photoURL ? { photo: user.photoURL } : {}) }));
  } catch {
    /* private mode: the screen just won't greet by name */
  }
}

export function forgetAccount() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
}
