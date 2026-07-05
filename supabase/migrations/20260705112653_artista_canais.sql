-- IDs externos por artista, para importar catálogo e métricas.
-- spotify_artist_id: puxa TODAS as faixas do artista, incluindo feats
--   (o Spotify credita todos os artistas de uma faixa) — resolve o caso
--   de hits que estão em canais/lançamentos de terceiros.
-- youtube_channel_id: opcional, pro artista cujas faixas estão no próprio canal.
alter table artistas add column if not exists spotify_artist_id text;
alter table artistas add column if not exists youtube_channel_id text;
