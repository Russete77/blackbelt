# Fundação BLACK BELT 360 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. During UI construction, also load the **frontend-design** skill for design quality.

**Goal:** Construir a casca navegável da BLACK BELT 360 — design system dark premium, shell responsivo com os 6 módulos e player estilo Spotify com waveform — usando dados mockados, sem backend.

**Architecture:** App Next.js (App Router) + TypeScript. Design system centralizado em tokens (Tailwind + `lib/tokens.ts`). Componentes isolados por responsabilidade em `components/ui`, `components/shell`, `components/player`. Dados vêm de `mock/` tipado por `types/` que espelham o modelo de dados do PRD §8, de modo que trocar por Supabase depois seja trocar a fonte, não a tela. Player usa wavesurfer.js. Estado do player em um contexto React leve.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, wavesurfer.js v7, Vitest + React Testing Library.

## Global Constraints

- **Idioma da UI:** português (pt-BR). Todos os rótulos, botões e textos visíveis em português.
- **Tema:** dark premium. Fundo grafite/preto, acento dourado/âmbar `#F5C518`. Acento deve ser trocável mudando UM token.
- **Mobile-first:** toda tela funciona no celular (bottom nav) e no desktop (sidebar). Testar nos dois.
- **Sem backend nesta fatia:** dados exclusivamente de `mock/`. Nenhuma chamada de rede, auth ou upload.
- **Tipos espelham o PRD §8:** `usuarios, projetos, faixas, versoes_faixa, comentarios, estrutura_faixa`.
- **6 módulos na navegação:** Home, Estúdio, Analytics, Previsão, Shows, Registro. Só Home e Estúdio navegáveis nesta fatia; os outros aparecem marcados como "Em breve".
- **Package manager:** npm.
- **Commits frequentes:** um commit ao fim de cada task.

---

### Task 1: Scaffold do projeto Next.js + Tailwind + testes

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`

**Interfaces:**
- Produces: um app Next.js que roda em `npm run dev` e um runner de testes `npm run test`.

- [ ] **Step 1: Criar o app Next.js**

O projeto já tem `docs/` e o `.docx` na raiz. Fazer o scaffold na própria raiz (`.`):

```bash
cd "C:/Users/erick/BLACKBELT"
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm --yes
```

Se o CLI reclamar que o diretório não está vazio, confirmar sobrescrita apenas dos arquivos de scaffold (ele preserva `docs/` e o `.docx`). Se ainda assim bloquear, gerar em `./.tmp-app` e mover o conteúdo pra raiz, depois remover `.tmp-app`.

- [ ] **Step 2: Instalar dependências de teste e libs**

```bash
npm install wavesurfer.js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Adicionar script de teste**

Modify `package.json` — adicionar em `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Escrever um teste-fumaça**

Create `app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renderiza sem quebrar", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
```

Modify `app/page.tsx` — substituir o conteúdo padrão por um mínimo:

```tsx
export default function Home() {
  return <main>BLACK BELT 360</main>;
}
```

- [ ] **Step 6: Rodar teste e dev server**

Run: `npm run test`
Expected: 1 teste PASS.

Run: `npm run dev` (abrir http://localhost:3000, confirmar que carrega, depois parar)
Expected: página mostra "BLACK BELT 360".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Tokens do design system (dark premium + dourado)

**Files:**
- Create: `lib/tokens.ts`, `lib/tokens.test.ts`
- Modify: `tailwind.config.ts`, `app/globals.css`

**Interfaces:**
- Produces: objeto `tokens` com `colors`, `radii`, `space`; classes Tailwind (`bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `bg-accent`, `text-accent`, `border-line`) disponíveis para os demais tasks.

- [ ] **Step 1: Escrever o teste dos tokens**

Create `lib/tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tokens } from "./tokens";

describe("tokens", () => {
  it("define o acento dourado como fonte única", () => {
    expect(tokens.colors.accent).toBe("#F5C518");
  });
  it("tem fundo escuro (dark premium)", () => {
    expect(tokens.colors.bg).toBe("#0A0A0B");
  });
  it("expõe superfícies e texto", () => {
    expect(tokens.colors.surface).toBeTruthy();
    expect(tokens.colors.fg).toBeTruthy();
    expect(tokens.colors.muted).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar teste (falha)**

Run: `npm run test -- lib/tokens.test.ts`
Expected: FAIL — "Cannot find module './tokens'".

- [ ] **Step 3: Criar os tokens**

Create `lib/tokens.ts`:

```ts
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
```

- [ ] **Step 4: Rodar teste (passa)**

Run: `npm run test -- lib/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Espelhar tokens no Tailwind**

Modify `tailwind.config.ts` — substituir o `theme.extend.colors` e `borderRadius`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        surface: "#141416",
        surface2: "#1E1E22",
        line: "#2A2A2E",
        fg: "#F5F5F7",
        muted: "#9A9AA2",
        accent: "#F5C518",
        "accent-fg": "#0A0A0B",
        danger: "#E5484D",
        warning: "#F5A623",
        success: "#30A46C",
      },
      borderRadius: { sm: "6px", md: "10px", lg: "16px" },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Aplicar o tema base no globals**

Modify `app/globals.css` — garantir (mantendo o `@tailwind` diretivas existentes) que o body use o tema:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
body {
  background-color: #0A0A0B;
  color: #F5F5F7;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 7: Verificar visual**

Run: `npm run dev` → a home deve aparecer com fundo quase preto e texto claro.
Expected: fundo escuro aplicado.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: tokens do design system dark premium + acento dourado"
```

---

### Task 3: Tipos do domínio (PRD §8) + dados mock

**Files:**
- Create: `types/domain.ts`, `mock/data.ts`, `mock/data.test.ts`

**Interfaces:**
- Produces: tipos `Usuario, Projeto, Faixa, VersaoFaixa, Comentario, EstruturaFaixa` e coleções `projetos, faixas, versoes, comentarios, usuarios`. Helpers `getFaixasDoProjeto(projetoId)`, `getVersoesDaFaixa(faixaId)`, `getComentariosDaVersao(versaoId)`.

- [ ] **Step 1: Escrever o teste dos dados mock**

Create `mock/data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  projetos, faixas, versoes, comentarios,
  getFaixasDoProjeto, getVersoesDaFaixa, getComentariosDaVersao,
} from "./data";

describe("dados mock", () => {
  it("tem ao menos um projeto com faixas", () => {
    expect(projetos.length).toBeGreaterThan(0);
    expect(getFaixasDoProjeto(projetos[0].id).length).toBeGreaterThan(0);
  });
  it("cada faixa tem ao menos uma versão", () => {
    for (const f of faixas) {
      expect(getVersoesDaFaixa(f.id).length).toBeGreaterThan(0);
    }
  });
  it("comentários têm timestamp em segundos e categoria", () => {
    const c = comentarios[0];
    expect(typeof c.timestampSegundos).toBe("number");
    expect(["beat", "mix", "master", "letra", "geral"]).toContain(c.categoria);
  });
  it("helper de comentários filtra por versão", () => {
    const v = versoes[0];
    getComentariosDaVersao(v.id).forEach((c) => expect(c.versaoId).toBe(v.id));
  });
});
```

- [ ] **Step 2: Rodar teste (falha)**

Run: `npm run test -- mock/data.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Criar os tipos**

Create `types/domain.ts`:

```ts
// Espelha o Modelo de Dados do PRD §8. Trocar mock por Supabase = trocar a fonte, não estes tipos.
export type Papel = "admin" | "artista" | "colaborador";
export type TipoProjeto = "single" | "ep" | "album" | "feat";
export type EstagioPipeline =
  | "ideia" | "gravacao" | "mixagem" | "masterizacao" | "aprovado" | "lancado";
export type TipoVersao = "beat" | "vocal" | "mix" | "master";
export type CategoriaComentario = "beat" | "mix" | "master" | "letra" | "geral";
export type Prioridade = "alta" | "media" | "baixa";
export type RotuloEstrutura = "intro" | "verso" | "refrao" | "ponte" | "outro";

export interface Usuario {
  id: string; nome: string; papel: Papel; artistaVinculado?: string; avatarUrl?: string;
}
export interface Projeto {
  id: string; nome: string; tipo: TipoProjeto; artistas: string[];
  statusGeral: EstagioPipeline; capaUrl?: string;
}
export interface Faixa {
  id: string; projetoId: string; titulo: string; genero?: string; estagio: EstagioPipeline;
}
export interface VersaoFaixa {
  id: string; faixaId: string; tipo: TipoVersao; rotulo: string;
  arquivoUrl: string; duracaoSegundos: number; enviadoPor: string; data: string;
}
export interface Comentario {
  id: string; versaoId: string; timestampSegundos: number;
  categoria: CategoriaComentario; prioridade: Prioridade; responsavel?: string;
  autor: string; texto: string; resolvido: boolean;
}
export interface EstruturaFaixa {
  id: string; faixaId: string; rotulo: RotuloEstrutura; inicioSegundos: number; fimSegundos: number;
}
```

- [ ] **Step 4: Criar os dados mock**

Create `mock/data.ts`:

```ts
import type {
  Usuario, Projeto, Faixa, VersaoFaixa, Comentario, EstruturaFaixa,
} from "@/types/domain";

// Áudio de exemplo (domínio público) para o player funcionar sem backend.
const AUDIO_DEMO =
  "https://cdn.jsdelivr.net/gh/naomiaro/waveform-data@v4.5.0/test/media/mp3/1-summer-fireworks.mp3";

export const usuarios: Usuario[] = [
  { id: "u_rick", nome: "Rick", papel: "admin" },
  { id: "u_bielzin", nome: "Bielzin", papel: "artista", artistaVinculado: "Bielzin" },
  { id: "u_postura", nome: "Postura", papel: "artista", artistaVinculado: "Postura" },
  { id: "u_eng", nome: "Engenheiro de Mix", papel: "colaborador" },
];

export const projetos: Projeto[] = [
  { id: "p_album4", nome: "Álbum 4", tipo: "album", artistas: ["Postura"], statusGeral: "mixagem" },
  { id: "p_ep_troy", nome: "EP Introdução", tipo: "ep", artistas: ["Troy"], statusGeral: "gravacao" },
  { id: "p_single_biel", nome: "Single — Corre", tipo: "single", artistas: ["Bielzin"], statusGeral: "aprovado" },
];

export const faixas: Faixa[] = [
  { id: "f_1", projetoId: "p_album4", titulo: "Abertura", genero: "rap", estagio: "mixagem" },
  { id: "f_2", projetoId: "p_album4", titulo: "Corre pela Cidade", genero: "rap", estagio: "gravacao" },
  { id: "f_3", projetoId: "p_ep_troy", titulo: "Primeiro Round", genero: "trap", estagio: "gravacao" },
  { id: "f_4", projetoId: "p_single_biel", titulo: "Corre", genero: "funk", estagio: "aprovado" },
];

export const versoes: VersaoFaixa[] = [
  { id: "v_1a", faixaId: "f_1", tipo: "beat", rotulo: "V1 — Beat", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 198, enviadoPor: "u_eng", data: "2026-06-20" },
  { id: "v_1b", faixaId: "f_1", tipo: "mix", rotulo: "V2 — Mix", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 198, enviadoPor: "u_eng", data: "2026-06-28" },
  { id: "v_2a", faixaId: "f_2", tipo: "vocal", rotulo: "V1 — Vocal", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 205, enviadoPor: "u_postura", data: "2026-06-25" },
  { id: "v_3a", faixaId: "f_3", tipo: "beat", rotulo: "V1 — Beat", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 180, enviadoPor: "u_eng", data: "2026-07-01" },
  { id: "v_4a", faixaId: "f_4", tipo: "master", rotulo: "V5 — Master", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 172, enviadoPor: "u_eng", data: "2026-07-02" },
];

export const comentarios: Comentario[] = [
  { id: "c_1", versaoId: "v_1b", timestampSegundos: 38, categoria: "beat", prioridade: "media", autor: "u_postura", responsavel: "u_eng", texto: "Trocar o hi-hat aqui.", resolvido: false },
  { id: "c_2", versaoId: "v_1b", timestampSegundos: 72, categoria: "mix", prioridade: "alta", autor: "u_rick", responsavel: "u_eng", texto: "Grave baixo demais.", resolvido: false },
  { id: "c_3", versaoId: "v_1b", timestampSegundos: 96, categoria: "mix", prioridade: "baixa", autor: "u_bielzin", texto: "Vocal alto no refrão.", resolvido: true },
];

export const estruturas: EstruturaFaixa[] = [
  { id: "e_1", faixaId: "f_1", rotulo: "intro", inicioSegundos: 0, fimSegundos: 20 },
  { id: "e_2", faixaId: "f_1", rotulo: "verso", inicioSegundos: 20, fimSegundos: 70 },
  { id: "e_3", faixaId: "f_1", rotulo: "refrao", inicioSegundos: 70, fimSegundos: 110 },
];

export const getFaixasDoProjeto = (projetoId: string) =>
  faixas.filter((f) => f.projetoId === projetoId);
export const getVersoesDaFaixa = (faixaId: string) =>
  versoes.filter((v) => v.faixaId === faixaId);
export const getComentariosDaVersao = (versaoId: string) =>
  comentarios.filter((c) => c.versaoId === versaoId);
export const getUsuario = (id: string) => usuarios.find((u) => u.id === id);
```

- [ ] **Step 5: Rodar teste (passa)**

Run: `npm run test -- mock/data.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: tipos do domínio (PRD §8) + dados mock"
```

---

### Task 4: Componentes base do design system

**Files:**
- Create: `lib/cn.ts`, `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/Card.tsx`, `components/ui/Avatar.tsx`, `components/ui/Badge.test.tsx`

**Interfaces:**
- Consumes: classes Tailwind do Task 2.
- Produces: `Button({variant, size, ...})`, `Badge({tone})` com `tone: "neutral" | "accent" | "alta" | "media" | "baixa" | "aprovado"`, `Card`, `CardHeader`, `CardBody`, `Avatar({nome, src})`.

- [ ] **Step 1: Helper de classes**

Create `lib/cn.ts`:

```ts
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Escrever teste do Badge**

Create `components/ui/Badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("mostra o texto e aplica o tom", () => {
    render(<Badge tone="alta">Alta</Badge>);
    const el = screen.getByText("Alta");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-danger");
  });
});
```

- [ ] **Step 3: Rodar teste (falha)**

Run: `npm run test -- components/ui/Badge.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 4: Criar Badge**

Create `components/ui/Badge.tsx`:

```tsx
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "alta" | "media" | "baixa" | "aprovado";

const tones: Record<Tone, string> = {
  neutral: "bg-surface2 text-muted",
  accent: "bg-accent/15 text-accent",
  alta: "bg-danger/15 text-danger",
  media: "bg-warning/15 text-warning",
  baixa: "bg-success/15 text-success",
  aprovado: "bg-success/15 text-success",
};

export function Badge({
  tone = "neutral", children, className,
}: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      tones[tone], className,
    )}>
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Rodar teste (passa)**

Run: `npm run test -- components/ui/Badge.test.tsx`
Expected: PASS.

- [ ] **Step 6: Criar Button, Card, Avatar**

Create `components/ui/Button.tsx`:

```tsx
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  ghost: "bg-transparent text-fg hover:bg-surface2",
  outline: "border border-line text-fg hover:bg-surface2",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-10 w-10 p-0 justify-center",
};

export function Button({
  variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium transition disabled:opacity-50",
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
}
```

Create `components/ui/Card.tsx`:

```tsx
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-lg bg-surface border border-line", className)}>{children}</div>;
}
export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
```

Create `components/ui/Avatar.tsx`:

```tsx
import { cn } from "@/lib/cn";

export function Avatar({ nome, src, className }: { nome: string; src?: string; className?: string }) {
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} className={cn("h-8 w-8 rounded-full object-cover", className)} />
  ) : (
    <div className={cn(
      "h-8 w-8 rounded-full bg-surface2 text-fg grid place-items-center text-xs font-semibold",
      className,
    )}>
      {iniciais}
    </div>
  );
}
```

- [ ] **Step 7: Rodar todos os testes**

Run: `npm run test`
Expected: todos PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: componentes base do design system (Button, Badge, Card, Avatar)"
```

---

### Task 5: App Shell responsivo (Sidebar + BottomNav + os 6 módulos)

**Files:**
- Create: `components/shell/nav-items.ts`, `components/shell/Sidebar.tsx`, `components/shell/BottomNav.tsx`, `components/shell/AppShell.tsx`, `components/shell/nav-items.test.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: componentes do Task 4.
- Produces: `navItems: {href, label, icon, disponivel}[]`, `AppShell({children})` que renderiza sidebar (desktop) + bottom nav (mobile) + área de conteúdo, com espaço reservado embaixo para o player.

- [ ] **Step 1: Escrever teste dos itens de navegação**

Create `components/shell/nav-items.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { navItems } from "./nav-items";

describe("navItems", () => {
  it("tem os 6 módulos", () => {
    expect(navItems.map((n) => n.label)).toEqual([
      "Home", "Estúdio", "Analytics", "Previsão", "Shows", "Registro",
    ]);
  });
  it("apenas Home e Estúdio estão disponíveis nesta fatia", () => {
    const disponiveis = navItems.filter((n) => n.disponivel).map((n) => n.label);
    expect(disponiveis).toEqual(["Home", "Estúdio"]);
  });
});
```

- [ ] **Step 2: Rodar teste (falha)**

Run: `npm run test -- components/shell/nav-items.test.ts`
Expected: FAIL.

- [ ] **Step 3: Criar os itens de navegação**

Create `components/shell/nav-items.ts`:

```ts
export interface NavItem {
  href: string; label: string; icon: string; disponivel: boolean;
}

// icon = emoji simples por enquanto (troca por lib de ícones depois, se quiser).
export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", disponivel: true },
  { href: "/estudio", label: "Estúdio", icon: "🎧", disponivel: true },
  { href: "/analytics", label: "Analytics", icon: "📊", disponivel: false },
  { href: "/previsao", label: "Previsão", icon: "🔮", disponivel: false },
  { href: "/shows", label: "Shows", icon: "🎤", disponivel: false },
  { href: "/registro", label: "Registro", icon: "📄", disponivel: false },
];
```

- [ ] **Step 4: Rodar teste (passa)**

Run: `npm run test -- components/shell/nav-items.test.ts`
Expected: PASS.

- [ ] **Step 5: Criar Sidebar (desktop)**

Create `components/shell/Sidebar.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col gap-1 p-4 border-r border-line bg-bg">
      <div className="px-2 py-3 text-lg font-bold tracking-tight">
        BLACK <span className="text-accent">BELT</span>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const ativo = path === item.href;
          const inner = (
            <span className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              ativo ? "bg-surface2 text-fg" : "text-muted hover:text-fg hover:bg-surface",
              !item.disponivel && "opacity-60",
            )}>
              <span aria-hidden>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {!item.disponivel && <Badge tone="neutral">Em breve</Badge>}
            </span>
          );
          return item.disponivel ? (
            <Link key={item.href} href={item.href}>{inner}</Link>
          ) : (
            <div key={item.href} aria-disabled>{inner}</div>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 6: Criar BottomNav (mobile)**

Create `components/shell/BottomNav.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const path = usePathname();
  // No celular mostramos só os disponíveis + os principais para não lotar a barra.
  const itens = navItems.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around border-t border-line bg-bg/95 backdrop-blur">
      {itens.map((item) => {
        const ativo = path === item.href;
        const conteudo = (
          <span className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-3 text-[10px]",
            ativo ? "text-accent" : "text-muted",
            !item.disponivel && "opacity-50",
          )}>
            <span aria-hidden className="text-base">{item.icon}</span>
            {item.label}
          </span>
        );
        return item.disponivel ? (
          <Link key={item.href} href={item.href}>{conteudo}</Link>
        ) : (
          <div key={item.href} aria-disabled>{conteudo}</div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 7: Criar AppShell**

Create `components/shell/AppShell.tsx`:

```tsx
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <Sidebar />
      {/* pb-40 = espaço para o player fixo (mobile) + bottom nav */}
      <main role="main" className="flex-1 pb-40 md:pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 8: Ligar o shell no layout**

Modify `app/layout.tsx` — envolver `{children}` com `<AppShell>`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "BLACK BELT 360",
  description: "Sistema operacional 360 da gravadora BLACK BELT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

Modify `app/page.test.tsx` — o teste agora renderiza só `Home`, que não inclui `AppShell` (o `role="main"` vem do layout). Ajustar o teste para não depender do main:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renderiza o nome do selo", () => {
    render(<Home />);
    expect(screen.getByText(/BLACK BELT/i)).toBeInTheDocument();
  });
});
```

Modify `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">BLACK <span className="text-accent">BELT</span> 360</h1>
      <p className="text-muted mt-2">Selecione um módulo no menu.</p>
    </div>
  );
}
```

- [ ] **Step 9: Verificar nos dois formatos**

Run: `npm run test` → todos PASS.
Run: `npm run dev` → no navegador largo aparece a sidebar; estreitando a janela (< 768px) a sidebar some e aparece a bottom nav. Módulos indisponíveis aparecem esmaecidos com "Em breve".
Expected: navegação responsiva funcionando.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: app shell responsivo com sidebar, bottom nav e os 6 módulos"
```

---

### Task 6: Tela Biblioteca/Estúdio (lista de projetos e faixas do mock)

**Files:**
- Create: `app/estudio/page.tsx`, `components/estudio/ProjetoCard.tsx`, `lib/labels.ts`, `lib/labels.test.ts`

**Interfaces:**
- Consumes: `mock/data.ts`, componentes do Task 4.
- Produces: `labelEstagio(e)`, `labelTipoProjeto(t)`; rota `/estudio` listando projetos → faixas com link para `/faixa/[id]`.

- [ ] **Step 1: Escrever teste dos rótulos**

Create `lib/labels.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { labelEstagio, labelTipoProjeto } from "./labels";

describe("labels", () => {
  it("traduz estágio do pipeline", () => {
    expect(labelEstagio("masterizacao")).toBe("Masterização");
    expect(labelEstagio("lancado")).toBe("Lançado");
  });
  it("traduz tipo de projeto", () => {
    expect(labelTipoProjeto("ep")).toBe("EP");
    expect(labelTipoProjeto("album")).toBe("Álbum");
  });
});
```

- [ ] **Step 2: Rodar teste (falha)**

Run: `npm run test -- lib/labels.test.ts`
Expected: FAIL.

- [ ] **Step 3: Criar os rótulos**

Create `lib/labels.ts`:

```ts
import type { EstagioPipeline, TipoProjeto, TipoVersao, Prioridade } from "@/types/domain";

export const labelEstagio = (e: EstagioPipeline): string =>
  ({ ideia: "Ideia", gravacao: "Gravação", mixagem: "Mixagem",
     masterizacao: "Masterização", aprovado: "Aprovado", lancado: "Lançado" }[e]);

export const labelTipoProjeto = (t: TipoProjeto): string =>
  ({ single: "Single", ep: "EP", album: "Álbum", feat: "Feat" }[t]);

export const labelTipoVersao = (t: TipoVersao): string =>
  ({ beat: "Beat", vocal: "Vocal", mix: "Mix", master: "Master" }[t]);

export const tonePrioridade = (p: Prioridade): "alta" | "media" | "baixa" => p;
```

- [ ] **Step 4: Rodar teste (passa)**

Run: `npm run test -- lib/labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Criar ProjetoCard**

Create `components/estudio/ProjetoCard.tsx`:

```tsx
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import { getFaixasDoProjeto } from "@/mock/data";
import type { Projeto } from "@/types/domain";

export function ProjetoCard({ projeto }: { projeto: Projeto }) {
  const faixas = getFaixasDoProjeto(projeto.id);
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{projeto.nome}</h3>
            <p className="text-xs text-muted">
              {labelTipoProjeto(projeto.tipo)} · {projeto.artistas.join(", ")}
            </p>
          </div>
          <Badge tone="accent">{labelEstagio(projeto.statusGeral)}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {faixas.map((f) => (
            <li key={f.id}>
              <Link href={`/faixa/${f.id}`}
                className="flex items-center justify-between py-2 text-sm hover:text-accent">
                <span>{f.titulo}</span>
                <span className="text-xs text-muted">{labelEstagio(f.estagio)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 6: Criar a página do Estúdio**

Create `app/estudio/page.tsx`:

```tsx
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { projetos } from "@/mock/data";

export default function EstudioPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Estúdio</h1>
      <p className="text-muted mb-6 text-sm">Projetos e faixas em produção.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetos.map((p) => <ProjetoCard key={p.id} projeto={p} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verificar**

Run: `npm run test` → PASS.
Run: `npm run dev` → `/estudio` mostra cards de projeto com faixas clicáveis. Layout em coluna no celular, grade no desktop.
Expected: tela do estúdio navegável.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: tela Estúdio com projetos e faixas do mock"
```

---

### Task 7: Waveform (wavesurfer.js) + contexto do player

**Files:**
- Create: `components/player/PlayerContext.tsx`, `components/player/Waveform.tsx`, `components/player/format.ts`, `components/player/format.test.ts`

**Interfaces:**
- Consumes: `wavesurfer.js`, `mock/data.ts`.
- Produces:
  - `formatTempo(seg): string` → "m:ss".
  - `PlayerProvider` + hook `usePlayer()` retornando `{ versaoAtual, tocar(versao), playing, toggle(), velocidade, setVelocidade(v), tempoAtual, duracao, seek(seg), registerWavesurfer(ws) }`.
  - `Waveform({ versaoId })` que monta o wavesurfer e o registra no contexto.

- [ ] **Step 1: Escrever teste do formatador**

Create `components/player/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatTempo } from "./format";

describe("formatTempo", () => {
  it("formata segundos como m:ss", () => {
    expect(formatTempo(0)).toBe("0:00");
    expect(formatTempo(38)).toBe("0:38");
    expect(formatTempo(72)).toBe("1:12");
    expect(formatTempo(605)).toBe("10:05");
  });
});
```

- [ ] **Step 2: Rodar teste (falha)**

Run: `npm run test -- components/player/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Criar o formatador**

Create `components/player/format.ts`:

```ts
export function formatTempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 4: Rodar teste (passa)**

Run: `npm run test -- components/player/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Criar o contexto do player**

Create `components/player/PlayerContext.tsx`:

```tsx
"use client";
import { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { VersaoFaixa } from "@/types/domain";

interface PlayerState {
  versaoAtual: VersaoFaixa | null;
  playing: boolean;
  velocidade: number;
  tempoAtual: number;
  duracao: number;
  tocar: (versao: VersaoFaixa) => void;
  toggle: () => void;
  setVelocidade: (v: number) => void;
  seek: (segundos: number) => void;
  registerWavesurfer: (ws: WaveSurfer | null) => void;
  _onTime: (t: number) => void;
  _onReady: (d: number) => void;
  _onPlayPause: (p: boolean) => void;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<VersaoFaixa | null>(null);
  const [playing, setPlaying] = useState(false);
  const [velocidade, setVel] = useState(1);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);

  const registerWavesurfer = useCallback((ws: WaveSurfer | null) => {
    wsRef.current = ws;
    if (ws) ws.setPlaybackRate(velocidade);
  }, [velocidade]);

  const tocar = useCallback((versao: VersaoFaixa) => {
    setVersaoAtual((atual) => (atual?.id === versao.id ? atual : versao));
  }, []);

  const toggle = useCallback(() => wsRef.current?.playPause(), []);
  const seek = useCallback((segundos: number) => {
    const ws = wsRef.current;
    if (ws && ws.getDuration() > 0) ws.setTime(segundos);
  }, []);
  const setVelocidade = useCallback((v: number) => {
    setVel(v);
    wsRef.current?.setPlaybackRate(v);
  }, []);

  const value = useMemo<PlayerState>(() => ({
    versaoAtual, playing, velocidade, tempoAtual, duracao,
    tocar, toggle, setVelocidade, seek, registerWavesurfer,
    _onTime: setTempoAtual,
    _onReady: (d) => setDuracao(d),
    _onPlayPause: setPlaying,
  }), [versaoAtual, playing, velocidade, tempoAtual, duracao,
       tocar, toggle, setVelocidade, seek, registerWavesurfer]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer deve estar dentro de <PlayerProvider>");
  return ctx;
}
```

- [ ] **Step 6: Criar o componente Waveform**

Create `components/player/Waveform.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { usePlayer } from "./PlayerContext";
import { getVersoesDaFaixa, versoes } from "@/mock/data";

export function Waveform({ versaoId, height = 96 }: { versaoId: string; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();
  const versao = versoes.find((v) => v.id === versaoId);

  useEffect(() => {
    if (!containerRef.current || !versao) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: versao.arquivoUrl,
      height,
      waveColor: "#3A3A40",
      progressColor: "#F5C518",
      cursorColor: "#F5F5F7",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });
    player.registerWavesurfer(ws);
    ws.on("ready", () => player._onReady(ws.getDuration()));
    ws.on("timeupdate", (t) => player._onTime(t));
    ws.on("play", () => player._onPlayPause(true));
    ws.on("pause", () => player._onPlayPause(false));
    ws.setPlaybackRate(player.velocidade);
    return () => {
      player.registerWavesurfer(null);
      ws.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoId]);

  if (!versao) return null;
  return <div ref={containerRef} className="w-full cursor-pointer" />;
}

export { getVersoesDaFaixa };
```

- [ ] **Step 7: Rodar testes de lógica**

Run: `npm run test`
Expected: PASS (o Waveform em si é verificado visualmente no Task 9; wavesurfer usa APIs de áudio que não rodam em jsdom).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: waveform (wavesurfer.js) + contexto do player"
```

---

### Task 8: PlayerBar fixa + controles (play, velocidade, versão)

**Files:**
- Create: `components/player/VersionSelector.tsx`, `components/player/SpeedControl.tsx`, `components/player/PlayerBar.tsx`
- Modify: `components/shell/AppShell.tsx` (montar o PlayerProvider + PlayerBar), `app/layout.tsx` (nada — já usa AppShell)

**Interfaces:**
- Consumes: `usePlayer()`, `formatTempo`, `labelTipoVersao`, `mock/data`.
- Produces: `PlayerBar` fixa acima da bottom nav, com play/pause, tempo, velocidade e seletor de versão. A waveform "fantasma" da barra reusa o estado; a waveform grande fica na tela de faixa (Task 9).

- [ ] **Step 1: Criar controle de velocidade**

Create `components/player/SpeedControl.tsx`:

```tsx
"use client";
import { usePlayer } from "./PlayerContext";

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5];

export function SpeedControl() {
  const { velocidade, setVelocidade } = usePlayer();
  const proxima = () => {
    const i = VELOCIDADES.indexOf(velocidade);
    setVelocidade(VELOCIDADES[(i + 1) % VELOCIDADES.length]);
  };
  return (
    <button onClick={proxima}
      className="text-xs font-mono text-muted hover:text-accent w-12 text-center"
      title="Velocidade de reprodução">
      {velocidade}×
    </button>
  );
}
```

- [ ] **Step 2: Criar seletor de versão**

Create `components/player/VersionSelector.tsx`:

```tsx
"use client";
import { usePlayer } from "./PlayerContext";
import { getVersoesDaFaixa } from "@/mock/data";
import { labelTipoVersao } from "@/lib/labels";

export function VersionSelector() {
  const { versaoAtual, tocar } = usePlayer();
  if (!versaoAtual) return null;
  const versoes = getVersoesDaFaixa(versaoAtual.faixaId);
  if (versoes.length < 2) return null;
  return (
    <select
      aria-label="Versão"
      value={versaoAtual.id}
      onChange={(e) => {
        const v = versoes.find((x) => x.id === e.target.value);
        if (v) tocar(v);
      }}
      className="bg-surface2 text-xs rounded-md px-2 py-1 border border-line"
    >
      {versoes.map((v) => (
        <option key={v.id} value={v.id}>{labelTipoVersao(v.tipo)} — {v.rotulo}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Criar a PlayerBar**

Create `components/player/PlayerBar.tsx`:

```tsx
"use client";
import { usePlayer } from "./PlayerContext";
import { formatTempo } from "./format";
import { SpeedControl } from "./SpeedControl";
import { VersionSelector } from "./VersionSelector";
import { faixas } from "@/mock/data";

export function PlayerBar() {
  const { versaoAtual, playing, toggle, tempoAtual, duracao } = usePlayer();
  if (!versaoAtual) return null;
  const faixa = faixas.find((f) => f.id === versaoAtual.faixaId);
  return (
    <div className="fixed bottom-12 md:bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:left-60">
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={toggle}
          className="h-10 w-10 shrink-0 rounded-full bg-accent text-accent-fg grid place-items-center text-lg"
          aria-label={playing ? "Pausar" : "Tocar"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{faixa?.titulo ?? "—"}</div>
          <div className="text-xs text-muted font-mono">
            {formatTempo(tempoAtual)} / {formatTempo(duracao)}
          </div>
        </div>
        <VersionSelector />
        <SpeedControl />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Montar Provider + PlayerBar no AppShell**

Modify `components/shell/AppShell.tsx`:

```tsx
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { PlayerProvider } from "@/components/player/PlayerContext";
import { PlayerBar } from "@/components/player/PlayerBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <div className="min-h-screen flex bg-bg text-fg">
        <Sidebar />
        <main role="main" className="flex-1 pb-40 md:pb-24">
          {children}
        </main>
        <PlayerBar />
        <BottomNav />
      </div>
    </PlayerProvider>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npm run test` → PASS.
Run: `npm run dev` → sem faixa selecionada a barra fica oculta (será acionada no Task 9). App continua carregando sem erro.
Expected: sem regressões.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: player bar fixa com play, velocidade e seletor de versão"
```

---

### Task 9: Tela de Faixa (waveform grande + comentários por timestamp)

**Files:**
- Create: `app/faixa/[id]/page.tsx`, `components/faixa/AutoPlay.tsx`, `components/faixa/ListaComentarios.tsx`, `components/faixa/CommentPin.tsx`

**Interfaces:**
- Consumes: `Waveform`, `usePlayer`, `mock/data`, `labels`, componentes UI.
- Produces: rota `/faixa/[id]` com a versão mais recente tocando, waveform grande, pinos de comentário sobre a timeline e lista de comentários clicáveis (clicar leva o player ao timestamp).

- [ ] **Step 1: Criar CommentPin (marca na timeline)**

Create `components/faixa/CommentPin.tsx`:

```tsx
"use client";
import { usePlayer } from "@/components/player/PlayerContext";
import type { Comentario } from "@/types/domain";

export function CommentPin({ comentario, duracao }: { comentario: Comentario; duracao: number }) {
  const { seek } = usePlayer();
  if (duracao <= 0) return null;
  const pct = (comentario.timestampSegundos / duracao) * 100;
  return (
    <button
      onClick={() => seek(comentario.timestampSegundos)}
      title={comentario.texto}
      aria-label={`Comentário aos ${comentario.timestampSegundos}s`}
      className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-accent border border-bg hover:scale-125 transition"
      style={{ left: `${pct}%` }}
    />
  );
}
```

- [ ] **Step 2: Criar ListaComentarios**

Create `components/faixa/ListaComentarios.tsx`:

```tsx
"use client";
import { usePlayer } from "@/components/player/PlayerContext";
import { formatTempo } from "@/components/player/format";
import { Badge } from "@/components/ui/Badge";
import { getUsuario } from "@/mock/data";
import type { Comentario } from "@/types/domain";

export function ListaComentarios({ comentarios }: { comentarios: Comentario[] }) {
  const { seek } = usePlayer();
  if (comentarios.length === 0) {
    return <p className="text-sm text-muted">Nenhum comentário nesta versão ainda.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {comentarios.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => seek(c.timestampSegundos)}
            className="w-full text-left rounded-md bg-surface border border-line p-3 hover:border-accent transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-accent">{formatTempo(c.timestampSegundos)}</span>
              <Badge tone={c.prioridade}>{c.prioridade}</Badge>
              <Badge tone="neutral">{c.categoria}</Badge>
              {c.resolvido && <Badge tone="aprovado">resolvido</Badge>}
            </div>
            <p className="text-sm">{c.texto}</p>
            <p className="text-xs text-muted mt-1">— {getUsuario(c.autor)?.nome ?? c.autor}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Criar AutoPlay (dispara a versão no player ao abrir a faixa)**

Create `components/faixa/AutoPlay.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import type { VersaoFaixa } from "@/types/domain";

export function AutoPlay({ versao }: { versao: VersaoFaixa }) {
  const { tocar } = usePlayer();
  useEffect(() => { tocar(versao); }, [versao, tocar]);
  return null;
}
```

- [ ] **Step 4: Criar a página da faixa**

Create `app/faixa/[id]/page.tsx`:

```tsx
"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { faixas, getVersoesDaFaixa, getComentariosDaVersao } from "@/mock/data";
import { Waveform } from "@/components/player/Waveform";
import { usePlayer } from "@/components/player/PlayerContext";
import { AutoPlay } from "@/components/faixa/AutoPlay";
import { ListaComentarios } from "@/components/faixa/ListaComentarios";
import { CommentPin } from "@/components/faixa/CommentPin";
import { labelEstagio } from "@/lib/labels";

export default function FaixaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const faixa = faixas.find((f) => f.id === id);
  if (!faixa) return notFound();

  const versoes = getVersoesDaFaixa(faixa.id);
  const { versaoAtual, duracao } = usePlayer();
  const versaoExibida = versaoAtual?.faixaId === faixa.id ? versaoAtual : versoes[versoes.length - 1];
  const comentarios = getComentariosDaVersao(versaoExibida.id);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <AutoPlay versao={versoes[versoes.length - 1]} />
      <h1 className="text-2xl font-bold">{faixa.titulo}</h1>
      <p className="text-muted text-sm mb-6">
        {faixa.genero} · {labelEstagio(faixa.estagio)} · {versaoExibida.rotulo}
      </p>

      <div className="relative mb-2">
        <div className="relative pt-3">
          {comentarios.map((c) => (
            <CommentPin key={c.id} comentario={c} duracao={duracao || versaoExibida.duracaoSegundos} />
          ))}
          <Waveform versaoId={versaoExibida.id} height={112} />
        </div>
      </div>
      <p className="text-xs text-muted mb-6">Clique na onda para navegar. Os pinos dourados são comentários.</p>

      <h2 className="text-lg font-semibold mb-3">Comentários</h2>
      <ListaComentarios comentarios={comentarios} />
    </div>
  );
}
```

- [ ] **Step 5: Verificar o fluxo completo**

Run: `npm run test` → PASS.
Run: `npm run dev`:
- Ir em `/estudio` → clicar numa faixa → abre `/faixa/f_1`.
- A waveform grande carrega; a PlayerBar aparece embaixo com o título.
- Play toca; velocidade muda com o botão `1×`.
- Clicar num comentário da lista move o player para o timestamp.
- Pinos dourados aparecem sobre a waveform.
Expected: fluxo Estúdio → Faixa → Player funcionando.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: tela de faixa com waveform, pinos e comentários por timestamp"
```

---

### Task 10: Home, polimento responsivo e verificação de build

**Files:**
- Modify: `app/page.tsx`
- Create: `app/estudio/loading.tsx` (opcional de UX — skeleton simples)

**Interfaces:**
- Consumes: tudo anterior.
- Produces: Home com atalhos; build de produção limpo.

- [ ] **Step 1: Home com atalhos para os módulos**

Modify `app/page.tsx`:

```tsx
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { navItems } from "@/components/shell/nav-items";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-1">
        BLACK <span className="text-accent">BELT</span> 360
      </h1>
      <p className="text-muted mb-6">Organização 360 do selo. Escolha um módulo.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {navItems.filter((n) => n.label !== "Home").map((n) => {
          const inner = (
            <Card className={n.disponivel ? "hover:border-accent transition" : "opacity-60"}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>{n.icon}</span>
                  {!n.disponivel && <Badge tone="neutral">Em breve</Badge>}
                </div>
                <h3 className="mt-3 font-semibold">{n.label}</h3>
              </CardBody>
            </Card>
          );
          return n.disponivel
            ? <Link key={n.href} href={n.href}>{inner}</Link>
            : <div key={n.href}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rodar o teste da Home**

Run: `npm run test -- app/page.test.tsx`
Expected: PASS (ainda encontra /BLACK BELT/).

- [ ] **Step 3: Conferir responsividade nos dois formatos**

Run: `npm run dev`
- Desktop: sidebar + grade de módulos + player à direita da sidebar.
- Mobile (janela < 768px ou devtools): bottom nav; player acima da bottom nav; grade vira coluna; waveform ocupa a largura.
Expected: sem overflow horizontal, tudo alcançável com o polegar no mobile.

- [ ] **Step 4: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros de tipo/lint. Se houver erro de `@next/next/no-img-element` no Avatar, ele já está com o eslint-disable; qualquer outro erro deve ser corrigido antes de seguir.

- [ ] **Step 5: Rodar toda a suíte**

Run: `npm run test`
Expected: todos os testes PASS.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: home com atalhos + polimento responsivo; build limpo"
```

---

## Notas para quem executa

- **Design quality:** ao construir/ajustar UI, carregar a skill **frontend-design** para elevar o acabamento (hierarquia, espaçamento, microinterações) sem fugir dos tokens.
- **Verificação visual:** passos marcados como "verificar no navegador" são a forma correta de validar o que é puramente visual — não force teste unitário de pixel.
- **Áudio mock:** a URL de áudio em `mock/data.ts` é externa (jsdelivr). Se o ambiente estiver offline, trocar por um arquivo local em `public/demo.mp3` e apontar `AUDIO_DEMO = "/demo.mp3"`.
- **Próximos módulos:** ao plugar o Supabase (Módulo 1), trocar só o conteúdo de `mock/data.ts` por chamadas reais — os tipos em `types/domain.ts` e todas as telas permanecem.
```
