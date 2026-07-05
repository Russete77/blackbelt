-- BLACK BELT 360 — schema núcleo (artista-cêntrico)
-- Segurança: RLS em TODAS as tabelas; sem acesso anon (invite-only);
-- papéis vêm de app_metadata (não de user_metadata, que é editável pelo usuário).
-- Modelo v1: authenticated vê/insere/atualiza tudo (colaborativo); só admin apaga.

-- ============================================================
-- 0. Schema privado para funções auxiliares (não exposto na API)
-- ============================================================
create schema if not exists app;

-- Papel do usuário logado, lido do JWT (app_metadata é seguro p/ authz).
create or replace function app.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- 1. Enums (espelham os union types de types/domain.ts)
-- ============================================================
create type papel_usuario       as enum ('admin','artista','colaborador');
create type tipo_projeto         as enum ('single','ep','album','feat');
create type estagio_pipeline     as enum ('ideia','gravacao','mixagem','masterizacao','aprovado','lancado');
create type tipo_versao          as enum ('beat','vocal','mix','master');
create type categoria_comentario as enum ('beat','mix','master','letra','geral');
create type prioridade           as enum ('alta','media','baixa');
create type rotulo_estrutura     as enum ('intro','verso','refrao','ponte','outro');
create type status_transcricao   as enum ('fila','processando','pronto','erro');

-- ============================================================
-- 2. profiles — espelha auth.users
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null default '',
  role          papel_usuario not null default 'colaborador',
  artista_id    uuid,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Cria o profile automaticamente quando um usuário nasce em auth.users.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ============================================================
-- 3. Tabelas do domínio (artista no centro)
-- ============================================================
create table artistas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  slug       text unique not null,
  bio        text,
  foto_url   text,
  capa_url   text,
  created_at timestamptz not null default now()
);

create table projetos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  tipo         tipo_projeto not null default 'single',
  capa_url     text,
  status_geral estagio_pipeline not null default 'ideia',
  created_at   timestamptz not null default now()
);

create table projeto_artistas (
  projeto_id uuid not null references projetos(id) on delete cascade,
  artista_id uuid not null references artistas(id) on delete cascade,
  papel      text,
  primary key (projeto_id, artista_id)
);

create table membros_projeto (
  projeto_id uuid not null references projetos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  funcao     text,
  primary key (projeto_id, user_id)
);

create table faixas (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  titulo     text not null,
  genero     text,
  estagio    estagio_pipeline not null default 'ideia',
  capa_url   text,
  letra      text,
  created_at timestamptz not null default now()
);

create table versoes (
  id                uuid primary key default gen_random_uuid(),
  faixa_id          uuid not null references faixas(id) on delete cascade,
  tipo              tipo_versao not null,
  rotulo            text not null,
  arquivo_path      text,               -- caminho no bucket 'audio'
  duracao_segundos  numeric,
  enviado_por       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table comentarios (
  id                 uuid primary key default gen_random_uuid(),
  versao_id          uuid not null references versoes(id) on delete cascade,
  timestamp_segundos numeric not null,
  categoria          categoria_comentario not null default 'geral',
  prioridade         prioridade not null default 'media',
  responsavel        uuid references auth.users(id) on delete set null,
  autor              uuid references auth.users(id) on delete set null,
  texto              text not null,
  resolvido          boolean not null default false,
  created_at         timestamptz not null default now()
);

create table estrutura_faixa (
  id              uuid primary key default gen_random_uuid(),
  faixa_id        uuid not null references faixas(id) on delete cascade,
  rotulo          rotulo_estrutura not null,
  inicio_segundos numeric not null,
  fim_segundos    numeric not null
);

create table transcricoes (
  id                     uuid primary key default gen_random_uuid(),
  versao_id              uuid not null references versoes(id) on delete cascade,
  texto                  text not null default '',
  gerado_automaticamente boolean not null default true,
  status                 status_transcricao not null default 'fila',
  revisado_por           uuid references auth.users(id) on delete set null,
  revisado_em            timestamptz,
  created_at             timestamptz not null default now()
);

-- ============================================================
-- 4. Stubs dos módulos futuros (telas depois; lugar já existe)
-- ============================================================
create table shows (
  id            uuid primary key default gen_random_uuid(),
  artista_id    uuid references artistas(id) on delete cascade,
  data          timestamptz,
  local         text,
  cache         numeric,
  status        text,
  rider_tecnico jsonb,
  rider_camarim jsonb,
  created_at    timestamptz not null default now()
);

create table metricas (
  id          uuid primary key default gen_random_uuid(),
  artista_id  uuid references artistas(id) on delete cascade,
  faixa_id    uuid references faixas(id) on delete set null,
  plataforma  text not null,
  data        date not null,
  streams     bigint,
  receita     numeric,
  created_at  timestamptz not null default now()
);

create table registros_obra (
  id         uuid primary key default gen_random_uuid(),
  faixa_id   uuid references faixas(id) on delete cascade,
  dados      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table registros_fonograma (
  id         uuid primary key default gen_random_uuid(),
  faixa_id   uuid references faixas(id) on delete cascade,
  isrc       text,
  dados      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table registros_videograma (
  id         uuid primary key default gen_random_uuid(),
  faixa_id   uuid references faixas(id) on delete cascade,
  dados      jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. Grants: só authenticated (nunca anon — invite-only)
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================
-- 6. RLS: habilita em todas + políticas
--    SELECT/INSERT/UPDATE: authenticated (colaborativo). DELETE: só admin.
--    Anon: nenhum acesso.
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
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy "sel_auth" on public.%I for select to authenticated using (true);$p$, t);
    execute format($p$create policy "ins_auth" on public.%I for insert to authenticated with check (true);$p$, t);
    execute format($p$create policy "upd_auth" on public.%I for update to authenticated using (true) with check (true);$p$, t);
    execute format($p$create policy "del_admin" on public.%I for delete to authenticated using (app.is_admin());$p$, t);
  end loop;
end $$;

-- profiles: ver todos (time pequeno); atualizar só o próprio (ou admin); sem delete/insert manual.
alter table profiles enable row level security;
create policy "profiles_sel"  on profiles for select to authenticated using (true);
create policy "profiles_upd"  on profiles for update to authenticated
  using ((select auth.uid()) = id or app.is_admin())
  with check ((select auth.uid()) = id or app.is_admin());

-- ============================================================
-- 7. Storage: buckets privados + políticas
--    Upsert exige INSERT+SELECT+UPDATE. DELETE só admin.
-- ============================================================
insert into storage.buckets (id, name, public) values ('audio','audio', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers','covers', false)
  on conflict (id) do nothing;

create policy "audio_sel" on storage.objects for select to authenticated using (bucket_id = 'audio');
create policy "audio_ins" on storage.objects for insert to authenticated with check (bucket_id = 'audio');
create policy "audio_upd" on storage.objects for update to authenticated
  using (bucket_id = 'audio') with check (bucket_id = 'audio');
create policy "audio_del" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and app.is_admin());

create policy "covers_sel" on storage.objects for select to authenticated using (bucket_id = 'covers');
create policy "covers_ins" on storage.objects for insert to authenticated with check (bucket_id = 'covers');
create policy "covers_upd" on storage.objects for update to authenticated
  using (bucket_id = 'covers') with check (bucket_id = 'covers');
create policy "covers_del" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and app.is_admin());
