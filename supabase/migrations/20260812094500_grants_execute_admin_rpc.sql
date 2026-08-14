-- Migração 13 — concede à service role o `execute` das funções RPC de `admin_rpc.sql`.
--
-- `admin_rpc.sql` revogou `execute` de `public, anon, authenticated` para fechar o acesso do
-- cliente comum, mas isso também remove o `execute` implícito de `PUBLIC` que a service role
-- herdaria por padrão — sem `grant` explícito, nem ela consegue chamar as próprias funções que
-- `admin-users` invoca via `.rpc(...)`. Descoberto ao rodar `test:rls` contra `supabase start`
-- local (T084). `admin_usuario_json` e `admin_verificar_autor` ficam de fora: só são chamadas de
-- dentro das outras funções `security definer`, nunca via RPC direto.

grant execute on function
  public.admin_definir_perfis(uuid, public.perfil[], uuid),
  public.admin_mudar_situacao(uuid, public.situacao_usuario, public.acao_auditoria, uuid),
  public.admin_registrar_senha_reemitida(uuid, uuid),
  public.admin_registrar_usuario_criado(uuid, uuid)
to service_role;
