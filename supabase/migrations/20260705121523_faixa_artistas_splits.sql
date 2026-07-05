-- Splits por faixa: participantes + percentual de cada artista.
-- Recebimento do artista numa faixa = receita_da_faixa * (percentual/100).
create table if not exists faixa_artistas (
  faixa_id   uuid not null references faixas(id) on delete cascade,
  artista_id uuid not null references artistas(id) on delete cascade,
  papel      text,                         -- ex: principal, feat, produtor
  percentual numeric not null default 0,   -- 0..100
  primary key (faixa_id, artista_id)
);

alter table faixa_artistas enable row level security;
grant select, insert, update, delete on faixa_artistas to authenticated;

create policy "fa_sel" on faixa_artistas for select to authenticated using (true);
create policy "fa_ins" on faixa_artistas for insert to authenticated with check (true);
create policy "fa_upd" on faixa_artistas for update to authenticated using (true) with check (true);
create policy "fa_del" on faixa_artistas for delete to authenticated using (app.is_admin());
