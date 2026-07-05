-- Distingue faixa de ESTÚDIO (produzida pela gente: versões/beat/mix/comentários)
-- de FOOTPRINT (lançamento externo monitorado: só players + views + splits).
alter table faixas add column if not exists origem text not null default 'estudio';
