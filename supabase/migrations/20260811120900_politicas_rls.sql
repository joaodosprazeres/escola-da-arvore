-- Migração 10/10 — RLS ligada em todas as tabelas e as políticas por tabela
-- (contracts/rls-e-rotas.md §A.2, FR-034 a FR-038).
--
-- `enable row level security` sem política = tudo negado. Esta é a única migração em que a porta
-- abre, e abre por perfil.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teachers enable row level security;
alter table public.audit_log enable row level security;
alter table public.login_attempts enable row level security;
alter table public.password_reset_requests enable row level security;

-- Também força a RLS para o dono das tabelas, fechando o caminho por conexão direta do postgres.
alter table public.login_attempts force row level security;
alter table public.password_reset_requests force row level security;

/* ---------------------------------------------------------------- *
 * profiles
 * ---------------------------------------------------------------- */

grant select on public.profiles to authenticated;

create policy profiles_leitura on public.profiles
  for select to authenticated
  using (
    public.pode_operar() and (
      id = (select auth.uid())            -- todos leem a si mesmos
      or public.eh_administrador()
      or public.tem_perfil('secretaria')  -- lista operacional, sem escrita
    )
  );

-- Única escrita do próprio usuário: a visão ativa (FR-012).
-- O `grant` por coluna é o que impede a mesma política de liberar `status` e `full_name`.
revoke update on public.profiles from authenticated;
grant update (active_view) on public.profiles to authenticated;

create policy profiles_visao_ativa on public.profiles
  for update to authenticated
  using (public.pode_operar() and id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and active_view = any (public.perfis_do_usuario())
  );

/* ---------------------------------------------------------------- *
 * user_roles — sem insert/update/delete para o cliente: atribuir perfil é
 * exclusividade do administrador, via Edge Function admin-users (FR-020).
 * ---------------------------------------------------------------- */

grant select on public.user_roles to authenticated;

create policy user_roles_leitura on public.user_roles
  for select to authenticated
  using (
    public.pode_operar() and (
      user_id = (select auth.uid())
      or public.eh_administrador()
      or public.tem_perfil('secretaria')
    )
  );

/* ---------------------------------------------------------------- *
 * teachers
 * ---------------------------------------------------------------- */

grant select on public.teachers to authenticated;

create policy teachers_leitura on public.teachers
  for select to authenticated
  using (
    public.pode_operar() and (
      public.eh_administrador()
      or public.tem_perfil('secretaria')
      or public.tem_perfil('coordenacao')
      or id = (select teacher_id from public.profiles where id = (select auth.uid()))
    )
  );

/* ---------------------------------------------------------------- *
 * audit_log — leitura só do administrador (FR-042); escrita só via Edge Function.
 * ---------------------------------------------------------------- */

grant select on public.audit_log to authenticated;

create policy audit_leitura on public.audit_log
  for select to authenticated
  using (public.pode_operar() and public.eh_administrador());

/* ---------------------------------------------------------------- *
 * login_attempts e password_reset_requests — nenhuma política, nenhum grant.
 * Inacessíveis a anon e authenticated; só a service role as toca.
 * ---------------------------------------------------------------- */

revoke all on public.login_attempts from anon, authenticated;
revoke all on public.password_reset_requests from anon, authenticated;
