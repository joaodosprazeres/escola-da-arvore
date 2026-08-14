-- Migração 3/10 — `profiles` (data-model.md §2.1).
-- Espelha `auth.users` 1:1: identidade no GoTrue, domínio aqui.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  email extensions.citext not null unique,
  status public.situacao_usuario not null default 'ativo',
  first_access boolean not null default true,
  active_view public.perfil,
  teacher_id uuid unique references public.teachers (id),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.active_view is
  'Visão preferida: define painel e menu, nunca permissão. Nenhuma política RLS a consulta (FR-013).';

-- `updated_at` é do servidor, nunca do cliente (FR-007).
create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Espelho de auth.users: a conta nasce pela Admin API (Edge Function admin-users) e o gatilho
-- materializa, na MESMA transação, a linha de domínio e os papéis vindos do metadado. Isso é o que
-- permite às invariantes INV-1 e INV-2 serem verificadas no commit (migração 6).
create or replace function public.espelhar_usuario_de_auth() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papeis public.perfil[];
  papel public.perfil;
  autor uuid;
begin
  autor := nullif(new.raw_user_meta_data ->> 'created_by', '')::uuid;

  insert into public.profiles (id, full_name, email, teacher_id, created_by, first_access)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'teacher_id', '')::uuid,
    autor,
    coalesce((new.raw_user_meta_data ->> 'first_access')::boolean, true)
  )
  on conflict (id) do nothing;

  select coalesce(array_agg(valor::public.perfil), '{}'::public.perfil[])
    into papeis
    from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'perfis', '[]'::jsonb)) as valor;

  foreach papel in array papeis loop
    insert into public.user_roles (user_id, role, granted_by)
    values (new.id, papel, coalesce(autor, new.id))
    on conflict do nothing;
  end loop;

  if array_length(papeis, 1) is not null then
    update public.profiles
       set active_view = public.visao_padrao(papeis)
     where id = new.id;
  end if;

  return new;
end;
$$;

create trigger espelhar_usuario_criado
  after insert on auth.users
  for each row execute function public.espelhar_usuario_de_auth();

-- Troca de e-mail no GoTrue reflete no domínio; a unicidade citext continua valendo (FR-019).
create or replace function public.espelhar_email_de_auth() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger espelhar_email_alterado
  after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.espelhar_email_de_auth();
