-- Correções de autorização da superfície nova (auditoria 05/07):
-- 1. faixa_artistas (splits de receita) tinha USING(true) — dado contratual
--    aberto para leitura/edição por qualquer authenticated. Escopa ao time
--    da faixa (mesmo predicado das demais tabelas de conteúdo).
-- 2. CHECK de percentual 0..100 no banco (validação só existia na action).
-- 3. metricas: INSERT/UPDATE agora validam também o faixa_id — antes um
--    artista podia lançar métrica no próprio workspace apontando para
--    faixa de outro artista, poluindo agregações e splits.
-- 4. Limpeza dos snapshots acumulados do YouTube (o sync gravava o total
--    do vídeo 1x por dia e as agregações somavam os dias — ver
--    analytics/actions.ts, que passa a manter 1 linha por faixa/plataforma).

-- ============================================================
-- 1. Splits por faixa: escopo do time
-- ============================================================
drop policy if exists "fa_sel" on faixa_artistas;
drop policy if exists "fa_ins" on faixa_artistas;
drop policy if exists "fa_upd" on faixa_artistas;
drop policy if exists "fa_del" on faixa_artistas;

create policy "fa_sel" on faixa_artistas for select to authenticated
  using (app.pode_ver_faixa(faixa_id));
create policy "fa_ins" on faixa_artistas for insert to authenticated
  with check (app.pode_ver_faixa(faixa_id));
create policy "fa_upd" on faixa_artistas for update to authenticated
  using (app.pode_ver_faixa(faixa_id))
  with check (app.pode_ver_faixa(faixa_id));
-- delete acompanha a visibilidade: salvarSplits substitui a lista inteira
-- (delete+upsert) e com delete admin-only o fluxo quebrava para o artista.
create policy "fa_del" on faixa_artistas for delete to authenticated
  using (app.pode_ver_faixa(faixa_id));

-- ============================================================
-- 2. Percentual válido também no banco
-- ============================================================
alter table faixa_artistas drop constraint if exists faixa_artistas_percentual_check;
alter table faixa_artistas add constraint faixa_artistas_percentual_check
  check (percentual >= 0 and percentual <= 100);

-- ============================================================
-- 3. metricas: faixa_id (quando presente) precisa ser visível ao autor
-- ============================================================
drop policy if exists "metricas_ins" on metricas;
drop policy if exists "metricas_upd" on metricas;

create policy "metricas_ins" on metricas for insert to authenticated
  with check (
    app.pode_ver_workspace(artista_id)
    and (faixa_id is null or app.pode_ver_faixa(faixa_id))
  );
create policy "metricas_upd" on metricas for update to authenticated
  using (
    app.pode_ver_workspace(artista_id)
    and (faixa_id is null or app.pode_ver_faixa(faixa_id))
  )
  with check (
    app.pode_ver_workspace(artista_id)
    and (faixa_id is null or app.pode_ver_faixa(faixa_id))
  );

-- ============================================================
-- 4. Snapshots do YouTube: fica só a leitura mais recente por faixa.
--    Linhas órfãs (faixa_id null, do widget manual removido) saem.
-- ============================================================
delete from metricas
where plataforma = 'youtube' and faixa_id is null;

delete from metricas m
where m.plataforma = 'youtube'
  and exists (
    select 1 from metricas m2
    where m2.plataforma = 'youtube'
      and m2.faixa_id = m.faixa_id
      and (m2.data > m.data or (m2.data = m.data and m2.created_at > m.created_at))
  );
