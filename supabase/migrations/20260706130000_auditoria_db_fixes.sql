-- ============================================================================
-- BLACK BELT 360 — Migration de correção da auditoria de banco (RLS + índices +
-- constraints). Idempotente: pode rodar mais de uma vez sem erro.
-- Segue o padrão já usado no schema: funções app.* (security definer),
-- policies por tabela, grants só para `authenticated` (invite-only, nunca anon).
-- ============================================================================

-- ============================================================================
-- 1. CRÍTICO — lancamentos / clipes / documentos estavam SEM RLS (e sem grants,
--    pois foram criadas depois do "grant ... on all tables" único do core).
--    Coluna de vínculo = artista_id (nullable) nas três tabelas.
--    Mesmo padrão de shows/metricas: sel/ins/upd por pode_ver_workspace
--    (que já inclui is_admin()); delete só admin. artista_id nulo => admin-only.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['lancamentos','clipes','documentos']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "%s_sel" on public.%I;', t, t);
    execute format('drop policy if exists "%s_ins" on public.%I;', t, t);
    execute format('drop policy if exists "%s_upd" on public.%I;', t, t);
    execute format('drop policy if exists "%s_del" on public.%I;', t, t);

    execute format($p$create policy "%s_sel" on public.%I for select to authenticated
      using (app.pode_ver_workspace(artista_id));$p$, t, t);
    execute format($p$create policy "%s_ins" on public.%I for insert to authenticated
      with check (app.pode_ver_workspace(artista_id));$p$, t, t);
    execute format($p$create policy "%s_upd" on public.%I for update to authenticated
      using (app.pode_ver_workspace(artista_id))
      with check (app.pode_ver_workspace(artista_id));$p$, t, t);
    execute format($p$create policy "%s_del" on public.%I for delete to authenticated
      using (app.is_admin());$p$, t, t);
  end loop;
end $$;

-- ============================================================================
-- 2. ALTO — demandas: dem_sel/dem_ins/dem_upd usavam using(true)/with check(true).
--    Restringe ao workspace do artista (admin OU o próprio artista).
-- ============================================================================
drop policy if exists "dem_sel" on demandas;
drop policy if exists "dem_ins" on demandas;
drop policy if exists "dem_upd" on demandas;

create policy "dem_sel" on demandas for select to authenticated
  using (app.pode_ver_workspace(artista_id));
create policy "dem_ins" on demandas for insert to authenticated
  with check (app.pode_ver_workspace(artista_id));
create policy "dem_upd" on demandas for update to authenticated
  using (app.pode_ver_workspace(artista_id))
  with check (app.pode_ver_workspace(artista_id));

-- ============================================================================
-- 3. MÉDIO — notificacoes: notif_ins usava with check(true) (qualquer usuário
--    injetava notificação na caixa de qualquer user_id). notificarArtista cria
--    para OUTRO usuário (o artista), então não dá pra exigir user_id=auth.uid().
--    Fecha o buraco: self OR admin OR usuário cujo workspace de artista você vê.
-- ============================================================================
create or replace function app.usuario_no_meu_workspace(uid uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and app.pode_ver_workspace(p.artista_id)
  );
$$;
grant execute on function app.usuario_no_meu_workspace(uuid) to authenticated;

drop policy if exists "notif_ins" on notificacoes;
create policy "notif_ins" on notificacoes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or app.is_admin()
    or app.usuario_no_meu_workspace(user_id)
  );

-- ============================================================================
-- 4. CRÍTICO — metricas sem UNIQUE. Deduplica ANTES e cria índices únicos
--    parciais (faixa_id pode ser NULL = métrica por artista).
--    "Mais recente" = maior created_at (desempate por id).
-- ============================================================================

-- 4a. Dedup do grupo faixa_id NOT NULL: (faixa_id, plataforma, data)
delete from metricas m
using (
  select id,
         row_number() over (
           partition by faixa_id, plataforma, data
           order by created_at desc, id desc
         ) as rn
  from metricas
  where faixa_id is not null
) d
where m.id = d.id and d.rn > 1;

-- 4b. Dedup do grupo faixa_id NULL (métrica por artista): (artista_id, plataforma, data)
delete from metricas m
using (
  select id,
         row_number() over (
           partition by artista_id, plataforma, data
           order by created_at desc, id desc
         ) as rn
  from metricas
  where faixa_id is null and artista_id is not null
) d
where m.id = d.id and d.rn > 1;

-- 4c. Índices únicos parciais (também servem de índice de busca por faixa_id).
create unique index if not exists metricas_faixa_plataforma_data_uidx
  on metricas (faixa_id, plataforma, data)
  where faixa_id is not null;
create unique index if not exists metricas_artista_plataforma_data_uidx
  on metricas (artista_id, plataforma, data)
  where faixa_id is null;

-- ============================================================================
-- 5. ALTO — registros_obra/fonograma/videograma sem UNIQUE(faixa_id).
--    O app já trata como "1 linha por faixa". Deduplica e cria UNIQUE(faixa_id).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['registros_obra','registros_fonograma','registros_videograma']
  loop
    execute format($q$
      delete from public.%I m
      using (
        select id,
               row_number() over (
                 partition by faixa_id
                 order by created_at desc, id desc
               ) as rn
        from public.%I
        where faixa_id is not null
      ) d
      where m.id = d.id and d.rn > 1;
    $q$, t, t);
  end loop;
end $$;

create unique index if not exists registros_obra_faixa_uidx
  on registros_obra (faixa_id) where faixa_id is not null;
create unique index if not exists registros_fonograma_faixa_uidx
  on registros_fonograma (faixa_id) where faixa_id is not null;
create unique index if not exists registros_videograma_faixa_uidx
  on registros_videograma (faixa_id) where faixa_id is not null;

-- ============================================================================
-- 6. ALTO — índices nas FKs/colunas de filtro usadas em .eq()/.in() (lib/db.ts).
--    Só os NÃO redundantes (faixa_id de metricas/projeto_artistas/faixa_artistas
--    já cobertos por prefixo de índice único/PK).
-- ============================================================================
create index if not exists idx_faixas_projeto_id            on faixas (projeto_id);
create index if not exists idx_versoes_faixa_id             on versoes (faixa_id);
create index if not exists idx_comentarios_versao_id        on comentarios (versao_id);
create index if not exists idx_shows_artista_id             on shows (artista_id);
create index if not exists idx_notificacoes_user_id         on notificacoes (user_id);
create index if not exists idx_demandas_artista_id          on demandas (artista_id);
create index if not exists idx_projeto_artistas_artista_id  on projeto_artistas (artista_id);
create index if not exists idx_faixa_artistas_artista_id    on faixa_artistas (artista_id);
create index if not exists idx_metricas_artista_id          on metricas (artista_id);
create index if not exists idx_lancamentos_artista_id       on lancamentos (artista_id);
create index if not exists idx_clipes_artista_id            on clipes (artista_id);
create index if not exists idx_documentos_artista_id        on documentos (artista_id);

-- ============================================================================
-- 7. BAIXO — CHECK em colunas texto que simulam enum (valores dos tipos da app).
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'faixas_origem_check' and conrelid = 'public.faixas'::regclass) then
    alter table public.faixas add constraint faixas_origem_check
      check (origem in ('estudio','footprint'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'lancamentos_status_check' and conrelid = 'public.lancamentos'::regclass) then
    alter table public.lancamentos add constraint lancamentos_status_check
      check (status in ('planejado','agendado','lancado'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'clipes_status_check' and conrelid = 'public.clipes'::regclass) then
    alter table public.clipes add constraint clipes_status_check
      check (status in ('ideia','pre_producao','gravacao','pos_producao','lancado'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'demandas_status_check' and conrelid = 'public.demandas'::regclass) then
    alter table public.demandas add constraint demandas_status_check
      check (status in ('aberta','em_andamento','concluida'));
  end if;
end $$;

-- ============================================================================
-- 8. BAIXO — profiles.artista_id sem FK. Limpa órfãos ANTES e adiciona a FK.
-- ============================================================================
update profiles
   set artista_id = null
 where artista_id is not null
   and not exists (select 1 from artistas a where a.id = profiles.artista_id);

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'profiles_artista_id_fkey' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_artista_id_fkey
      foreign key (artista_id) references artistas(id) on delete set null;
  end if;
end $$;
