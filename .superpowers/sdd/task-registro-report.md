# Registro & Direitos — relatório de implementação

## Escopo entregue

Módulo completo "Registro" (obra / fonograma / videograma por faixa), per PRD §14.

### Dados (lib/db.ts)
- `getRegistrosDaFaixa(faixaId)` → `{ obra, fonograma, videograma }`, cada um `null` se a linha ainda não existe, ou o shape tipado (jsonb parseado com defaults seguros).
- `getStatusRegistros()` → todas as faixas visíveis (RLS), com `artistaId`/`artistaNome` (resolvido via `projeto_artistas`, 1º artista por projeto — mesmo critério de `getFaixasComYoutube`) e os 3 booleans `obraOk`/`fonogramaOk`/`videogramaOk` ("minimamente preenchido").
- Novo `lib/registro.ts`: parse/normalização do jsonb livre (degrada pra vazio em lixo/JSON quebrado, mesmo padrão de `lib/shows.ts` pros riders) + funções de completude (`obraCompleta`, `fonogramaCompleta`, `videogramaCompleta`). Testado em `lib/registro.test.ts` (16 casos).
- Novo `types/registro.ts`: `DadosObra`, `DadosFonograma`, `DadosVideograma`, `RegistrosDaFaixa`, `StatusRegistroFaixa` — fora de `types/domain.ts` para não conflitar com trabalho paralelo (mesmo padrão de `types/shows.ts`).

### Server Actions (app/(app)/registro/actions.ts — arquivo novo, isolado)
- `salvarObra`, `salvarFonograma` (isrc + dados), `salvarVideograma`.
- Upsert por "find-or-create": sem constraint única em `faixa_id` no schema aplicado, então cada Action busca a linha existente por `faixa_id` e faz `update`; sem linha, faz `insert`. Roda com o client de sessão do usuário (RLS via `app.pode_ver_faixa`), nunca service-role.
- Validação leve: obra exige título exato + nome em cada autor; fonograma exige título; videograma sem exigência forte (campos livres).

### UI
- `nav-items.ts`: "Registro" → `disponivel: true` (já tinha `href: "/registro"`). Teste atualizado (`nav-items.test.ts`) para refletir os 6 módulos disponíveis; a barra mobile (5 slots) continua passando sem alteração de lógica (Registro é o 6º disponível na ordem do array, então não entra nos 5 slots — comportamento existente, só documentado no teste).
- `app/(app)/registro/page.tsx`: lista de faixas com 3 chips de status (Obra/Fonograma/Videograma), filtro por artista via querystring (`?artista=`, mesmo padrão de `/shows`), link pro detalhe.
- `app/(app)/registro/[faixaId]/page.tsx`: 3 seções colapsáveis (`<details>` nativo, sem JS) — Obra, Fonograma, Videograma — cada uma com seu formulário client, prefill de `letra` a partir de `faixas.letra` quando o registro da obra ainda não tem letra própria salva.
- Componentes novos em `components/registro/`: `ObraForm`, `FonogramaForm`, `VideogramaForm` (cada um com indicador "Completo/Incompleto" ao vivo, conforme o usuário digita), `ListaLinhasEditavel` (generaliza `components/shows/ListaEditavel.tsx` pra linhas com múltiplos campos — autores, intérpretes, músicos, cue sheet), `SecaoRegistro` (wrapper colapsável), `StatusChip`, `FiltroArtistaRegistro`, `ListaStatusRegistro`.
- Percentuais da obra: mostrados como referência de leitura (splits de `faixa_artistas` via `getSplitsDaFaixa`, já existente), com link "Editar splits" pra `/faixa/[id]` (onde `SplitsFaixa.tsx` já vive) — não duplica a UI de edição de split.

## Verificação
- `npm run test`: 198 testes, 17 arquivos, todos passando (inclui os 16 novos casos de `lib/registro.test.ts`).
- `npm run build`: compila limpo; rotas `/registro` e `/registro/[faixaId]` aparecem na tabela de rotas (ƒ, server-rendered).
- `npm run lint`: sem erros.
- Sem browser logado disponível — tracei manualmente o fluxo: `salvarObra`/`salvarFonograma`/`salvarVideograma` fazem `select ... eq(faixa_id) maybeSingle()` seguido de `update` (achou) ou `insert` (não achou) na tabela correta; `getStatusRegistros`/`getRegistrosDaFaixa` leem das mesmas 3 tabelas por `faixa_id`; os forms serializam o estado React em JSON num hidden input `dados` (mesmo padrão de `SplitsFaixa`/`ShowForm`) e o parser em `lib/registro.ts` desserializa com defaults seguros.

## Arquivos compartilhados tocados (para merge limpo)
- `components/shell/nav-items.ts` — 1 linha (`disponivel: false` → `true` em Registro).
- `components/shell/nav-items.test.ts` — 1 asserção atualizada (lista de disponíveis).
- `lib/db.ts` — só adições no fim do arquivo + 2 imports novos no topo; nenhuma função existente foi alterada.

## Deferido / observações
- Sem migração nova: o schema `registros_obra/fonograma/videograma` já estava aplicado (`supabase/migrations/20260705020739_core_schema.sql` + RLS em `20260705030000_authz_membership.sql`); não havia constraint única em `faixa_id`, por isso o upsert é "find-or-create" na aplicação (conforme pedido), não `ON CONFLICT`.
- Validação de CPF/CNPJ é só texto livre (sem checagem de dígito verificador) — fora do escopo descrito ("validar levemente").
- Não testei em navegador logado (sem sessão disponível neste ambiente); a verificação foi por leitura de código + testes unitários + build.
