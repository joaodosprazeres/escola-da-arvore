-- Migração 7/10 — `audit_log` (data-model.md §2.4, FR-040, FR-041).
-- Imutabilidade por três camadas somadas: ausência de política, revogação de grant e trigger.

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id),
  target_user_id uuid not null references public.profiles (id),
  action public.acao_auditoria not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Histórico imutável de ações administrativas. old_value/new_value nunca contêm senha, hash ou token (FR-033).';

create index idx_audit_alvo on public.audit_log (target_user_id, created_at desc);
create index idx_audit_momento on public.audit_log (created_at desc);

-- Camada 3: vale inclusive para conexão privilegiada (service role).
create or replace function public.recusar_alteracao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'O histórico de auditoria é imutável (FR-041)'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_imutavel
  before update or delete on public.audit_log
  for each row execute function public.recusar_alteracao();

-- Camada 2: nem o cliente autenticado nem o anônimo escrevem, sob nenhuma política futura.
revoke insert, update, delete on public.audit_log from authenticated, anon;
