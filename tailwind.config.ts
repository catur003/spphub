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
        siswaFadeInUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        tabFadeIn: {
          from: { opacity: "0", transform: "scale(0.985) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shimmerFill: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        pulseBadge: {
          "0%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
          "70%": { boxShadow: "0 0 0 8px rgba(239, 68, 68, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" },
        },
        pulseSuccess: {
          "0%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.4)" },
          "70%": { boxShadow: "0 0 0 8px rgba(16, 185, 129, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)" },
        },
        floatBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.6)" },
          "70%": { boxShadow: "0 0 0 14px rgba(16, 185, 129, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(20px) scale(0.94)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.25s ease",
        "fade-in-up-lg": "siswaFadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
        "tab-fade-in": "tabFadeIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "shimmer-fill": "shimmerFill 4s ease infinite",
        "pulse-badge": "pulseBadge 2s infinite",
        "pulse-success-ring": "pulseSuccess 2.5s infinite",
        "float-bounce": "floatBounce 4s ease-in-out infinite",
        "pulse-ring": "pulseRing 3s infinite",
        "toast-in": "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};

export default config;
