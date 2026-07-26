import type { Config } from "tailwindcss";

// Token diambil dari CSS variable yang udah ada di globals.css (--accent, --ink-*, dst)
// biar identitas visual gak berubah pas migrasi Bootstrap -> Tailwind.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#4f46e5",
          soft: "#eef2ff",
          hover: "#4338ca",
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
        },
        surface: "#f8fafc",
        "border-soft": "#e2e8f0",
        sidebar: {
          bg: "#111827",
          bg2: "#1e293b",
          ink: "#cbd5e1",
          "ink-dim": "#64748b",
        },
        status: {
          lunas: "#10b981",
          belum: "#f59e0b",
          terlambat: "#ef4444",
        },
      },
      boxShadow: {
        sm2: "0 1px 2px rgba(15, 23, 42, 0.06)",
        md2: "0 4px 16px rgba(15, 23, 42, 0.08)",
        lg2: "0 12px 32px rgba(15, 23, 42, 0.14)",
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.25s ease",
      },
    },
  },
  plugins: [],
};

export default config;
