import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0f0f1a",
          900: "#1a1a2e",
          800: "#2d2d44",
          700: "#40405a",
          600: "#535370",
        },
        amber: {
          DEFAULT: "#d4a574",
          light: "#e8c9a8",
          dark: "#b8864f",
        },
        sage: {
          DEFAULT: "#a8b5a0",
          light: "#c4cebf",
          dark: "#8a9a80",
        },
        cream: "#faf9f6",
        parchment: "#f0ede6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
