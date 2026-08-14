-- Migração 6/10 — invariantes INV-1 a INV-4 (data-model.md §2.1).
--
-- Todas como *constraint triggers* DEFERRABLE INITIALLY DEFERRED: a conta nasce em uma transação
-- que insere perfil e papéis; verificar linha a linha recusaria o estado intermediário legítimo.
-- Verificação no commit vale para qualquer caminho — inclusive requisição direta ao PostgREST.

-- INV-1 — todo usuário tem ao menos um papel (FR-008).
create or replace function public.inv_ao_menos_um_perfil() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo uuid;
begin
  -- NEW não existe em DELETE e OLD não existe em INSERT: a origem decide qual ler.
  if tg_table_name = 'profiles' then
    alvo := new.id;
  else
    alvo := old.user_id;
  end if;

  if not exists (select 1 from public.profiles where id = alvo) then
    return null;  -- usuário já não existe: nada a garantir
  end if;

  if array_length(public.perfis_de(alvo), 1) is null then
    raise exception 'INV-1: usuário % ficaria sem nenhum perfil', alvo
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger profiles_inv_ao_menos_um_perfil
  after insert on public.profiles
  deferrable initially deferred
  for each row execute function public.inv_ao_menos_um_perfil();

create constraint trigger user_roles_inv_ao_menos_um_perfil
  after delete on public.user_roles
  deferrable initially deferred
  for each row execute function public.inv_ao_menos_um_perfil();

-- INV-2 — perfil professor exige vínculo com registro de professor (FR-018).
create or replace function public.inv_vinculo_de_professor() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo uuid;
begin
  if tg_table_name = 'profiles' then
    alvo := new.id;
  else
    alvo := new.user_id;
  end if;

  if not exists (select 1 from public.profiles where id = alvo) then
    return null;
  end if;

  if 'professor'::public.perfil = any (public.perfis_de(alvo))
     and (select teacher_id from public.profiles where id = alvo) is null then
    raise exception 'INV-2: perfil professor exige vínculo com registro de professor'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger user_roles_inv_vinculo_de_professor
  after insert or update on public.user_roles
  deferrable initially deferred
  for each row execute function public.inv_vinculo_de_professor();

create constraint trigger profiles_inv_vinculo_de_professor
  after update of teacher_id on public.profiles
  deferrable initially deferred
  for each row execute function public.inv_vinculo_de_professor();

-- INV-3 — a visão ativa é sempre um dos perfis atribuídos (FR-010).
create or replace function public.inv_visao_ativa_valida() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_view is not null
     and not (new.active_view = any (public.perfis_de(new.id))) then
    raise exception 'INV-3: visão ativa % não está entre os perfis do usuário', new.active_view
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger profiles_inv_visao_ativa
  after insert or update of active_view on public.profiles
  deferrable initially deferred
  for each row execute function public.inv_visao_ativa_valida();

-- INV-4 — sempre existe ao menos um administrador ativo (FR-023).
create or replace function public.inv_ultimo_administrador() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.profiles p
      join public.user_roles r on r.user_id = p.id
     where r.role = 'administrador'
       and p.status = 'ativo'
  ) then
    raise exception 'INV-4: a última conta ativa com perfil administrador não pode ser bloqueada, desativada ou rebaixada'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger profiles_inv_ultimo_administrador
  after update of status on public.profiles
  deferrable initially deferred
  for each row execute function public.inv_ultimo_administrador();

create constraint trigger user_roles_inv_ultimo_administrador
  after delete on public.user_roles
  deferrable initially deferred
  for each row when (old.role = 'administrador')
  execute function public.inv_ultimo_administrador();
