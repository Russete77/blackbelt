-- Corrige 42501 (insufficient_privilege): as policies chamam funções do
-- schema privado `app` (app.is_admin(), app.pode_ver_*), mas o papel
-- `authenticated` não tinha USAGE no schema `app` nem EXECUTE nas funções.
-- Sem isso, avaliar a policy aborta com 42501 (ex.: apagar comentário).
-- Só `authenticated` — nunca `anon` (invite-only).

grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;
alter default privileges in schema app grant execute on functions to authenticated;
