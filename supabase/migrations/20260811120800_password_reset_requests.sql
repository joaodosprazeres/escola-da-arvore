-- Migração 9/10 — `password_reset_requests` (data-model.md §2.6, FR-031).
-- O token vive no GoTrue; esta tabela guarda o ciclo de vida do pedido.

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  consumed_at timestamptz,
  superseded_at timestamptz
);

-- Um único pedido vivo por usuário: o mais recente invalida os anteriores (FR-031).
create unique index idx_pedido_vivo_por_usuario
  on public.password_reset_requests (user_id)
  where consumed_at is null and superseded_at is null;

create index idx_pedido_por_usuario on public.password_reset_requests (user_id, requested_at desc);

revoke all on public.password_reset_requests from authenticated, anon;
