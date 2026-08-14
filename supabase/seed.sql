-- Seed — SÓ desenvolvimento e teste (data-model.md §6.1). Não é migração.
--
-- Roda a cada `supabase db reset`. Cria os registros de `teachers` dos roteiros do quickstart e
-- duas contas de trabalho. As senhas nascem ALEATÓRIAS aqui: nenhum literal de credencial é
-- versionado (constituição, seção Ambiente e Segredos). Para usar as contas manualmente, rode
-- `npm run db:reset`, que define a senha a partir de `SENHA_ADMIN_SEED` do ambiente.
--
-- Em produção o primeiro administrador é criado por execução única de script com a service role,
-- fora do repositório.

-- Registros de professor exercitados pelos roteiros B e C.
insert into public.teachers (id, full_name, active) values
  ('11111111-1111-4111-8111-111111111111', 'Ana Ribeiro', true),
  ('22222222-2222-4222-8222-222222222222', 'Bruno Carvalho', true),
  ('33333333-3333-4333-8333-333333333333', 'Célia Nogueira', true)
on conflict (id) do nothing;

do $$
declare
  id_admin uuid := '44444444-4444-4444-8444-444444444444';
  id_professor uuid := '55555555-5555-4555-8555-555555555555';
  senha_provisoria text := encode(extensions.gen_random_bytes(18), 'base64');
begin
  -- Administrador de desenvolvimento: já passou pelo primeiro acesso (base dos testes da US1).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', id_admin, 'authenticated', 'authenticated',
    'admin@escola.local',
    extensions.crypt(senha_provisoria, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'Administração da Escola',
      'perfis', jsonb_build_array('administrador'),
      'first_access', false
    ),
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), id_admin,
    jsonb_build_object('sub', id_admin::text, 'email', 'admin@escola.local'),
    'email', id_admin::text, now(), now(), now()
  ) on conflict do nothing;

  -- Usuário em primeiro acesso, com vínculo de professor (base dos testes da US2).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', id_professor, 'authenticated', 'authenticated',
    'professor@escola.local',
    extensions.crypt(senha_provisoria, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'Ana Ribeiro',
      'perfis', jsonb_build_array('professor'),
      'teacher_id', '11111111-1111-4111-8111-111111111111',
      'first_access', true
    ),
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), id_professor,
    jsonb_build_object('sub', id_professor::text, 'email', 'professor@escola.local'),
    'email', id_professor::text, now(), now(), now()
  ) on conflict do nothing;

  update public.profiles set first_access = false where id = id_admin;
end;
$$;
