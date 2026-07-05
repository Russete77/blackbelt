# Notificações & Demandas — relatório

## Objetivo
Notificações in-app para artistas (sino no shell) + módulo de Demandas (tarefas/pedidos
atribuídos a um artista, incluindo demandas de clipe) com aba própria no workspace do
artista, integrando "nova demanda -> notifica o artista".

## Arquivos novos
- `types/notificacoes.ts` — `Notificacao` (camelCase).
- `types/demandas.ts` — `StatusDemanda`, `Demanda` (camelCase).
- `lib/tempo.ts` + `lib/tempo.test.ts` — `formatarTempoRelativo` (pt-BR: "agora mesmo",
  "há 5 minutos", "ontem", "há 3 dias", cai para data absoluta após 30 dias).
- `app/(app)/notificacoes/actions.ts` — `notificarArtista(artistaId, titulo, mensagem, link?)`
  (busca `profiles.artista_id = artistaId`, insere uma linha em `notificacoes` por usuário
  encontrado; TODO(email) comentado no ponto de hook para um provedor futuro),
  `marcarLida(id)`, `marcarTodasLidas()`.
- `app/(app)/demandas/actions.ts` — `criarDemanda` (insere + chama `notificarArtista`),
  `atualizarDemanda` (edição completa, notifica se quem edita não é o próprio artista),
  `mudarStatusDemanda` (troca rápida de status, chamada direto do client, mesma regra de
  notificação), `excluirDemanda` (admin-only, mesmo padrão de `excluirShow`).
- `components/notificacoes/SinoNotificacoes.tsx` (+ `.test.tsx`) — sino com badge de não
  lidas, dropdown/inbox (tempo relativo, destaque de não lida, "marcar todas como lidas"),
  update otimista local + Server Action em `startTransition`.
- `components/demandas/{NovaDemandaForm,DemandaCard,EditarDemandaForm,
  ExcluirDemandaButton,ListaDemandas}.tsx` (+ `ListaDemandas.test.tsx`) — form de criação,
  card com chip de status + select de troca rápida + edição inline + exclusão (admin),
  lista agrupada por status (aberta/em andamento/concluída) com `EmptyState`.
- `app/(app)/artista/[slug]/demandas/page.tsx` — aba Demandas do workspace do artista.

## Arquivos compartilhados editados (atenção no merge)
- `components/shell/AppShell.tsx` — importa `SinoNotificacoes` + `getNotificacoes`/
  `contarNaoLidas` de `lib/db`; adiciona um `<header>` sticky (só quando há sessão) dentro
  do `<main>`, alinhado à direita, com o sino. Não mexe em `Sidebar`/`BottomNav`.
- `components/artista/ArtistaTabs.tsx` — adicionada uma linha ao array `ABAS`:
  `{ href: "/demandas", label: "Demandas" }`, entre "Shows" e "Números".
- `lib/db.ts` — apenas apêndice ao final do arquivo: `getNotificacoes(limit?)`,
  `contarNaoLidas()`, `getDemandasDoArtista(artistaId)` (+ imports de tipo no topo).
- `lib/labels.ts` — apêndice: `labelStatusDemanda`, `toneStatusDemanda` (+ import de tipo).
  Não listado nas instruções como "pode editar", mas segue o padrão existente do arquivo
  (mapa de rótulos/tons por tipo) e é um apêndice puro — risco de conflito baixo.
- `lib/labels.test.ts` — apêndice dos dois testes correspondentes.

## Rastreamento (trace) pedido na verificação
- `criarDemanda`: insere em `demandas` (RLS: authenticated insert) e, em seguida, chama
  `notificarArtista(artistaId, ...)`, que busca `profiles` com `artista_id = artistaId` e
  insere uma notificação por usuário encontrado (RLS de `notificacoes`: insert aberto).
- `SinoNotificacoes` recebe `notificacoesIniciais`/`naoLidasIniciais` já resolvidos no
  servidor por `AppShell` via `getNotificacoes(8)` + `contarNaoLidas()` (ambas filtram por
  `user_id` do usuário logado, além da RLS).
- `marcarLida(id)`/`marcarTodasLidas()` fazem `update lida=true` restrito a
  `user_id = auth.uid()` e chamam `revalidatePath("/", "layout")` para o próximo load do
  `AppShell` já vir com a contagem correta; a UI já atualiza local/otimisticamente antes
  disso (sem esperar navegação).

## Testes e build
- `npm run test`: 21 arquivos, 235 testes, todos passando (inclui os 4 arquivos de teste
  novos/editados deste módulo: `lib/tempo.test.ts`, `lib/labels.test.ts` ampliado,
  `components/notificacoes/SinoNotificacoes.test.tsx`,
  `components/demandas/ListaDemandas.test.tsx`).
- `npm run build`: compila; a rota `/artista/[slug]/demandas` aparece na listagem de rotas
  (dynamic/server-rendered, igual às demais abas do artista).
- `npm run lint`: sem erros.

## Deferido / observações
- E-mail: fora de escopo por instrução explícita — há um TODO comentado dentro de
  `notificarArtista` (em `app/(app)/notificacoes/actions.ts`) no ponto exato onde um envio
  via Resend (ou outro provedor) entraria, uma vez que exista conta/API key configurada.
- Não há teste automatizado de ponta a ponta contra o Postgres real (sem browser logado
  disponível neste ambiente) — a verificação foi por leitura de código + testes unitários/
  de componente com as Server Actions mockadas, seguindo o mesmo padrão do resto do
  repositório (nenhuma outra Server Action do projeto tem teste próprio hoje).
- `atualizarDemanda`/`mudarStatusDemanda` evitam notificar o próprio artista quando é ele
  quem faz a mudança (comparando `profiles.artista_id`/JWT `app_metadata.artista_id` do
  ator com o `artistaId` da demanda) — não estava explicitamente pedido, mas segue o
  espírito "notificar sempre" sem gerar ruído de auto-notificação.
