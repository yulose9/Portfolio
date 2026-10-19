/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // dark: utilities follow the resolved theme on <html> (app/lib/theme.ts),
  // not the OS directly, so an explicit Light or Dark choice wins.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      // The Sound layer's tokens (globals.css :root), as utilities.
      colors: {
        "shell-fg-muted": "var(--shell-fg-muted)",
        "shell-fg-faint": "var(--shell-fg-faint)",

        // Seneca Design System (HIG light / dynamic tokens)
        canvas: "var(--color-canvas, #f2f2f7)",
        surface: "var(--color-surface, #ffffff)",
        fill: "var(--color-fill, rgba(120, 120, 128, 0.12))",
        "fill-strong": "var(--color-fill-strong, rgba(120, 120, 128, 0.2))",
        ink: "var(--color-ink, #000000)",
        "ink-2": "var(--color-ink-2, rgba(60, 60, 67, 0.6))",
        "ink-3": "var(--color-ink-3, rgba(60, 60, 67, 0.3))",
        separator: "var(--color-separator, rgba(60, 60, 67, 0.18))",
        accent: "var(--color-accent, #007aff)",
        positive: "var(--color-positive, #34c759)",
        negative: "var(--color-negative, #ff3b30)",
        caution: "var(--color-caution, #ff9500)",
        indigo: "var(--color-indigo, #5856d6)",
        purple: "var(--color-purple, #af52de)",
        teal: "var(--color-teal, #5ac8fa)",
        yellow: "var(--color-yellow, #ffcc00)",
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "large-title": ["34px", { lineHeight: "41px", letterSpacing: "0.01em" }],
        "title-1": ["28px", { lineHeight: "34px" }],
        "title-2": ["22px", { lineHeight: "28px" }],
        "title-3": ["20px", { lineHeight: "25px" }],
        body: ["17px", { lineHeight: "22px", letterSpacing: "-0.02em" }],
        callout: ["16px", { lineHeight: "21px", letterSpacing: "-0.02em" }],
        subhead: ["15px", { lineHeight: "20px", letterSpacing: "-0.015em" }],
        footnote: ["13px", { lineHeight: "18px", letterSpacing: "-0.005em" }],
        caption: ["12px", { lineHeight: "16px" }],
        "caption-2": ["11px", { lineHeight: "13px", letterSpacing: "0.005em" }],
      },
      borderRadius: {
        sheet: "28px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 12px rgba(0, 0, 0, 0.06)",
        float: "0 2px 6px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.12)",
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
