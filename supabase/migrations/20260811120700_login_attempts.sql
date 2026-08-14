-- Migração 8/10 — `login_attempts` (data-model.md §2.5, FR-004, R-07).
-- Nenhum `grant` ao cliente: só a service role da Edge Function `auth-login` escreve e lê.
-- Guarda hash de IP com pepper de ambiente, nunca o IP (minimização).

create table public.login_attempts (
  id bigint generated always as identity primary key,
  email_normalized extensions.citext not null,
  ip_hash text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index idx_tentativas_por_conta
  on public.login_attempts (email_normalized, attempted_at desc)
  where not succeeded;

create index idx_tentativas_por_origem
  on public.login_attempts (ip_hash, attempted_at desc)
  where not succeeded;

revoke all on public.login_attempts from authenticated, anon;

-- Expurgo das linhas com mais de 24 h (R-07). Chamada pela Edge Function a cada execução;
-- em ambiente com pg_cron, agendável diariamente.
create or replace function public.expurgar_tentativas_antigas() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.login_attempts where attempted_at < now() - interval '24 hours';
$$;

revoke execute on function public.expurgar_tentativas_antigas() from public, anon, authenticated;
