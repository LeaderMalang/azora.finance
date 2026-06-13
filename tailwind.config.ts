import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        teal: "#2dd4bf",
        "teal-bright": "#5eead4",
        "teal-deep": "#0d9488",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        elevated: "var(--elevated)",
        danger: "#ff6b6b",
      },
      borderRadius: {
        card: "16px",
        ctl: "10px",
        pill: "9999px",
      },
      maxWidth: {
        site: "1280px",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        drift1: "drift1 20s ease-in-out infinite",
        drift2: "drift2 25s ease-in-out infinite",
        drift3: "drift3 18s ease-in-out infinite",
      },
      keyframes: {
        drift1: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(-60px,40px) scale(1.05)" },
          "66%": { transform: "translate(40px,-30px) scale(0.95)" },
        },
        drift2: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "40%": { transform: "translate(50px,-60px) scale(1.07)" },
          "70%": { transform: "translate(-30px,50px) scale(0.93)" },
        },
        drift3: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-40px,30px) scale(1.1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
