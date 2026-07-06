import type { Config } from "tailwindcss";
import { tokens } from "./lib/tokens";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: tokens.colors.bg,
        surface: tokens.colors.surface,
        surface2: tokens.colors.surface2,
        line: tokens.colors.line,
        fg: tokens.colors.fg,
        muted: tokens.colors.muted,
        accent: tokens.colors.accent,
        "accent-fg": tokens.colors.accentFg,
        danger: tokens.colors.danger,
        warning: tokens.colors.warning,
        success: tokens.colors.success,
        "waveform-idle": tokens.colors.waveformIdle,
      },
      borderRadius: {
        sm: tokens.radii.sm,
        md: tokens.radii.md,
        lg: tokens.radii.lg,
        xl: tokens.radii.xl,
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        // Backdrop de components/ui/Modal.tsx — só opacidade (o painel do
        // modal já tem seu próprio slide/fade, não translada junto).
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Painel do Modal em telas pequenas (bottom-sheet: sobe da borda
        // inferior); em md+ o Modal usa fade-in-up (dialog centralizado).
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
