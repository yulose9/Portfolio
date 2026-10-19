import { Figtree } from "next/font/google";

/**
 * Seneca's one typeface. Figtree is a friendly geometric grotesk: round
 * enough for the warm, emoji-led dashboard, tight enough at display sizes
 * for "Happy Tuesday" to read as a headline. Scoped to the Seneca subtree
 * through the CSS variable, so the rest of the admin keeps Inter.
 */
export const senecaFont = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-seneca",
});
