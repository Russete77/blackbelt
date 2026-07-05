-- Preenche as abas do workspace do artista que ainda eram placeholder vazio
-- (ver app/(app)/artista/[slug]/{lancamentos,clipes,documentos}): três
-- tabelas próprias, cada uma com aba dedicada + modal de criar/editar.
--
-- lancamentos: planejamento de release (data, plataformas, ISRC, checklist
-- D-30 -> D0) — distinto de "faixas com estagio='lancado'" (ver
-- getFaixasDoArtista em lib/db.ts), que continua existindo para outros usos.
create table if not exists lancamentos (
  id              uuid primary key default gen_random_uuid(),
  artista_id      uuid not null references artistas(id) on delete cascade,
  faixa_id        uuid references faixas(id) on delete set null,
  titulo          text not null,
  tipo            text not null default 'single',      -- single | ep | album
  data_lancamento date,
  plataformas     jsonb not null default '[]',          -- string[] (spotify, youtube, deezer, apple, ...)
  isrc            text,
  capa_url        text,                                 -- caminho no bucket 'covers'
  status          text not null default 'planejado',    -- planejado | agendado | lancado
  checklist       jsonb not null default '[]',           -- { tarefa: string; feito: boolean }[]
  created_at      timestamptz not null default now()
);

-- clipes: pipeline de videoclipe/curadoria audiovisual do artista.
create table if not exists clipes (
  id            uuid primary key default gen_random_uuid(),
  artista_id    uuid not null references artistas(id) on delete cascade,
  faixa_id      uuid references faixas(id) on delete set null,
  titulo        text not null,
  status        text not null default 'ideia',  -- ideia | pre_producao | gravacao | pos_producao | lancado
  data_gravacao date,
  data_estreia  date,
  video_url     text,                            -- link do YouTube (embed na aba)
  diretor       text,
  demandas      jsonb not null default '[]',      -- string[]
  cue_sheet     jsonb not null default '[]',      -- { trecho, duracao, titular }[] (ver types/registro.ts)
  created_at    timestamptz not null default now()
);

-- documentos: contratos/splits/outros arquivos do artista. Sem bucket
-- próprio ainda: reusa o bucket privado 'covers' (arquivo_path), ou fica só
-- com a observação/link quando não há upload.
create table if not exists documentos (
  id           uuid primary key default gen_random_uuid(),
  artista_id   uuid not null references artistas(id) on delete cascade,
  titulo       text not null,
  tipo         text not null default 'outro', -- contrato | split | outro
  arquivo_path text,
  observacao   text,
  created_at   timestamptz not null default now()
);

alter table lancamentos enable row level security;
alter table clipes enable row level security;
alter table documentos enable row level security;
grant select, insert, update, delete on lancamentos to authenticated;
grant select, insert, update, delete on clipes to authenticated;
grant select, insert, update, delete on documentos to authenticated;

-- Time vê e mexe; só admin apaga (mesmo padrão de demandas, ver
-- 20260705160000_notificacoes_demandas.sql).
create policy "lanc_sel" on lancamentos for select to authenticated using (true);
create policy "lanc_ins" on lancamentos for insert to authenticated with check (true);
create policy "lanc_upd" on lancamentos for update to authenticated using (true) with check (true);
create policy "lanc_del" on lancamentos for delete to authenticated using (app.is_admin());

create policy "clipes_sel" on clipes for select to authenticated using (true);
create policy "clipes_ins" on clipes for insert to authenticated with check (true);
create policy "clipes_upd" on clipes for update to authenticated using (true) with check (true);
create policy "clipes_del" on clipes for delete to authenticated using (app.is_admin());

create policy "docs_sel" on documentos for select to authenticated using (true);
create policy "docs_ins" on documentos for insert to authenticated with check (true);
create policy "docs_upd" on documentos for update to authenticated using (true) with check (true);
create policy "docs_del" on documentos for delete to authenticated using (app.is_admin());
