/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "hero-title-gradient":
          "linear-gradient(to right, #1173FC 0%, #9DB1D3 12.31%, #CDC6C6 27.35%, #F9DAB9 49.66%, #F9DAB8 67.51%)",
      },
    },
  },
  plugins: [],
};
