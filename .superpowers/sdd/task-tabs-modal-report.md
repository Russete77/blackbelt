# Abas vazias (Lançamentos/Clipes/Documentos) + padrão Modal — relatório

## Objetivo
Preencher as três abas do workspace do artista que ainda eram placeholder vazio
(Lançamentos, Clipes, Documentos) com dados reais e estabelecer um padrão consistente de
Modal para criar/editar (em vez de páginas inteiras) — reutilizável para trabalho futuro.

## Arquivos novos (infra compartilhada)
- `components/ui/Modal.tsx` (+ `Modal.test.tsx`) — dialog acessível reutilizável: Esc fecha,
  clique no backdrop fecha, focus trap (Tab/Shift+Tab preso no painel), devolve o foco ao
  elemento que abriu o modal ao fechar, `role="dialog" aria-modal`, portal pro `<body>`.
  Bottom-sheet em telas pequenas (`animate-sheet-up`), dialog centralizado em md+
  (`animate-fade-in-up`). `prefers-reduced-motion` já é tratado globalmente em
  `app/globals.css` (zera toda `animation-duration`), então não precisou de `motion-safe:`.
  Padrão de uso: cada módulo tem um `<X>FormModal` client component com uma render-prop
  `trigger: (abrir) => ReactNode` — o mesmo componente serve para criar (sem entidade) e
  editar (com entidade pré-preenchida).
- `supabase/migrations/20260705170000_lancamentos_clipes_documentos.sql` — cria as 3
  tabelas (`lancamentos`, `clipes`, `documentos`) exatamente conforme o schema informado,
  RLS (authenticated select/insert/update, admin delete). O schema já estava "aplicado"
  externamente; esta migration foi adicionada por completude/registro no repo (idempotente,
  `create table if not exists`).
- `tailwind.config.ts` — apêndice de 2 keyframes/animations (`fade-in`, `sheet-up`) usados
  só pelo Modal.
- `components/capa/CapaUploader.tsx` — apêndice: novo `TipoCapa = "lancamento"` no record
  `ALVOS` (tabela `lancamentos`, coluna `capa_url`). Só funciona em modo edição (precisa de
  `id` já existente); no formulário de criação a capa fica disponível só depois de salvar.

## Aba Lançamentos (planejamento de release)
- `types/lancamentos.ts` — `Lancamento`, `TipoLancamento`, `StatusLancamento`, `ChecklistItem`.
- `app/(app)/artista/[slug]/lancamentos/actions.ts` — `criarLancamento`/`atualizarLancamento`/
  `excluirLancamento` (admin-only delete via RLS + checagem de `app_metadata.role`).
- `components/lancamentos/{LancamentoFormModal,LancamentoCard,ListaLancamentos,
  ExcluirLancamentoButton,NovoLancamentoButton}.tsx` (+ `ListaLancamentos.test.tsx`).
  Form: título, tipo (single/EP/álbum), data, ISRC, faixa vinculada (select de
  `getFaixasDoArtista`), plataformas (toggle multi-seleção), capa (`CapaUploader`, só em
  edição), checklist D-30→D0 editável via `ListaLinhasEditavel` (checkbox + texto por linha,
  com template padrão pré-carregado em lançamentos novos).
- `app/(app)/artista/[slug]/lancamentos/page.tsx` — reescrita, lista + botão "Novo lançamento".

**Nome de função com colisão:** `getLancamentosDoArtista` já existia em `lib/db.ts` retornando
`Faixa[]` (faixas com `estagio='lancado'`, usado pela página antiga). Como a regra é
"ADD only" (nunca renomear/remover função existente), a nova função para a tabela
`lancamentos` recebeu o nome `getLancamentosPlanejadosDoArtista`. A função antiga foi
mantida intacta em `lib/db.ts` (ela só era usada pela página que foi reescrita, então ficou
sem uso após esta mudança, mas não foi tocada).

## Aba Clipes (pipeline de videoclipe)
- `types/clipes.ts` — `Clipe`, `StatusClipe` (reusa `CueSheetItem` de `types/registro.ts`).
- `app/(app)/artista/[slug]/clipes/actions.ts` — `criarClipe`/`atualizarClipe`/`excluirClipe`;
  normaliza `video_url` para um id de 11 chars via `extrairYoutubeVideoId` (lib/youtube.ts)
  quando possível, sem travar o cadastro se o link não for reconhecido.
- `components/clipes/{ClipeFormModal,ClipeCard,ListaClipes,ExcluirClipeButton,
  NovoClipeButton}.tsx` (+ `ListaClipes.test.tsx`). Form: título, faixa vinculada, status
  (ideia/pré-produção/gravação/pós-produção/lançado), datas de gravação/estreia, link do
  YouTube, diretor, demandas (lista dinâmica via `ListaEditavel`), cue sheet
  (trecho/duração/titular via `ListaLinhasEditavel`, mesmo padrão do `VideogramaForm` de
  Registro & Direitos). Card exibe embed do YouTube quando o vídeo foi normalizado.
- `app/(app)/artista/[slug]/clipes/page.tsx` — reescrita, lista + botão "Novo clipe".

## Aba Documentos (contratos/splits/outros)
- `types/documentos.ts` — `Documento`, `TipoDocumento`.
- `app/(app)/artista/[slug]/documentos/actions.ts` — `criarDocumento`/`atualizarDocumento`/
  `excluirDocumento` (só grava metadados; o upload em si é client-side, ver abaixo).
- `components/documentos/{DocumentoFormModal,DocumentoCard,ListaDocumentos,
  ExcluirDocumentoButton,NovoDocumentoButton}.tsx` (+ `ListaDocumentos.test.tsx`). Form:
  título, tipo (contrato/split/outro), upload de arquivo, observação.
- `app/(app)/artista/[slug]/documentos/page.tsx` — reescrita, lista + botão "Novo documento".

**Storage (deferido/nota):** não existe bucket dedicado a documentos genéricos (só `audio` e
`covers`). Conforme instruído ("use `covers` para agora, não bloquear"), o upload reusa o
bucket `covers` sob `documentos/{artistaId}/{uuid}.{ext}`, feito diretamente do browser
(client com sessão do usuário — mesmo padrão de `CapaUploader`/`UploadVersao`), e a Server
Action só grava `arquivo_path`. Sem arquivo, o documento fica só com a observação (link/nota).

## lib/db.ts (apêndice)
`getLancamentosPlanejadosDoArtista`, `getClipesDoArtista`, `getDocumentosDoArtista` +
mapeadores (`mapLancamento`, `mapClipe`, `mapDocumento`) e as interfaces de linha
correspondentes, seguindo o padrão exato de `getDemandasDoArtista`/`mapDemanda` já existente
no arquivo. Só imports de tipo novos no topo (`Lancamento`, `Clipe`, `Documento`).

## lib/labels.ts (apêndice)
`labelTipoLancamento`, `labelStatusLancamento`, `toneStatusLancamento`, `labelStatusClipe`,
`toneStatusClipe`, `labelTipoDocumento` — mesmo padrão de `labelStatusDemanda`/`toneStatusDemanda`.

## Rastreamento (trace) pedido na verificação
- Cada aba busca as linhas do artista (`.eq("artista_id", artista.id)`) e passa para uma
  lista client-side; cada card injeta o mesmo `<X>FormModal` como trigger de edição
  (pré-preenchido com a entidade) e um botão de exclusão (admin-only, checado tanto no
  client via `app_metadata.role` quanto na RLS — `..._del` policies usam `app.is_admin()`).
- Criar/editar em todas as 3 abas passa pelo mesmo par (`criar<X>`/`atualizar<X>`) que insere/
  atualiza diretamente na tabela via client de servidor com sessão do usuário
  (`lib/supabase/server.ts`, cookies) — nunca service-role — e chama `revalidatePath(caminho)`
  no sucesso; o modal fecha sozinho (`useActionState` + `setAberto(false)` quando
  `status === "ok"`).
- **Bug pego e corrigido durante a implementação:** a primeira versão tentava passar a
  render-prop `trigger` de um Server Component (`page.tsx`) direto para o `*FormModal`
  (client) — funções não são serializáveis pela fronteira Server→Client. Corrigido criando
  um wrapper client-only por módulo (`NovoLancamentoButton`/`NovoClipeButton`/
  `NovoDocumentoButton`) que só recebe dados simples (string/array) da página e monta a
  função de trigger já do lado do cliente.

## Testes e build
- `npm run test`: 26 arquivos, 258 testes, todos passando (6 novos arquivos de teste:
  `Modal.test.tsx`, `ListaLancamentos.test.tsx`, `ListaClipes.test.tsx`,
  `ListaDocumentos.test.tsx`, além dos preexistentes).
- `npm run build`: compila limpo (Turbopack + TypeScript), as 3 rotas de aba aparecem
  normalmente na listagem (dynamic/server-rendered, igual às demais abas do artista).
- `npm run lint`: sem erros — corrigido 1 erro (`react-hooks/set-state-in-effect`) no Modal
  durante o desenvolvimento (removido um estado `montado` desnecessário: `open` só vira
  `true` a partir de interação do usuário no cliente, nunca durante o SSR, então não havia
  risco real de acessar `document` antes da hidratação).

## Deferido / observações
- Bucket de Storage dedicado a documentos: não existe; reusa `covers` (ver acima). Se um
  bucket próprio (`documentos`) for criado no futuro, só trocar o `.from("covers")` em
  `DocumentoFormModal.tsx` e a chamada `getSignedCoverUrl` na página por um par equivalente.
- `getLancamentosDoArtista` (função antiga, `Faixa[]` com `estagio='lancado'`) ficou sem
  nenhum caller depois desta mudança, mas foi deliberadamente mantida em `lib/db.ts` (regra
  "ADD only" — não remover/renomear funções existentes).
- Sem teste end-to-end contra o Postgres real nem browser logado neste ambiente (isolado,
  sem `.env`/sessão) — verificação por leitura de código + testes unitários/de componente
  com as Server Actions mockadas, mesmo padrão do resto do repositório.
