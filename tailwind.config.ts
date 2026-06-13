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
        app: "960px",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        drift1: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(80px,60px)" },
        },
        drift2: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(-70px,50px)" },
        },
        drift3: {
          "0%,100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(40px,-70px)" },
        },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(45,212,191,0.45)" },
          "50%": { boxShadow: "0 0 0 6px transparent" },
        },
        modalIn: {
          from: { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(12px) scale(0.96)" },
        },
      },
      animation: {
        drift1: "drift1 22s ease-in-out infinite",
        drift2: "drift2 26s ease-in-out infinite",
        drift3: "drift3 30s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.4s ease-in-out infinite",
        "modal-in": "modalIn 0.25s cubic-bezier(0.22,1,0.36,1) both",
        "toast-in": "toastIn 0.4s cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};
export default config;
