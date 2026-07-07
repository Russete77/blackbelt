-- ============================================================================
-- BUG DE SEGURANÇA (achado pelo harness scripts/verify_rls.py):
-- lancamentos/clipes/documentos tinham DOIS conjuntos de policies. Além das
-- restritivas por workspace (_sel/_ins/_upd/_del, da migration 20260706130000),
-- existia um conjunto PERMISSIVO (_select/_insert/_update com using/with check
-- = true) criado por fora. Como RLS é permissivo (OR entre policies), o conjunto
-- `true` anulava a restrição — qualquer autenticado via/escrevia dados de
-- qualquer artista. Removemos as permissivas; ficam só as por workspace.
-- Idempotente.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['lancamentos','clipes','documentos']
  loop
    execute format('drop policy if exists "%s_select" on public.%I;', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I;', t, t);
    execute format('drop policy if exists "%s_update" on public.%I;', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I;', t, t);
  end loop;
end $$;
