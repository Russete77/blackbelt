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
      },
      borderRadius: {
        sm: tokens.radii.sm,
        md: tokens.radii.md,
        lg: tokens.radii.lg,
      },
    },
  },
  plugins: [],
} satisfies Config;
