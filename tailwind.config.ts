import type { Config } from "tailwindcss";

// रंग CSS variables से आते हैं (app/globals.css में)। इसलिए dark mode बस variables बदलकर चलता है।
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        sand: "rgb(var(--sand) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        // सफ़ेद को surface से जोड़ा है, ताकि dark mode में पुराने bg-white भी ठीक दिखें
        white: "rgb(var(--surface) / <alpha-value>)",
        gray: {
          50: "rgb(var(--gray-50) / <alpha-value>)",
          100: "rgb(var(--gray-100) / <alpha-value>)",
          200: "rgb(var(--gray-200) / <alpha-value>)",
          300: "rgb(var(--gray-300) / <alpha-value>)",
          400: "rgb(var(--gray-400) / <alpha-value>)",
          500: "rgb(var(--gray-500) / <alpha-value>)",
          600: "rgb(var(--gray-600) / <alpha-value>)",
          700: "rgb(var(--gray-700) / <alpha-value>)",
          800: "rgb(var(--gray-800) / <alpha-value>)",
          900: "rgb(var(--gray-900) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans Devanagari"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        serif: ['"Noto Serif"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;