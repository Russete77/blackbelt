# Task: Redesign /estudio (selo) as a production Kanban

## Goal
Estúdio was showing every project via `getTodosProjetos()`, including
footprint-only imports (Catálogo, Canal YouTube, Aparições/Footprint) that
already live in each artist's Feats tab — duplication and clutter. Redesign
per PRD: Estúdio shows only internal studio production, as a Kanban grouped
by pipeline stage.

## Changes

### lib/db.ts (appended, nothing existing modified)
Added:
- `FaixaEstudioComArtista` interface — `{ faixa: Faixa; artistaNome: string }`.
- `getFaixasEstudioComArtista(): Promise<FaixaEstudioComArtista[]>` — reuses
  `getTodosProjetos()` + `getFaixasDosProjetos()` (existing batch query) +
  the existing pure `filtrarProjetosEstudio()` to drop 100%-footprint
  projects, then within the remaining projects keeps only faixas with
  `origem !== 'footprint'`, pairing each with `projeto.artistas[0] ?? "Selo"`.

No RLS/service-role concerns: uses the same `createClient()` (server-session)
path as every other read in `lib/db.ts`.

### components/estudio/EstudioKanban.tsx (new)
- `ORDEM_ESTAGIOS`: fixed column order — ideia, gravacao, mixagem,
  masterizacao, aprovado, lancado (matches `EstagioPipeline` / `labelEstagio`).
- `agruparPorEstagio(faixas)` — pure grouping function (exported, unit
  tested), returns a `Record<EstagioPipeline, FaixaEstudioComArtista[]>`.
- `EstudioKanban` — renders 6 columns horizontally
  (`overflow-x-auto`, scrollbar hidden via `[scrollbar-width:none]
  [&::-webkit-scrollbar]:hidden`, `-mx-4 px-4` bleed on mobile so it doesn't
  fight the page's own padding). Each column: header with stage label +
  count badge (font-mono), and compact cards (small `Cover`, título
  line-clamped via `truncate`, artist name) linking to `/faixa/[id]`. Empty
  columns show a centered "—".

### app/(app)/estudio/page.tsx (rewritten)
- Replaced `getTodosProjetos`/`getFaixasDosProjetos`/`getViewsPorFaixa` +
  `ProjetoCard` grid with a single `getFaixasEstudioComArtista()` call
  rendered through `EstudioKanban`.
- Kept an entry point at the top: "Ver artistas" link to `/artistas` (studio
  workspace already handles creation per-artist).
- `EmptyState` (Disc3 icon) when there are zero studio faixas.

### components/estudio/EstudioKanban.test.tsx (new)
- `agruparPorEstagio`: creates all 6 columns even when empty; groups faixas
  into the right stage, preserving order.
- `EstudioKanban`: renders all 6 stage labels + counts; renders a faixa card
  with title, artist name, and correct `/faixa/[id]` link.

### Untouched
- `components/estudio/ProjetoCard.tsx` / `FootprintFaixaCard.tsx` — still
  used by `app/(app)/artista/[slug]/page.tsx` and `.../feats/page.tsx`, left
  as-is.
- `filtrarProjetosEstudio`, `getTodosProjetos`, `getFaixasDosProjetos`,
  `getViewsPorFaixa` — unchanged, only reused.

## Verification
- `npm run test` → 19 test files, 220 tests passed (includes the 4 new
  EstudioKanban tests).
- `npm run build` → compiled successfully, TypeScript clean, `/estudio`
  listed as a dynamic (ƒ) route among all other routes with no errors.
- `npx eslint` on the 4 touched/new files → no warnings/errors.
- Manual trace (no logged-in browser available in this environment):
  footprint exclusion happens twice — once via `filtrarProjetosEstudio`
  (drops projects that are 100% footprint) and once via the per-faixa
  `origem !== 'footprint'` filter (drops footprint faixas inside mixed
  projects) — so no footprint track can reach the Kanban. Faixas are grouped
  into exactly 6 columns in PRD pipeline order; each card shows cover
  thumbnail, title, and artist name, and links to `/faixa/[id]`.

## Deferred / not done
- No visual browser screenshot was taken (no logged-in session in this
  sandboxed worktree) — verified via build/tests/lint only, as instructed.
- Column max-height / internal scroll for very long stage lists was not
  added (not required by the task); columns currently grow with content.
