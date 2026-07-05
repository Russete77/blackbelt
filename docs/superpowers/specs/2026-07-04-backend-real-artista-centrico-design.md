# BLACK BELT 360 — Backend Real + Arquitetura Artista-Cêntrica

**Data:** 2026-07-04
**Produção executiva:** Rick
**Status:** Em design (aprovado em direção: "backend completo, da forma certa")
**Antecede:** a Fundação (mock) já construída — este spec a transforma em produto real.

---

## 1. Decisão e direção

Rick viu a Fundação (casca + player com dados mockados) e pediu o **produto real, multiusuário, feito da forma certa** — não mock. Requisitos explícitos:

- **Cada artista tem sua "pasta" (workspace)** contendo tudo da carreira: faixas, lançamentos, capas, shows, números, documentos — e pode adicionar tudo. Navegação **artista-cêntrica**, não só por projeto.
- **Upload real** de música do computador; **upload de capa**.
- **Clicar na waveform cria comentário** naquele segundo.
- **Todas as páginas construídas** — nada de "Em breve".
- **Ícones profissionais** (lucide), não emoji. ✅ (feito em paralelo)
- **Transcrição áudio→texto grátis** (ver §8; verificar backend do projeto SMU).

## 2. Stack (da forma certa, seguindo o PRD)

| Camada | Tecnologia | Nota |
|---|---|---|
| Frontend + API | Next.js (App Router) na Vercel | reaproveita a Fundação |
| Banco + Auth | **Supabase** (Postgres + Auth por convite) | RLS em todas as tabelas |
| Sessão em Next | `@supabase/ssr` (cookies) | padrão atual, não `auth-helpers` |
| Armazenamento | **Supabase Storage** (buckets privados) | 1 fornecedor só = simplicidade de manutenção (req. do PRD); custo irrelevante p/ 5 artistas |
| Fila/segundo plano | Supabase Edge Functions | transcrição pós-upload |
| Ícones | lucide-react | monocromático, herda o dourado |
| Player | wavesurfer.js | já validado |

**Requisitos adicionais (2ª rodada de feedback do Rick):**
- **Projetos individuais do artista** (que ele mesmo organiza) **E projetos do selo** — os dois convivem. Cada artista organiza os seus; o selo tem os dele.
- **Clipes / audiovisual**: organizar as produções de clipe — datas, demandas, status.
- **Editar / visualizar / notificar** os artistas sempre que houver atualização ou demanda (mantê-los atentos). → precisa de **notificações** (in-app + e-mail).
- Reforço: cada **pasta de artista contém tudo da carreira** e ele pode **adicionar tudo**.

**Segurança (checklist da skill Supabase, obrigatório):**
- Roles em `raw_app_meta_data` (nunca `user_metadata` — é editável pelo usuário).
- RLS habilitado em **todas** as tabelas do schema `public`.
- Políticas `TO authenticated` **+ predicado de dono** (nunca só `TO authenticated`).
- UPDATE com `USING` **e** `WITH CHECK`.
- Chave `service_role` só no servidor; no browser só a publishable key (`NEXT_PUBLIC_...`).
- Views com `security_invoker = true`.
- Storage: policies de INSERT+SELECT+UPDATE (upsert exige os três).

## 3. Modelo de acesso (papéis)

- **admin (Produção/Rick):** vê e edita tudo.
- **artista:** vê e edita o próprio workspace (seu `artista`, seus projetos/faixas); comenta.
- **colaborador (produtor/engenheiro convidado):** vê só os projetos em que foi incluído (`membros_projeto`); sobe versões e comenta.

Papel guardado em `app_metadata.role`. `artista_id` vinculado guardado em `app_metadata.artista_id` para o artista.

## 4. Schema Postgres (núcleo artista-cêntrico)

> SQL completo vive na migration (§7). Abaixo, o modelo. Todas as tabelas com RLS.

- **profiles** — espelha `auth.users`. `id (uuid, = auth.uid)`, `nome`, `role` (redundante p/ leitura), `artista_id?`, `avatar_url?`. Trigger cria em `on auth.user created`.
- **artistas** (a "pasta") — `id`, `nome`, `slug`, `bio?`, `foto_url?`, `capa_url?`, `created_at`. É o eixo central.
- **projetos** — `id`, `nome`, `tipo` (single/ep/album/feat), `capa_url?`, `status_geral`, `created_at`.
- **projeto_artistas** (N:N, cobre feats) — `projeto_id`, `artista_id`, `papel?`.
- **membros_projeto** (acesso de colaborador) — `projeto_id`, `user_id`, `funcao` (produtor/engenheiro/…).
- **faixas** — `id`, `projeto_id`, `titulo`, `genero?`, `estagio` (pipeline), `capa_url?`, `letra?`, `created_at`.
- **versoes** — `id`, `faixa_id`, `tipo` (beat/vocal/mix/master), `rotulo`, `arquivo_path` (Storage), `duracao_segundos?`, `enviado_por`, `created_at`.
- **comentarios** — `id`, `versao_id`, `timestamp_segundos`, `categoria`, `prioridade`, `responsavel?`, `autor`, `texto`, `resolvido`, `created_at`.
- **estrutura_faixa** — `id`, `faixa_id`, `rotulo`, `inicio_segundos`, `fim_segundos`.
- **transcricoes** — `id`, `versao_id`, `texto`, `gerado_automaticamente`, `revisado_por?`, `revisado_em?`, `status` (fila/processando/pronto/erro).

**Stubs dos módulos futuros** (tabelas criadas, telas depois): `shows` (artista_id, data, local, cache, status, rider_tecnico jsonb, rider_camarim jsonb), `metricas` (artista_id/faixa_id, plataforma, data, streams, receita — importação CSV agnóstica de distribuidora, ver [[blackbelt-distributor]]), `registros_obra` / `registros_fonograma` / `registros_videograma` (campos do PRD §14).

**Enums:** `papel_usuario`, `tipo_projeto`, `estagio_pipeline`, `tipo_versao`, `categoria_comentario`, `prioridade`, `rotulo_estrutura`, `status_transcricao`. Espelham os union types que já existem em `types/domain.ts` da Fundação.

## 5. Storage (buckets privados)

- **audio** — versões de faixa. Path: `audio/{artista_id}/{faixa_id}/{versao_id}.{ext}`. Acesso só via signed URLs.
- **covers** — capas de artista/projeto/faixa. Path: `covers/{tipo}/{id}.{ext}`.
- Policies por bucket espelham o modelo de acesso (admin tudo; artista seu artista_id; colaborador seus projetos). Upsert = INSERT+SELECT+UPDATE.

## 6. Frontend — o que muda vs. a Fundação

- **Navegação artista-cêntrica:** Home → lista de **artistas** (card com foto/capa). `/artista/[slug]` = workspace do artista com abas: **Faixas/Projetos**, **Lançamentos**, **Shows**, **Números**, **Documentos**. Sidebar mantém os módulos globais (visão do selo inteiro) + atalho por artista.
- **Camada de dados real:** substituir `mock/data.ts` por acesso Supabase (Server Components + Server Actions; client onde precisa de interação). Os `types/domain.ts` permanecem (agora batendo com o schema).
- **Upload de áudio:** Server Action gera signed upload URL → cliente envia direto pro bucket → cria `versoes` → dispara transcrição (Edge Function).
- **Upload de capa:** igual, bucket `covers`.
- **Comentar clicando na waveform:** clique na onda captura o segundo → abre popover → grava `comentarios`. Pinos e lista já existem (Fundação).
- **Todas as páginas reais:** Estúdio, Artista, Analytics (importação CSV + views×receita), Previsão, Shows (com riders), Registro — sem "Em breve".
- **Auth:** login por convite (email/magic link), middleware protege rotas, `@supabase/ssr`.

## 7. Migrations

Criadas via `supabase migration new`, aplicadas com `execute_sql` durante iteração e commitadas com `supabase db pull`. Ordem: (1) enums, (2) tabelas núcleo + RLS + policies, (3) trigger de profile, (4) buckets + storage policies, (5) stubs dos módulos. Rodar `supabase db advisors` antes de commitar cada migration.

## 8. Transcrição áudio→texto

Rick insiste que o projeto SMU tem backend pronto. **Ação:** inspecionar o SMU antes de decidir (ver [[blackbelt-edge-tts-caveat]] — "Edge TTS" é texto→voz, não transcreve; confirmar o que o SMU realmente faz). Opções, em ordem de preferência a validar:
1. Backend SMU, **se** de fato transcrever.
2. **Whisper no navegador** (transformers.js / whisper WASM/WebGPU) — grátis, sem servidor, sem custo por minuto.
3. Whisper/GPT-4o Transcribe via Edge Function (custo baixo, ~poucos dólares/mês).
Tratar sempre como **rascunho revisado por humano** (PRD §7).

## 9. Fases de execução

1. **Infra Supabase** — conectar projeto, aplicar schema núcleo + RLS + buckets. (BLOQUEIA no Rick conectar o Supabase.)
2. **Auth por convite** + middleware + `@supabase/ssr`.
3. **Camada de dados real** — trocar mock por Supabase; workspaces de artista.
4. **Uploads** (áudio + capa) + **comentar clicando na waveform**.
5. **Todas as páginas** dos módulos (começando pelo Estúdio/Artista completos).
6. **Transcrição** (após inspecionar SMU).
7. **Deploy Vercel** + variáveis de ambiente.

## 10. Pré-requisitos do Rick (bloqueios reais)

- **Conectar o Supabase** (OAuth — aprovar no navegador). Sem isso, nada de banco/auth/storage.
- Confirmar **Vercel** para deploy (padrão do PRD).
- Depois: lista de **e-mails a convidar** e o **local do projeto SMU** (para a transcrição).

## 11. Fora de escopo agora
Pagamentos, app mobile nativo, integração com pipeline de lançamento existente (D-30→D0) — fases posteriores por spec próprio.
