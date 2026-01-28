import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#7B1113", // MSU maroon
          DEFAULT: "#7B1113",
        },
        "primary-hover": "#961517",
        "primary-active": "#5a0c0e",
        "bg-light": "#f6f7f8",
        "bg-dark": "#101822",
        "card-dark": "#1a2634",
        "msu-gold": "#FDB913",
        "msu-green": "#006400",
      },
      fontFamily: {
        sans: ["Lexend", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [forms],
};

export default config;
