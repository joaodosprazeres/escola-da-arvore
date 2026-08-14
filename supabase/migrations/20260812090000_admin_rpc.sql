-- Migração 11 — funções de mutação administrativa usadas por `admin-users` (FR-017 a FR-024,
-- FR-040).
--
-- `definir_perfis`, `bloquear`, `desbloquear` e `desativar` não tocam `auth.users`: mutação de
-- domínio e linha de `audit_log` acontecem dentro da MESMA função `security definer`, portanto na
-- mesma transação (FR-040). `criar` e `reemitir_senha` exigem a Admin API do GoTrue (fora do
-- alcance de uma função SQL); a Edge Function os grava em duas chamadas sequenciais e documenta a
-- limitação prática — a única exceção ao contrato de atomicidade desta migração.
--
-- Todas revogadas de `anon`/`authenticated`: só a service role da Edge Function chama (privilégio
-- por default de `alter default privileges`, como as demais funções desta feature).

create or replace function public.admin_verificar_autor(p_autor uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.profiles p
      join public.user_roles r on r.user_id = p.id
     where p.id = p_autor
       and p.status = 'ativo'
       and r.role = 'administrador'
  ) then
    raise exception 'nao_autorizado';
  end if;
end;
$$;

create or replace function public.admin_usuario_json(p_usuario_id uuid) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email::text,
    'status', p.status,
    'first_access', p.first_access,
    'active_view', p.active_view,
    'teacher_id', p.teacher_id,
    'last_sign_in_at', p.last_sign_in_at,
    'created_at', p.created_at,
    'roles', coalesce(
      (select jsonb_agg(r.role order by r.role) from public.user_roles r where r.user_id = p.id),
      '[]'::jsonb
    )
  )
  from public.profiles p
  where p.id = p_usuario_id;
$$;

create or replace function public.admin_definir_perfis(
  p_usuario_id uuid,
  p_perfis public.perfil[],
  p_autor uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anteriores public.perfil[];
  v_perfil public.perfil;
begin
  perform public.admin_verificar_autor(p_autor);

  if not exists (select 1 from public.profiles where id = p_usuario_id) then
    raise exception 'indisponivel';
  end if;

  if array_length(p_perfis, 1) is null then
    raise exception 'perfil_obrigatorio';
  end if;

  if 'professor' = any (p_perfis)
     and (select teacher_id from public.profiles where id = p_usuario_id) is null then
    raise exception 'vinculo_professor_obrigatorio';
  end if;

  select public.perfis_de(p_usuario_id) into v_anteriores;

  delete from public.user_roles
   where user_id = p_usuario_id
     and role <> all (p_perfis);

  foreach v_perfil in array p_perfis loop
    insert into public.user_roles (user_id, role, granted_by)
    values (p_usuario_id, v_perfil, p_autor)
    on conflict do nothing;
  end loop;

  -- Fecha a lacuna do gatilho `reajustar_visao_ativa` (migração 4): quando TODOS os perfis são
  -- substituídos numa única chamada, o `delete` pode encontrar o conjunto restante vazio antes do
  -- `insert` acontecer e desistir do reajuste. Aqui, ao final, o conjunto já está completo.
  update public.profiles
     set active_view = public.visao_padrao(p_perfis)
   where id = p_usuario_id
     and (active_view is null or not (active_view = any (p_perfis)));

  foreach v_perfil in array p_perfis loop
    if not (v_perfil = any (v_anteriores)) then
      insert into public.audit_log (actor_id, target_user_id, action, new_value)
      values (p_autor, p_usuario_id, 'perfil_atribuido', to_jsonb(v_perfil::text));
    end if;
  end loop;

  foreach v_perfil in array v_anteriores loop
    if not (v_perfil = any (p_perfis)) then
      insert into public.audit_log (actor_id, target_user_id, action, old_value)
      values (p_autor, p_usuario_id, 'perfil_removido', to_jsonb(v_perfil::text));
    end if;
  end loop;

  return public.admin_usuario_json(p_usuario_id);
end;
$$;

create or replace function public.admin_mudar_situacao(
  p_usuario_id uuid,
  p_situacao public.situacao_usuario,
  p_acao public.acao_auditoria,
  p_autor uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anterior public.situacao_usuario;
begin
  perform public.admin_verificar_autor(p_autor);

  select status into v_anterior from public.profiles where id = p_usuario_id;
  if v_anterior is null then
    raise exception 'indisponivel';
  end if;

  update public.profiles set status = p_situacao where id = p_usuario_id;

  insert into public.audit_log (actor_id, target_user_id, action, old_value, new_value)
  values (p_autor, p_usuario_id, p_acao, to_jsonb(v_anterior::text), to_jsonb(p_situacao::text));

  return public.admin_usuario_json(p_usuario_id);
end;
$$;

-- Chamada depois que a Edge Function já trocou a senha via Admin API do GoTrue: só marca o
-- primeiro acesso e grava a auditoria, na mesma transação. Nunca recebe a senha em si (FR-033).
create or replace function public.admin_registrar_senha_reemitida(
  p_usuario_id uuid,
  p_autor uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_verificar_autor(p_autor);

  if not exists (select 1 from public.profiles where id = p_usuario_id) then
    raise exception 'indisponivel';
  end if;

  update public.profiles set first_access = true where id = p_usuario_id;

  insert into public.audit_log (actor_id, target_user_id, action)
  values (p_autor, p_usuario_id, 'senha_redefinida_admin');

  return public.admin_usuario_json(p_usuario_id);
end;
$$;

-- Chamada depois que a Edge Function já criou a conta via Admin API do GoTrue (o gatilho
-- `espelhar_usuario_de_auth` já materializou perfil e papéis): só grava a auditoria.
create or replace function public.admin_registrar_usuario_criado(
  p_usuario_id uuid,
  p_autor uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_verificar_autor(p_autor);

  insert into public.audit_log (actor_id, target_user_id, action, new_value)
  select p_autor, p_usuario_id, 'usuario_criado',
         to_jsonb(array_to_string(public.perfis_de(p_usuario_id), ', '));

  return public.admin_usuario_json(p_usuario_id);
end;
$$;

revoke all on function
  public.admin_verificar_autor(uuid),
  public.admin_usuario_json(uuid),
  public.admin_definir_perfis(uuid, public.perfil[], uuid),
  public.admin_mudar_situacao(uuid, public.situacao_usuario, public.acao_auditoria, uuid),
  public.admin_registrar_senha_reemitida(uuid, uuid),
  public.admin_registrar_usuario_criado(uuid, uuid)
from public, anon, authenticated;
