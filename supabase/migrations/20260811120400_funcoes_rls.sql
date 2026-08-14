-- Migração 5/10 — funções auxiliares das políticas (contracts/rls-e-rotas.md §A.1, R-05).
--
-- Todas `security definer`, `stable`, com `search_path` fixo. A autorização lê TABELA, nunca claim
-- do JWT: é o que entrega FR-016 e SC-009 sem código de invalidação.

-- Perfis de um usuário qualquer (uso interno de triggers).
create or replace function public.perfis_de(alvo uuid) returns public.perfil[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(role order by role), '{}'::public.perfil[])
    from public.user_roles
   where user_id = alvo;
$$;

-- Perfis do chamador. `(select auth.uid())` para caching de InitPlan.
create or replace function public.perfis_do_usuario() returns public.perfil[]
language sql
stable
security definer
set search_path = public
as $$
  select public.perfis_de((select auth.uid()));
$$;

create or replace function public.tem_perfil(p public.perfil) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p = any (public.perfis_do_usuario());
$$;

create or replace function public.eh_administrador() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tem_perfil('administrador'::public.perfil);
$$;

create or replace function public.usuario_ativo() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid())
       and status = 'ativo'
  );
$$;

-- R-08: rede de segurança independente do plano do projeto. 30 min de inatividade, 12 h absolutas,
-- sempre pelo relógio do servidor (FR-007).
create or replace function public.sessao_valida() returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from auth.sessions s
     where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
       and now() - coalesce(s.refreshed_at, s.created_at) < interval '30 minutes'
       and now() - s.created_at < interval '12 hours'
  );
$$;

-- Prefixo obrigatório de toda política.
create or replace function public.pode_operar() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null
     and public.usuario_ativo()
     and public.sessao_valida();
$$;

-- Ordem de alcance das Assumptions: administrador > secretaria > coordenacao > professor (R-10).
create or replace function public.visao_padrao(ps public.perfil[]) returns public.perfil
language sql
immutable
set search_path = public
as $$
  select p
    from unnest(ps) as p
   order by case p
              when 'administrador' then 4
              when 'secretaria' then 3
              when 'coordenacao' then 2
              when 'professor' then 1
            end desc
   limit 1;
$$;

-- Stub documentado (data-model.md §2.3): a tabela `class_teachers` pertence à feature de turmas.
-- Enquanto ela não existe, todo professor recebe conjunto vazio — o que produz o painel vazio com
-- orientação, em vez de erro.
create or replace function public.turmas_do_professor() returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select '{}'::uuid[]
   where exists (
     select 1 from public.profiles
      where id = (select auth.uid())
        and teacher_id is not null
   );
$$;

comment on function public.turmas_do_professor() is
  'STUB: devolve conjunto vazio até a feature de turmas criar class_teachers. FR-036 só fica coberto lá.';

revoke execute on function
  public.perfis_de(uuid),
  public.perfis_do_usuario(),
  public.tem_perfil(public.perfil),
  public.eh_administrador(),
  public.usuario_ativo(),
  public.sessao_valida(),
  public.pode_operar(),
  public.visao_padrao(public.perfil[]),
  public.turmas_do_professor()
from public, anon;

grant execute on function
  public.perfis_do_usuario(),
  public.tem_perfil(public.perfil),
  public.eh_administrador(),
  public.usuario_ativo(),
  public.sessao_valida(),
  public.pode_operar(),
  public.turmas_do_professor()
to authenticated;
