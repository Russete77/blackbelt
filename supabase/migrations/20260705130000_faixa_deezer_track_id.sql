-- id da faixa no Deezer (importação de catálogo) — mesmo padrão de
-- youtube_video_id/spotify_track_id em faixas.
alter table faixas add column if not exists deezer_track_id text;
