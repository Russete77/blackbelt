-- Faltava a policy de DELETE em `projetos`: sem ela a RLS nega por padrão, então
-- nem o admin conseguia apagar um projeto (o app dava "delete de 0 linhas").
-- Só admin apaga; a exclusão cascateia via FK (on delete cascade) para faixas,
-- versões, comentários e métricas do projeto.
drop policy if exists "projetos_del" on projetos;
create policy "projetos_del" on projetos for delete to authenticated
  using (app.is_admin());
