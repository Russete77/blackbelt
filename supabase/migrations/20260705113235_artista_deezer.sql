-- id do artista no Deezer (importar catalogo + re-sincronizar sem chave/dominio).
alter table artistas add column if not exists deezer_artist_id text;
