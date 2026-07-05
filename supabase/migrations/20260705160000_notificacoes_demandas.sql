-- Notificações in-app + Demandas (tarefas atribuídas a artistas).
create table if not exists notificacoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  mensagem   text,
  link       text,
  lida       boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists demandas (
  id         uuid primary key default gen_random_uuid(),
  artista_id uuid references artistas(id) on delete cascade,
  titulo     text not null,
  descricao  text,
  status     text not null default 'aberta',   -- aberta | em_andamento | concluida
  prazo      date,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table notificacoes enable row level security;
alter table demandas enable row level security;
grant select, insert, update, delete on notificacoes to authenticated;
grant select, insert, update, delete on demandas to authenticated;

-- notificacoes: cada um vê/atualiza as suas (ou admin); insert livre (pra notificar outros).
create policy "notif_sel" on notificacoes for select to authenticated using (user_id = (select auth.uid()) or app.is_admin());
create policy "notif_ins" on notificacoes for insert to authenticated with check (true);
create policy "notif_upd" on notificacoes for update to authenticated using (user_id = (select auth.uid()) or app.is_admin()) with check (user_id = (select auth.uid()) or app.is_admin());
create policy "notif_del" on notificacoes for delete to authenticated using (user_id = (select auth.uid()) or app.is_admin());

-- demandas: time vê e mexe; só admin apaga.
create policy "dem_sel" on demandas for select to authenticated using (true);
create policy "dem_ins" on demandas for insert to authenticated with check (true);
create policy "dem_upd" on demandas for update to authenticated using (true) with check (true);
create policy "dem_del" on demandas for delete to authenticated using (app.is_admin());
