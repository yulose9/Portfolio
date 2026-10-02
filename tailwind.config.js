/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  // dark: utilities follow the resolved theme on <html> (app/lib/theme.ts),
  // not the OS directly, so an explicit Light or Dark choice wins.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      // The Sound layer's tokens (globals.css :root), as utilities.
      colors: {
        "shell-fg-muted": "var(--shell-fg-muted)",
        "shell-fg-faint": "var(--shell-fg-faint)",
      },
      keyframes: {
        // The design's soft blur-in, used when a tab panel mounts.
        "panel-in": {
          from: { opacity: "0", filter: "blur(4px)", transform: "translateY(4px)" },
          to: { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
      },
      animation: {
        "panel-in": "panel-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
