-- Migração 12 — concede à service role o acesso de tabela que ela ainda não tinha.
--
-- `bypassrls` (atributo do papel `service_role`) só dispensa a checagem de POLÍTICA por linha; o
-- `grant` de tabela é uma camada anterior e independente, e nenhuma migração desta feature o
-- concedeu. Sem isso, `auth-login` (leitura/escrita direta de `login_attempts`), `admin-users`
-- (leitura de `profiles`/`user_roles` para reconferir o chamador — R-05) e `password-recovery`
-- (leitura de `profiles`, ciclo de vida de `password_reset_requests`) recebem "permission denied"
-- mesmo com a service role key — descoberto ao rodar `test:rls` contra `supabase start` local,
-- corrigido aqui como migração nova (nunca editando as anteriores).
--
-- `audit_log` FICA DE FORA deliberadamente: toda escrita nela passa pelas funções `security
-- definer` de `admin_rpc.sql` (rodam com o privilégio de quem as criou, não do chamador), e é
-- exatamente a ausência de `grant` direto à service role que fecha FR-041 mesmo contra conexão
-- privilegiada (`tests/rls/auditoria-imutavel.test.ts`, T082).

-- `update` em `profiles` cobre também os fixtures de `test:rls` que simulam bloqueio/desativação
-- administrativa sem passar pela Edge Function (equivalente ao que `admin_mudar_situacao` faz).
grant select, update on public.profiles to service_role;
grant select on public.user_roles to service_role;

grant select, insert, update, delete on public.login_attempts to service_role;

grant select, insert, update on public.password_reset_requests to service_role;

-- Só para os fixtures da suíte `test:rls` (`teachers` não tem Edge Function própria nesta
-- feature; o cadastro completo pertence a outra).
grant select, insert on public.teachers to service_role;
