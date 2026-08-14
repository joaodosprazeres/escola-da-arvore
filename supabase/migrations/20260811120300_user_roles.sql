-- Migração 4/10 — `user_roles` (data-model.md §2.2).
-- Permissões efetivas = união das linhas (FR-009). Não há herança entre perfis.

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.perfil not null,
  granted_by uuid not null references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index idx_user_roles_user on public.user_roles (user_id);

-- FR-016: removido o papel que era a visão ativa, a visão passa ao perfil de maior alcance
-- restante. Sem papel restante, INV-1 (migração 6) recusa a operação.
create or replace function public.reajustar_visao_ativa() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  restantes public.perfil[];
begin
  select public.perfis_de(old.user_id) into restantes;

  if array_length(restantes, 1) is null then
    return old;
  end if;

  update public.profiles
     set active_view = public.visao_padrao(restantes)
   where id = old.user_id
     and (active_view is null or not (active_view = any (restantes)));

  return old;
end;
$$;

create trigger user_roles_reajusta_visao
  after delete on public.user_roles
  for each row execute function public.reajustar_visao_ativa();
