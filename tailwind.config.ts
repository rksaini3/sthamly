import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2F5D50",
          soft: "#E8F0EC",
        },
        canvas: "#FAF7F2",
        ink: "#1F2421",
        muted: "#5B625E",
        sand: "#FCEEDF",
        accent: "#B5451B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;