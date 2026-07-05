-- Links externos por faixa: id do vídeo no YouTube e id da faixa no Spotify.
-- Permitem puxar views (YouTube) e popularidade/catálogo (Spotify) por faixa.
alter table faixas add column if not exists youtube_video_id text;
alter table faixas add column if not exists spotify_track_id text;
