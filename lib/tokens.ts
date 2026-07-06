// Fonte única de verdade do design system BLACK BELT 360.
// Trocar `accent` aqui (e no tailwind.config) muda a assinatura da marca.
export const tokens = {
  colors: {
    bg: "#0A0A0B",        // fundo base (quase preto)
    surface: "#151316",   // cards / superfícies elevadas — preto quente (não cinza frio)
    surface2: "#201C1F",  // superfície mais elevada / hover / ativa
    line: "#7A736C",      // bordas sutis, tom quente (hairline) — >=3:1 contra bg/surface/surface2 (WCAG 1.4.11)
    fg: "#F5F5F7",        // texto principal
    muted: "#ACA8AF",     // texto secundário — contraste reforçado sobre bg/surface
    accent: "#F5C518",    // dourado — play, progresso, destaques (fonte única)
    accentFg: "#0A0A0B",  // texto sobre o acento
    danger: "#E5484D",    // erro / prioridade alta
    warning: "#F5A623",   // prioridade média
    success: "#30A46C",   // aprovado / prioridade baixa
    waveformIdle: "#3A3A40", // onda não-tocada do player (neutra, independe do rebrand)
  },
  radii: { sm: "6px", md: "10px", lg: "16px", xl: "24px", full: "9999px" },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px" },
} as const;

export type Tokens = typeof tokens;
