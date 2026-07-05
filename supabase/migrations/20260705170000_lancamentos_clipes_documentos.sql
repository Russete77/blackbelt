-- Abas Lançamentos / Clipes / Documentos do workspace do artista.
create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references artistas(id) on delete cascade,
  faixa_id uuid references faixas(id) on delete set null,
  titulo text not null, tipo text, data_lancamento date,
  plataformas jsonb default '[]', isrc text, capa_url text,
  status text not null default 'planejado', checklist jsonb default '[]',
  created_at timestamptz not null default now()
);
create table if not exists clipes (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references artistas(id) on delete cascade,
  faixa_id uuid references faixas(id) on delete set null,
  titulo text not null, status text not null default 'ideia',
  data_gravacao date, data_estreia date, video_url text,
  diretor text, demandas jsonb default '[]', cue_sheet jsonb default '[]',
  created_at timestamptz not null default now()
);
create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid references artistas(id) on delete cascade,
  titulo text not null, tipo text, arquivo_path text, observacao text,
  created_at timestamptz not null default now()
);
