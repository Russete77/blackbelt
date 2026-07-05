-- Royalties chegam em moedas diferentes por plataforma/distribuidora (ex.:
-- YouTube AdSense em USD, Spotify/Deezer BR em BRL). `moeda` registra em qual
-- moeda o valor de `receita` daquela linha foi lançado — a UI converte pro
-- câmbio do dia pra mostrar sempre as duas (ver lib/cambio.ts).
alter table metricas add column if not exists moeda text not null default 'BRL';
alter table metricas add constraint metricas_moeda_check check (moeda in ('BRL', 'USD'));
