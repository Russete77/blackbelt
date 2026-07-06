# Resumo do artista + clareza (tooltips) — relatório

## Objetivo
Fazer o artista (não técnico) entender de cara "quanto rendi, como meus sons estão, o que
preciso fazer" ao abrir sua pasta, e tirar a dúvida de termos do produto (recebimento,
estimativa, split) sem sair da tela.

## Arquivos novos
- `components/ui/InfoTip.tsx` — ícone `Info` (lucide) com balão de explicação em pt-BR
  simples. Acessível: `aria-describedby` aponta pro balão (`role="tooltip"`), abre no
  hover (`onMouseEnter/Leave`) E no foco por teclado (`onFocus/Blur`), e no toque no
  celular (`onClick` alterna aberto/fechado, já que touch não dispara hover). Token
  classes só (`border-line`, `bg-surface2`, `text-fg`, `focus-visible:ring-accent`).
- `components/artista/ResumoArtista.tsx` — server component (async), strip de 4 cards:
  "Seu recebimento" (com caption "estimativa · ajusta nas taxas" e InfoTip), "Streams",
  "Demandas pendentes" (link pra aba Demandas) e "Novidades" (contagem de não lidas ou
  "Tudo em dia"). Grid `grid-cols-2 sm:grid-cols-4`, sem overflow horizontal no mobile.

## Arquivos compartilhados editados (atenção no merge)
- `app/(app)/artista/[slug]/layout.tsx` — importa e renderiza `<ResumoArtista artistaId
  slug>` entre o header (foto+nome) e `<ArtistaTabs>`, visível em toda aba.
- `app/(app)/artista/[slug]/numeros/page.tsx` — StatTile "Recebimento do artista" ganhou
  `info="O que fica pra você: a receita da faixa vezes o seu %."`.
- `components/ui/StatTile.tsx` — novo prop opcional `info?: string`; quando presente,
  renderiza `<InfoTip>` ao lado do label. Retrocompatível (prop opcional, nenhum uso
  existente quebra).
- `components/analytics/TabelaFaixasSplit.tsx` — headers "Receita da faixa", "% do
  artista" e "Recebimento" ganharam InfoTip com o texto pedido (estimativa/split/
  recebimento). `lib/db.ts` NÃO foi alterado — as funções já existiam com a assinatura
  necessária (`getFaixasDoArtistaComNumeros`, `getMetricasDoArtista`,
  `getDemandasDoArtista`, `contarNaoLidas`).

## Consistência (o ponto crítico do pedido)
`ResumoArtista` usa **as mesmas fontes e mesma sequência de cálculo** que
`numeros/page.tsx`:
- Streams: `getMetricasDoArtista(artistaId)` → `totaisMetricas(...).streams` (idêntico
  ao StatTile "Streams" de Números).
- Recebimento: `getFaixasDoArtistaComNumeros(artistaId, cotacao.brl)` →
  `estimarReceitaPorFaixa(...)` com `taxasDosParams({})` (as taxas padrão — o que
  Números mostra sem filtro em `?ryt=&rsp=&rdz=`) → soma de
  `recebimentoArtista(estimativa.total, f.percentual)` por faixa. Mesma fórmula, mesma
  ordem de operações que o `reduce` em `numeros/page.tsx`.
- Ambos convertidos pela mesma cotação do dia (`cotacaoDolar()`), mesmo
  `formatarValorDual`.

## Verificação
- `npm run test`: 26 arquivos, 258 testes, todos passando (nenhum teste novo quebrou;
  nenhum teste de InfoTip/ResumoArtista foi escrito — ver "Deferido" abaixo).
- `npm run build`: compila limpo (Next 16 Turbopack), TypeScript ok, todas as rotas
  geradas incluindo `/artista/[slug]` e `/artista/[slug]/numeros`.
- `npx eslint` nos arquivos tocados: sem erros/avisos.
- Revisão manual do fluxo de dados (sem browser logado): tracei
  `ResumoArtista` → mesmas funções de `lib/db.ts`/`lib/metricas.ts`/`lib/estimativa.ts`/
  `lib/cambio.ts` que `numeros/page.tsx` usa, com os mesmos parâmetros — os dois números
  ("Seu recebimento" e "Streams") devem bater exatamente entre resumo e aba Números.

## Deferido / incerto
- Não escrevi teste automatizado dedicado para `InfoTip.tsx` nem `ResumoArtista.tsx`
  (o repo não tem Supabase mockado facilmente acessível para testar um server component
  async que chama 4 funções de banco em paralelo sem factory de mock existente — segui o
  padrão do repo de não adicionar mocks novos fora do escopo pedido). Build+lint+tipos
  cobrem a integração; a lógica pura de soma já é coberta indiretamente pelos testes
  existentes de `lib/metricas.ts`/`lib/estimativa.ts`.
- Não testei em browser logado (sem sessão) — comportamento de RLS
  (`getDemandasDoArtista`, `contarNaoLidas`) não foi observado ao vivo, só por leitura de
  código (mesmas queries já usadas em outras telas do produto).
