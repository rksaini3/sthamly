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
        sand: "#FCEEDF",
        accent: "#B5451B",
      },
    },
  },
  plugins: [],
};

export default config;