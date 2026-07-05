// Fonte única de verdade do design system BLACK BELT 360.
// Trocar `accent` aqui (e no tailwind.config) muda a assinatura da marca.
export const tokens = {
  colors: {
    bg: "#0A0A0B",        // fundo base (quase preto)
    surface: "#141416",   // cards / superfícies elevadas
    surface2: "#1E1E22",  // superfície mais elevada / hover
    line: "#2A2A2E",      // bordas sutis
    fg: "#F5F5F7",        // texto principal
    muted: "#9A9AA2",     // texto secundário
    accent: "#F5C518",    // dourado — play, progresso, destaques
    accentFg: "#0A0A0B",  // texto sobre o acento
    danger: "#E5484D",    // erro / prioridade alta
    warning: "#F5A623",   // prioridade média
    success: "#30A46C",   // aprovado / prioridade baixa
  },
  radii: { sm: "6px", md: "10px", lg: "16px", full: "9999px" },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px" },
} as const;

export type Tokens = typeof tokens;
