import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
      },
      fontFamily: { sans: ["Inter", "sans-serif"], arabic: ["Amiri", "serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 14px 38px rgba(15,23,42,.05)",
        lift: "0 20px 55px rgba(29,78,216,.14)",
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
    },
  },
  plugins: [],
} satisfies Config;
