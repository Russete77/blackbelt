# Task report — Módulo SHOWS (com riders)

## O que foi construído

Agenda de shows real e funcional para o selo e por artista, com CRUD completo e
riders técnico/de camarim estruturados (jsonb), tudo via sessão do servidor + RLS
(nunca service-role), pt-BR, dark premium, token classes, lucide, mobile-friendly.

### Páginas
- `app/(app)/shows/page.tsx` — agenda do selo: próximos shows agrupados por mês
  ("Julho de 2026"...), grupo "Data a definir", seção "Anteriores" (esmaecida,
  mais recente primeiro). Filtro por artista via `?artista=` (server-side, URL
  compartilhável) e botão "Novo show".
- `app/(app)/shows/novo/page.tsx` — criação; aceita `?artista=<id>` para chegar
  pré-vinculado (usado pela aba do artista).
- `app/(app)/shows/[id]/page.tsx` — detalhe: artista + badge de status, data
  formatada, local, cachê (font-mono BRL), riders exibidos em cards (tabela de
  canais com `overflow-x-auto`), botões Editar e Apagar (apagar só para admin).
- `app/(app)/shows/[id]/editar/page.tsx` — mesmo `ShowForm` em modo edição.
- `app/(app)/artista/[slug]/shows/page.tsx` — aba preenchida com a mesma agenda
  (sem repetir o nome do artista nos cards) e "Novo show" pré-vinculado.
- Nav: item "Shows" habilitado (`disponivel: true`, href `/shows`).

### Dados / queries (`lib/db.ts`)
- `getShows()`, `getShowsDoArtista(artistaId)`, `getShow(id)` — todas com join
  `artistas(nome)`, ordenadas por `data` ascendente (nulls por último), retornando
  `ShowDetalhado` camelCase: `id, artistaId, artistaNome, data, local, cache,
  status, riderTecnico, riderCamarim`.
- `mapShow` normaliza os jsonb com parsers tolerantes; rider sem nenhum conteúdo
  vira `null` (a UI mostra "não preenchido").
- Obs.: `getShowsDoArtista` mudou o retorno de `Show[]` (types/domain) para
  `ShowDetalhado[]` (types/shows) — único consumidor era a aba do artista,
  reescrita nesta task. `types/domain.ts` NÃO foi tocado.

### Shape do JSON dos riders (colunas `rider_tecnico` / `rider_camarim`)
```jsonc
// rider_tecnico
{
  "pa": "line array, mínimo 10 kW",
  "monitores": "4 monitores de chão + 2 in-ears",
  "backline": ["Bateria completa", "Amp de guitarra"],
  "inputs": [{ "canal": "1", "fonte": "Kick", "microfone": "Beta 52" }],
  "observacoes": "passagem de som às 16h"
}
// rider_camarim
{
  "pessoas": 6,
  "alimentacao": ["Frutas frescas", "Refeição quente p/ 6"],
  "bebidas": ["Água sem gás (12)"],
  "itens": ["Toalhas pretas (8)", "Espelho"],
  "observacoes": "camarim exclusivo"
}
```
Parsers (`parseRiderTecnico/parseRiderCamarim` em `lib/shows.ts`) nunca confiam
no jsonb: descartam tipos errados, linhas vazias, e `pessoas` vira inteiro
positivo ou `null`. `riderTecnicoDeJson/riderCamarimDeJson` (JSON string →
objeto) degradam para rider vazio em JSON inválido, sem derrubar a action.

### CRUD + admin-delete (`app/(app)/shows/actions.ts` — arquivo NOVO)
- `criarShow` / `editarShow`: validam artista, data (obrigatória, convertida de
  `datetime-local` para ISO interpretando America/Sao_Paulo — Brasil sem DST
  desde 2019, offset fixo -03:00), local (obrigatório), cachê (número ≥ 0,
  aceita vírgula) e status (normalizado para
  negociando/confirmado/realizado/cancelado). Riders chegam como JSON em hidden
  inputs (estado React do form) e são salvos como objeto no jsonb (ou `null` se
  vazios). Sucesso → `revalidatePath` + `redirect` para `/shows/[id]`.
- `excluirShow`: checa `user.app_metadata.role === "admin"` no servidor para
  mensagem amigável ("Só o admin pode apagar shows."); a RLS (`del_admin`) é a
  garantia real — delete com 0 linhas também devolve a mensagem. Botão de apagar
  só renderiza para admin e tem confirmação em dois passos.
- Todas as actions usam `lib/supabase/server.ts` (sessão + RLS).

### Componentes (`components/shows/`)
`ShowCard` (bloco de data "folhinha", badge de status, cachê mono),
`AgendaShows` (agrupamento; helpers puros `particionarAgenda`/`agruparPorMes`
em lib/shows.ts com clock injetável — exigência da regra react-hooks/purity),
`ShowForm` (criar/editar; seções Dados do show / Rider técnico / Rider de
camarim), `RiderTecnicoFields` + `RiderCamarimFields` + `ListaEditavel`
(adicionar/remover linhas, alvos de toque h-11), `RiderViews` (leitura),
`FiltroArtista`, `NovoShowLink`, `ExcluirShowButton`.

### Utilitários (`lib/shows.ts`, novo) + testes (`lib/shows.test.ts`, novo)
Status (labels/tones pt-BR), datas em America/Sao_Paulo
(`formatarDataShow`, `partesDataShow`, `chaveMesShow`, `labelMesShow`,
`isoParaInputLocal` ↔ `inputLocalParaIso`), `formatarCache` (BRL), parsers de
rider e partição da agenda. 100% puros, cobertos por testes.

## Arquivos

Novos: `types/shows.ts`, `lib/shows.ts`, `lib/shows.test.ts`,
`app/(app)/shows/{actions.ts,page.tsx,novo/page.tsx,[id]/page.tsx,[id]/editar/page.tsx}`,
`components/shows/{ShowCard,AgendaShows,ShowForm,RiderTecnicoFields,RiderCamarimFields,ListaEditavel,RiderViews,FiltroArtista,NovoShowLink,ExcluirShowButton}.tsx`.

Compartilhados editados (atenção no merge):
- `lib/db.ts` — imports + `ShowRow`/`mapShow` + bloco de queries de shows.
- `components/shell/nav-items.ts` — 1 linha (`Shows` → `disponivel: true`).
- `components/shell/nav-items.test.ts` — expectativa de disponíveis inclui "Shows".
- `app/(app)/artista/[slug]/shows/page.tsx` — reescrito (era stub de lista).
- `app/(app)/actions.ts` — NÃO tocado. `types/domain.ts` — NÃO tocado.

## Verificação
- `npm run test`: 8 arquivos, 33 testes, todos verdes.
- `npm run build`: compila (Turbopack), rotas `/shows`, `/shows/novo`,
  `/shows/[id]`, `/shows/[id]/editar` geradas como dinâmicas.
- `eslint` nas pastas novas + arquivos tocados: limpo.

## Deferido / notas
- Google Calendar sync fora de escopo (pedido): há `TODO(integração)` comentado
  em `criarShow`/`editarShow` marcando o ponto de hook.
- Visão de calendário em grade não foi feita — a agenda é lista agrupada por
  mês (permitido pela task); a grade pode ser evolução futura.
- `data`/`local` são nullable no banco, mas o form os exige; linhas legadas sem
  data caem no grupo "Data a definir".
- Não testei contra o Supabase real (sem sessão de browser nesta task); o fluxo
  segue exatamente os padrões já em produção em `app/(app)/actions.ts`.
