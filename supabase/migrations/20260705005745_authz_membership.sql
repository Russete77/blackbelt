-- BLACK BELT 360 — autorização real por membership (substitui o "modelo v1 plano")
-- Antes: SELECT/INSERT/UPDATE com using(true) para qualquer authenticated.
-- Agora (spec §3): admin vê/edita tudo; artista vê/edita o próprio workspace;
-- colaborador vê só os projetos em que foi incluído (membros_projeto).
-- Papéis e artista_id continuam vindo do JWT app_metadata (nunca user_metadata).

-- ============================================================
-- 0. Funções auxiliares (schema app, security definer p/ evitar
--    recursão de RLS ao consultar as tabelas de membership)
-- ============================================================

-- Cast seguro: texto malformado vira null em vez de abortar a query.
create or replace function app.uuid_seguro(t text)
returns uuid
language plpgsql immutable
as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

create or replace function app.papel()
returns text
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- artista_id vinculado ao usuário logado (JWT app_metadata).
create or replace function app.artista_id()
returns uuid
language sql stable
as $$
  select app.uuid_seguro(auth.jwt() -> 'app_metadata' ->> 'artista_id');
$$;

-- Visibilidade de projeto: admin, membro convidado ou artista dono.
create or replace function app.pode_ver_projeto(pid uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select app.is_admin()
    or exists (
      select 1 from public.membros_projeto m
      where m.projeto_id = pid and m.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.projeto_artistas pa
      where pa.projeto_id = pid and pa.artista_id = app.artista_id()
    );
$$;

create or replace function app.pode_ver_faixa(fid uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.faixas f
    where f.id = fid and app.pode_ver_projeto(f.projeto_id)
  );
$$;

create or replace function app.pode_ver_versao(vid uuid)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.versoes v
    where v.id = vid and app.pode_ver_faixa(v.faixa_id)
  );
$$;

-- Workspace do artista (shows, métricas): admin ou o próprio artista.
create or replace function app.pode_ver_workspace(aid uuid)
returns boolean
language sql stable
as $$
  select app.is_admin() or (aid is not null and aid = app.artista_id());
$$;

-- ============================================================
-- 1. Derruba as policies planas (sel_auth/ins_auth/upd_auth)
--    del_admin permanece como está.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'artistas','projetos','projeto_artistas','membros_projeto','faixas',
    'versoes','comentarios','estrutura_faixa','transcricoes',
    'shows','metricas','registros_obra','registros_fonograma','registros_videograma'
  ]
  loop
    execute format('drop policy if exists "sel_auth" on public.%I;', t);
    execute format('drop policy if exists "ins_auth" on public.%I;', t);
    execute format('drop policy if exists "upd_auth" on public.%I;', t);
  end loop;
end $$;

-- ============================================================
-- 2. Policies por tabela
-- ============================================================

-- artistas: roster visível ao time (navegação artista-cêntrica);
-- escrita só admin ou o próprio artista (update).
create policy "artistas_sel" on artistas for select to authenticated
  using (true);
create policy "artistas_ins" on artistas for insert to authenticated
  with check (app.is_admin());
create policy "artistas_upd" on artistas for update to authenticated
  using (app.is_admin() or id = app.artista_id())
  with check (app.is_admin() or id = app.artista_id());

-- projetos: visíveis a admin/membro/artista dono. Projetos do Selo (sem
-- vínculo) ficam só com o admin. Criação: admin ou artista (o vínculo
-- projeto_artistas é validado na própria policy dele).
create policy "projetos_sel" on projetos for select to authenticated
  using (app.pode_ver_projeto(id));
create policy "projetos_ins" on projetos for insert to authenticated
  with check (app.is_admin() or app.papel() = 'artista');
create policy "projetos_upd" on projetos for update to authenticated
  using (app.pode_ver_projeto(id))
  with check (app.pode_ver_projeto(id));

-- projeto_artistas: leitura livre (nomes nos cards); escrita: admin ou o
-- artista vinculando a si mesmo.
create policy "projeto_artistas_sel" on projeto_artistas for select to authenticated
  using (true);
create policy "projeto_artistas_ins" on projeto_artistas for insert to authenticated
  with check (app.is_admin() or artista_id = app.artista_id());
create policy "projeto_artistas_upd" on projeto_artistas for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- membros_projeto: cada um vê os próprios convites; gestão só admin.
create policy "membros_projeto_sel" on membros_projeto for select to authenticated
  using (app.is_admin() or user_id = (select auth.uid()));
create policy "membros_projeto_ins" on membros_projeto for insert to authenticated
  with check (app.is_admin());
create policy "membros_projeto_upd" on membros_projeto for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- faixas: seguem a visibilidade do projeto (time do projeto colabora).
create policy "faixas_sel" on faixas for select to authenticated
  using (app.pode_ver_projeto(projeto_id));
create policy "faixas_ins" on faixas for insert to authenticated
  with check (app.pode_ver_projeto(projeto_id));
create policy "faixas_upd" on faixas for update to authenticated
  using (app.pode_ver_projeto(projeto_id))
  with check (app.pode_ver_projeto(projeto_id));

-- versoes: quem vê a faixa vê as versões; insert exige autoria verdadeira.
create policy "versoes_sel" on versoes for select to authenticated
  using (app.pode_ver_faixa(faixa_id));
create policy "versoes_ins" on versoes for insert to authenticated
  with check (app.pode_ver_faixa(faixa_id) and enviado_por = (select auth.uid()));
create policy "versoes_upd" on versoes for update to authenticated
  using (app.is_admin() or enviado_por = (select auth.uid()))
  with check (app.is_admin() or enviado_por = (select auth.uid()));

-- comentarios: time do projeto lê, comenta (autoria verdadeira) e
-- edita/resolve (fluxo de feedback é colaborativo dentro do projeto).
create policy "comentarios_sel" on comentarios for select to authenticated
  using (app.pode_ver_versao(versao_id));
create policy "comentarios_ins" on comentarios for insert to authenticated
  with check (app.pode_ver_versao(versao_id) and autor = (select auth.uid()));
create policy "comentarios_upd" on comentarios for update to authenticated
  using (app.pode_ver_versao(versao_id))
  with check (app.pode_ver_versao(versao_id));

-- estrutura_faixa / transcricoes: escopo do time do projeto.
create policy "estrutura_sel" on estrutura_faixa for select to authenticated
  using (app.pode_ver_faixa(faixa_id));
create policy "estrutura_ins" on estrutura_faixa for insert to authenticated
  with check (app.pode_ver_faixa(faixa_id));
create policy "estrutura_upd" on estrutura_faixa for update to authenticated
  using (app.pode_ver_faixa(faixa_id))
  with check (app.pode_ver_faixa(faixa_id));

create policy "transcricoes_sel" on transcricoes for select to authenticated
  using (app.pode_ver_versao(versao_id));
create policy "transcricoes_ins" on transcricoes for insert to authenticated
  with check (app.pode_ver_versao(versao_id));
create policy "transcricoes_upd" on transcricoes for update to authenticated
  using (app.pode_ver_versao(versao_id))
  with check (app.pode_ver_versao(versao_id));

-- shows / metricas: dados sensíveis (cachê, receita) — só admin e o
-- próprio artista. Colaborador não vê.
create policy "shows_sel" on shows for select to authenticated
  using (app.pode_ver_workspace(artista_id));
create policy "shows_ins" on shows for insert to authenticated
  with check (app.pode_ver_workspace(artista_id));
create policy "shows_upd" on shows for update to authenticated
  using (app.pode_ver_workspace(artista_id))
  with check (app.pode_ver_workspace(artista_id));

create policy "metricas_sel" on metricas for select to authenticated
  using (app.pode_ver_workspace(artista_id));
create policy "metricas_ins" on metricas for insert to authenticated
  with check (app.pode_ver_workspace(artista_id));
create policy "metricas_upd" on metricas for update to authenticated
  using (app.pode_ver_workspace(artista_id))
  with check (app.pode_ver_workspace(artista_id));

-- registros_*: documentos legais da faixa — escopo do time do projeto.
do $$
declare t text;
begin
  foreach t in array array['registros_obra','registros_fonograma','registros_videograma']
  loop
    execute format($p$create policy "%s_sel" on public.%I for select to authenticated using (app.pode_ver_faixa(faixa_id));$p$, t, t);
    execute format($p$create policy "%s_ins" on public.%I for insert to authenticated with check (app.pode_ver_faixa(faixa_id));$p$, t, t);
    execute format($p$create policy "%s_upd" on public.%I for update to authenticated using (app.pode_ver_faixa(faixa_id)) with check (app.pode_ver_faixa(faixa_id));$p$, t, t);
  end loop;
end $$;

-- ============================================================
-- 3. profiles: usuário não pode se auto-promover.
--    RLS WITH CHECK não enxerga OLD, então a proteção de coluna
--    é por trigger: não-admin nunca altera role/artista_id.
-- ============================================================
create or replace function app.protege_colunas_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not app.is_admin() then
    new.role       := old.role;
    new.artista_id := old.artista_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protege_profile_cols on profiles;
create trigger protege_profile_cols
  before update on profiles
  for each row execute function app.protege_colunas_profile();

-- ============================================================
-- 4. Storage: amarra cada objeto à entidade do path.
--    audio:  {faixa_id}/{uuid}.{ext}  (+ seed/ legado, visível ao time)
--    covers: {artista|projeto|faixa}/{id}.{ext}
-- ============================================================

-- Pode mexer neste objeto do bucket covers? (decide pelo path)
create or replace function app.pode_editar_capa(nome text)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select case (storage.foldername(nome))[1]
    when 'artista' then app.is_admin()
      or app.uuid_seguro(split_part(storage.filename(nome), '.', 1)) = app.artista_id()
    when 'projeto' then app.pode_ver_projeto(app.uuid_seguro(split_part(storage.filename(nome), '.', 1)))
    when 'faixa'   then app.pode_ver_faixa(app.uuid_seguro(split_part(storage.filename(nome), '.', 1)))
    else app.is_admin()
  end;
$$;

-- Pode ver/subir este áudio? (primeira pasta = faixa_id; seed/ é demo do time)
create or replace function app.pode_ver_audio(nome text)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select (storage.foldername(nome))[1] = 'seed'
    or app.pode_ver_faixa(app.uuid_seguro((storage.foldername(nome))[1]));
$$;

drop policy if exists "audio_sel" on storage.objects;
drop policy if exists "audio_ins" on storage.objects;
drop policy if exists "audio_upd" on storage.objects;
drop policy if exists "covers_sel" on storage.objects;
drop policy if exists "covers_ins" on storage.objects;
drop policy if exists "covers_upd" on storage.objects;

create policy "audio_sel" on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (app.is_admin() or app.pode_ver_audio(name)));
create policy "audio_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (app.is_admin() or app.pode_ver_audio(name)));
-- Uploads de áudio usam nomes únicos (uuid) — sobrescrever é só admin.
create policy "audio_upd" on storage.objects for update to authenticated
  using (bucket_id = 'audio' and app.is_admin())
  with check (bucket_id = 'audio' and app.is_admin());

-- Capas: qualquer membro logado vê (artwork, baixa sensibilidade);
-- escrever/sobrescrever só quem pode editar a entidade do path.
create policy "covers_sel" on storage.objects for select to authenticated
  using (bucket_id = 'covers');
create policy "covers_ins" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and app.pode_editar_capa(name));
create policy "covers_upd" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and app.pode_editar_capa(name))
  with check (bucket_id = 'covers' and app.pode_editar_capa(name));
