/*
 * Firebase sign-in errors, in plain words. Firebase reports codes such as
 * "auth/unauthorized-domain"; the raw message ("Firebase: Error (auth/…)")
 * tells the owner nothing about what to do next.
 *
 * `null` means "say nothing": closing the Google window is not an error.
 */

export type AuthProblem = { title: string; detail: string; code?: string };

export function authProblem(error: unknown, host = ""): AuthProblem | null {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/popup-blocked":
      return { title: "The sign-in window was blocked", detail: "Allow pop-ups for this site, then try again.", code };
    case "auth/unauthorized-domain":
      return {
        title: "This address can't use Google sign-in yet",
        detail: `Add ${host || "this domain"} in Firebase under Authentication › Settings › Authorised domains.`,
        code,
      };
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
    case "auth/configuration-not-found":
      return {
        title: "Sign-in isn't connected on this build",
        detail: "The site was built without its Firebase settings. Add the NEXT_PUBLIC_FIREBASE_* values and redeploy.",
        code,
      };
    case "auth/network-request-failed":
      return { title: "Can't reach Google", detail: "Check your connection, then try again.", code };
    case "auth/too-many-requests":
      return { title: "Too many attempts", detail: "Wait a minute, then try again.", code };
    case "auth/user-disabled":
      return { title: "This account is disabled", detail: "Re-enable it in Firebase under Authentication › Users.", code };
  }
  if (/not authorized/i.test(message))
    return { title: "That isn't the owner's account", detail: "Sign in with the Google account that owns this workspace.", code: "not-owner" };
  return { title: "Couldn't sign in", detail: "Something went wrong with Google sign-in. Try again.", code: code || undefined };
}
