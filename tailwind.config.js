/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
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
