/*
 * Fail the build on a malformed PostHog key rather than ship one that silently
 * never records. The key is case-sensitive and checked only by PostHog, so
 * what can be caught here is corruption: whitespace or a stray  from a
 * Windows line ending, quotes pasted in with it, truncation, or a phx_
 * personal key (read/write access to the account) put where the public
 * project key belongs. An absent key is fine — analytics simply stay off.
 */
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (posthogKey !== undefined && posthogKey !== "") {
  if (posthogKey.startsWith("phx_")) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_KEY is a PostHog *personal* API key (phx_). That key " +
        "can read and modify your PostHog data and must never ship to the " +
        "browser. Use the project API key (phc_) from Project settings."
    );
  }
  if (!/^phc_[A-Za-z0-9]{40,}$/.test(posthogKey)) {
    throw new Error(
      `NEXT_PUBLIC_POSTHOG_KEY is malformed (length ${posthogKey.length}): ` +
        "expected phc_ followed only by letters and digits, with no spaces, " +
        "quotes or line-ending characters."
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    // `output: "export"` has no image server, so next/image must not try to
    // optimize on request. Without this, adding next/image breaks the build.
    unoptimized: true,
  },
};

module.exports = nextConfig;
